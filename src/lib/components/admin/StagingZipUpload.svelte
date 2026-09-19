<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { m } from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import {
		confirmZipImport,
		loadZipImportJob,
		loadZipImportReport,
		shouldPollZipImport,
		startZipImport,
		zipImportFileProblem,
		type ZipImportFileProblem,
		type ZipImportJob,
		type ZipImportState
	} from '$lib/staging/zipImport';
	import {
		canConfirmZipImport,
		type ZipImportDisposition,
		type ZipImportIssue,
		type ZipImportReport
	} from '$lib/staging/zipImportReport';

	interface Props {
		project: string;
		areaIri: string;
		folderIri: string;
		folderName: string;
		onclose: () => void;
		onbusychange: (busy: boolean) => void;
		onimported: () => void | Promise<void>;
		initialJob?: ZipImportJob | null;
		onjobchange?: (job: ZipImportJob) => void;
	}

	let {
		project,
		areaIri,
		folderIri,
		folderName,
		onclose,
		onbusychange,
		onimported,
		initialJob = null,
		onjobchange = () => undefined
	}: Props = $props();
	let file = $state<File | null>(null);
	let progress = $state(0);
	let uploading = $state(false);
	let error = $state<string | null>(null);
	let job = $state<ZipImportJob | null>(null);
	let report = $state<ZipImportReport | null>(null);
	let reportLoading = $state(false);
	let confirmationArmed = $state(false);
	let confirming = $state(false);
	let importNotified = false;
	let fileInput = $state<HTMLInputElement>();
	let controller: AbortController | null = null;
	let pollTimer: ReturnType<typeof setTimeout> | null = null;
	let pollGeneration = 0;
	let confirmationTarget = $state<HTMLDivElement>();

	onMount(() => {
		if (!initialJob) return;
		job = initialJob;
		importNotified = initialJob.state === 'IMPORTED';
		const importId = initialJob.importId;
		void loadZipImportJob(importId)
			.then(async (current) => {
				await acceptJob(current);
				if (shouldPollZipImport(current.state)) beginPolling(importId);
			})
			.catch((reason: unknown) => {
				error = reason instanceof Error ? reason.message : m.staging_zip_status_error();
			});
	});

	onDestroy(() => {
		pollGeneration += 1;
		if (pollTimer) clearTimeout(pollTimer);
		if (uploading) controller?.abort();
		onbusychange(false);
	});

	function problemMessage(problem: ZipImportFileProblem): string {
		return {
			name: m.staging_zip_invalid_name(),
			extension: m.staging_zip_invalid_extension(),
			empty: m.staging_zip_empty_file(),
			size: m.staging_zip_too_large()
		}[problem];
	}

	function stateLabel(state: ZipImportState): string {
		return {
			UPLOADING: m.staging_zip_state_uploading(),
			VALIDATING: m.staging_zip_state_validating(),
			READY: m.staging_zip_state_ready(),
			IMPORTING: m.staging_zip_state_importing(),
			IMPORTED: m.staging_zip_state_imported(),
			INVALID: m.staging_zip_state_invalid(),
			FAILED: m.staging_zip_state_failed(),
			CANCELLED: m.staging_zip_state_cancelled(),
			EXPIRED: m.staging_zip_state_expired()
		}[state];
	}

	function size(bytes: number): string {
		return `${new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 1 }).format(bytes / 1_000_000)} MB`;
	}

	function date(value: string | undefined): string {
		if (!value) return m.value_not_recorded();
		return new Intl.DateTimeFormat(getLocale(), {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(value));
	}

	function dispositionLabel(disposition: ZipImportDisposition): string {
		return {
			IMPORT: m.staging_zip_disposition_import(),
			IGNORE: m.staging_zip_disposition_ignore(),
			REJECT: m.staging_zip_disposition_reject()
		}[disposition];
	}

	function issueLabel(issue: ZipImportIssue): string {
		return issue.path
			? m.staging_zip_issue_at({ code: issue.code, path: issue.path })
			: m.staging_zip_issue({ code: issue.code });
	}

	function selectFile(event: Event): void {
		const selected = (event.currentTarget as HTMLInputElement).files?.[0] ?? null;
		file = selected;
		job = null;
		report = null;
		confirmationArmed = false;
		importNotified = false;
		progress = 0;
		error = null;
		if (!selected) return;
		const problem = zipImportFileProblem(selected);
		if (problem) error = problemMessage(problem);
	}

	async function loadReport(importId: string): Promise<void> {
		if (reportLoading) return;
		reportLoading = true;
		try {
			report = await loadZipImportReport(importId);
			error = null;
		} catch (reason: unknown) {
			error = reason instanceof Error ? reason.message : m.staging_zip_report_error();
		} finally {
			reportLoading = false;
		}
	}

	function retryReport(): void {
		if (job) void loadReport(job.importId);
	}

	async function acceptJob(current: ZipImportJob): Promise<void> {
		job = current;
		onjobchange(current);
		if (current.reportAvailable && (!report || report.importId !== current.importId)) {
			await loadReport(current.importId);
		}
		if (current.state === 'IMPORTED' && !importNotified) {
			importNotified = true;
			await onimported();
		}
	}

	async function poll(importId: string, generation: number): Promise<void> {
		try {
			const current = await loadZipImportJob(importId);
			if (generation !== pollGeneration) return;
			error = null;
			await acceptJob(current);
			if (shouldPollZipImport(current.state)) {
				pollTimer = setTimeout(() => void poll(importId, generation), 2000);
			}
		} catch (reason: unknown) {
			if (generation === pollGeneration) {
				error = reason instanceof Error ? reason.message : m.staging_zip_status_error();
			}
		}
	}

	function beginPolling(importId: string): void {
		pollGeneration += 1;
		if (pollTimer) clearTimeout(pollTimer);
		void poll(importId, pollGeneration);
	}

	async function submit(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		if (!file || uploading || zipImportFileProblem(file)) return;
		uploading = true;
		onbusychange(true);
		progress = 0;
		error = null;
		job = null;
		report = null;
		confirmationArmed = false;
		importNotified = false;
		controller = new AbortController();
		try {
			const result = await startZipImport({
				project,
				stagingAreaIri: areaIri,
				targetRootFolderIri: folderIri,
				file,
				signal: controller.signal,
				onProgress: (value) => (progress = value)
			});
			job = result.job;
			beginPolling(result.job.importId);
		} catch (reason: unknown) {
			if (reason instanceof DOMException && reason.name === 'AbortError') {
				error = m.staging_zip_cancelled();
			} else {
				error = reason instanceof Error ? reason.message : m.staging_zip_error();
			}
		} finally {
			uploading = false;
			onbusychange(false);
			controller = null;
		}
	}

	async function confirm(): Promise<void> {
		const current = job;
		if (!current || confirming || !canConfirmZipImport(current, report)) return;
		confirming = true;
		onbusychange(true);
		error = null;
		if (pollTimer) clearTimeout(pollTimer);
		try {
			await acceptJob(await confirmZipImport(current));
			confirmationArmed = false;
			beginPolling(current.importId);
		} catch (reason: unknown) {
			confirmationArmed = false;
			try {
				await acceptJob(await loadZipImportJob(current.importId));
			} catch {
				// Preserve the actionable confirmation error if refresh also fails.
			}
			error = reason instanceof Error ? reason.message : m.staging_zip_confirm_error();
		} finally {
			confirming = false;
			onbusychange(false);
		}
	}

	function armConfirmation(): void {
		confirmationArmed = true;
		queueMicrotask(() =>
			confirmationTarget?.scrollIntoView({ behavior: 'smooth', block: 'center' })
		);
	}

	function close(): void {
		if (uploading || confirming) return;
		onclose();
	}
</script>

<form class="zip-panel" onsubmit={submit}>
	<div class="zip-intro">
		<p>{m.staging_zip_kicker()}</p>
		<strong>{m.staging_zip_to({ folder: folderName })}</strong>
		<span>{m.staging_zip_hint()}</span>
	</div>
	{#if !job}
		<label>
			<span>{m.staging_zip_file()}</span>
			<input
				bind:this={fileInput}
				type="file"
				accept=".zip,application/zip"
				disabled={uploading}
				onchange={selectFile}
			/>
		</label>
	{/if}
	<div class="zip-actions">
		<button class="secondary" type="button" onclick={close} disabled={uploading || confirming}
			>{m.staging_zip_close()}</button
		>
		{#if !job}<button class="primary" type="submit" disabled={!file || Boolean(error) || uploading}
				>{uploading ? m.staging_zip_uploading() : m.staging_zip_start()}</button
			>{/if}
	</div>
	{#if file}<p class="selected-file">
			<strong>{file.name}</strong><span>{size(file.size)}</span>
		</p>{/if}
	{#if uploading || progress > 0}
		<div
			class="zip-progress"
			role="status"
			aria-label={m.staging_zip_progress({ percent: progress })}
		>
			<progress max="100" value={progress}></progress>
			<span>{m.staging_zip_progress({ percent: progress })}</span>
		</div>
	{/if}
	{#if error}<p class="zip-message error" role="alert">{error}</p>{/if}
	{#if job}
		<div class="zip-job" role="status">
			<div>
				<span>{m.staging_zip_job()}</span>
				<code>{job.importId}</code>
			</div>
			<strong>{stateLabel(job.state)}</strong>
			{#if shouldPollZipImport(job.state)}<span class="pulse" aria-hidden="true"></span>{/if}
		</div>
		{#if reportLoading}<p class="zip-message" role="status">
				{m.staging_zip_report_loading()}
			</p>{:else if job.reportAvailable && !report}<button
				class="report-retry"
				type="button"
				onclick={retryReport}>{m.staging_zip_report_retry()}</button
			>{/if}
		{#if job.state === 'IMPORTED'}<p class="zip-message success">
				{m.staging_zip_imported_success({ folder: folderName })}
			</p>{:else if job.state === 'INVALID' || job.state === 'FAILED'}<p class="zip-message error">
				{m.staging_zip_terminal_error({ state: stateLabel(job.state) })}
			</p>{/if}
	{/if}
	{#if report}
		<section class="report" aria-labelledby="zip-report-title">
			<div class="report-heading">
				<div>
					<span>{m.staging_zip_report_kicker()}</span>
					<h3 id="zip-report-title">{m.staging_zip_report_title()}</h3>
				</div>
				<strong class:invalid={report.status !== 'READY'}>{stateLabel(report.status)}</strong>
			</div>
			{#if report.status === 'READY' && job?.state === 'READY'}
				<p class="report-ready">
					{m.staging_zip_report_ready({ expiry: date(report.expiresAt) })}
				</p>
			{/if}
			{#if job?.state === 'READY' && canConfirmZipImport(job, report)}
				<div class="confirmation-target" bind:this={confirmationTarget}>
					{#if confirmationArmed}
						<div class="confirmation">
							<strong>{m.staging_zip_confirm_title()}</strong>
							<p>{m.staging_zip_confirm_text({ folder: folderName })}</p>
							<div>
								<button class="primary" type="button" onclick={confirm} disabled={confirming}
									>{confirming ? m.staging_zip_confirming() : m.staging_zip_confirm_now()}</button
								>
								<button
									class="secondary"
									type="button"
									disabled={confirming}
									onclick={() => (confirmationArmed = false)}>{m.staging_zip_confirm_back()}</button
								>
							</div>
						</div>
					{:else}
						<button class="confirm-trigger" type="button" onclick={armConfirmation}
							>{m.staging_zip_confirm_open()}</button
						>
					{/if}
				</div>
			{/if}
			<div class="report-summary">
				<div>
					<span>{m.staging_zip_report_files()}</span><strong>{report.summary.files}</strong>
				</div>
				<div>
					<span>{m.staging_zip_report_directories()}</span><strong
						>{report.summary.directories}</strong
					>
				</div>
				<div>
					<span>{m.staging_zip_report_importable()}</span><strong
						>{report.summary.importableFiles}</strong
					>
				</div>
				<div>
					<span>{m.staging_zip_report_warnings()}</span><strong
						>{report.summary.warningCount}</strong
					>
				</div>
				<div>
					<span>{m.staging_zip_report_errors()}</span><strong>{report.summary.errorCount}</strong>
				</div>
			</div>
			{#if report.issues.length}
				<ul class="report-issues">
					{#each report.issues as issue, index (`${issue.code}-${index}`)}
						<li class:error={issue.severity === 'ERROR'}>
							<strong>{issueLabel(issue)}</strong><code>{issue.code}</code>
						</li>
					{/each}
				</ul>
			{/if}
			<div class="report-entries">
				<div class="report-entries-heading">
					<strong>{m.staging_zip_report_structure()}</strong><span
						>{m.staging_zip_report_entries({ count: report.entries.length })}</span
					>
				</div>
				{#each report.entries as entry (entry.entryIndex)}
					<div
						class="report-entry"
						class:rejected={entry.disposition === 'REJECT'}
						class:ignored={entry.disposition === 'IGNORE'}
						style={`--entry-depth:${Math.max(0, entry.normalizedPath.split('/').filter(Boolean).length - 1)}`}
					>
						<span class="entry-icon" aria-hidden="true"
							>{entry.entryType === 'directory' ? '▰' : '▤'}</span
						>
						<div>
							<strong>{entry.normalizedPath}</strong><span
								>{entry.detectedMimeType ?? m.staging_zip_entry_directory()}</span
							>
						</div>
						<small>{dispositionLabel(entry.disposition)}</small>
						{#if entry.issues.length}<ul>
								{#each entry.issues as issue, index (`${issue.code}-${index}`)}<li>
										{issueLabel(issue)} <code>{issue.code}</code>
									</li>{/each}
							</ul>{/if}
					</div>
				{/each}
			</div>
			<details>
				<summary>{m.staging_zip_report_evidence()}</summary>
				<dl>
					<div>
						<dt>{m.staging_zip_report_sip_checksum()}</dt>
						<dd>{report.sip.sha256}</dd>
					</div>
					<div>
						<dt>{m.staging_zip_report_manifest_checksum()}</dt>
						<dd>{report.manifestSha256 ?? m.value_not_recorded()}</dd>
					</div>
				</dl>
			</details>
			{#if !confirmationArmed}
				<div class="confirmation-footer">
					<button
						class="confirm-trigger confirm-trigger-bottom"
						type="button"
						disabled={job?.state !== 'READY' || report.status !== 'READY'}
						onclick={armConfirmation}>{m.staging_zip_confirm_open()}</button
					>
				</div>
			{/if}
		</section>
	{/if}
</form>

<style>
	.zip-panel {
		display: grid;
		grid-template-columns: minmax(14rem, 1fr) minmax(14rem, 1fr) auto;
		align-items: end;
		gap: 1rem;
		padding: 1rem 1.25rem;
		background: #f2edf7;
		border-bottom: 1px solid var(--line);
	}
	.zip-intro p {
		margin: 0 0 0.3rem;
		color: var(--copper-dark);
		font-size: 0.64rem;
		font-weight: 760;
		letter-spacing: 0.11em;
		text-transform: uppercase;
	}
	.zip-intro strong,
	.zip-intro span,
	label > span,
	label {
		display: block;
	}
	.zip-intro span,
	label > span {
		margin-top: 0.25rem;
		color: var(--muted);
		font-size: 0.72rem;
	}
	label input {
		max-width: 100%;
		margin-top: 0.4rem;
	}
	.zip-actions {
		display: flex;
		gap: 0.45rem;
	}
	.zip-actions button {
		padding: 0.5rem 0.7rem;
		border-radius: 0.35rem;
		font-size: 0.7rem;
		font-weight: 700;
		cursor: pointer;
	}
	.zip-actions .primary {
		color: white;
		background: var(--copper);
		border: 1px solid var(--copper);
	}
	.zip-actions .secondary {
		color: var(--teal-dark);
		background: white;
		border: 1px solid var(--teal);
	}
	.zip-actions button:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.selected-file,
	.zip-progress,
	.zip-message,
	.zip-job,
	.report,
	.report-retry {
		grid-column: 1 / -1;
		margin: 0;
	}
	.selected-file {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.65rem 0.75rem;
		background: white;
		border: 1px solid #ded5e8;
		font-size: 0.76rem;
	}
	.selected-file span {
		color: var(--muted);
	}
	.zip-progress {
		display: grid;
		grid-template-columns: minmax(10rem, 1fr) auto;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.72rem;
	}
	.zip-progress progress {
		width: 100%;
	}
	.zip-message {
		padding: 0.7rem 0.75rem;
		font-size: 0.76rem;
	}
	.zip-message.error {
		color: #9b382f;
		background: #fff0ed;
	}
	.zip-message.success {
		color: var(--teal-dark);
		background: #edf5f2;
	}
	.report-retry {
		justify-self: start;
		padding: 0.5rem 0.7rem;
		color: var(--teal-dark);
		background: white;
		border: 1px solid var(--teal);
		border-radius: 0.35rem;
		font-weight: 700;
		cursor: pointer;
	}
	.zip-job {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto auto;
		align-items: center;
		gap: 0.8rem;
		padding: 0.75rem;
		background: white;
		border: 1px solid #ded5e8;
	}
	.zip-job div {
		display: grid;
		gap: 0.15rem;
		min-width: 0;
	}
	.zip-job span,
	.zip-job code {
		color: var(--muted);
		font-size: 0.68rem;
	}
	.pulse {
		width: 0.55rem;
		height: 0.55rem;
		background: var(--teal);
		border-radius: 50%;
		animation: pulse 1.3s ease-in-out infinite alternate;
	}
	.report {
		display: grid;
		gap: 1rem;
		padding: 1rem;
		background: white;
		border: 1px solid #ded5e8;
	}
	.report-heading,
	.report-entries-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}
	.report-heading span {
		color: var(--copper-dark);
		font-size: 0.64rem;
		font-weight: 760;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}
	.report-heading h3 {
		margin: 0.15rem 0 0;
		font-family: var(--font-display);
		font-size: 1.4rem;
	}
	.report-heading > strong {
		padding: 0.35rem 0.55rem;
		color: var(--teal-dark);
		background: #edf5f2;
		font-size: 0.72rem;
	}
	.report-heading > strong.invalid {
		color: #9b382f;
		background: #fff0ed;
	}
	.report-ready {
		margin: 0;
		padding: 0.7rem;
		color: var(--teal-dark);
		background: #edf5f2;
		font-size: 0.76rem;
	}
	.report-summary {
		display: grid;
		grid-template-columns: repeat(5, minmax(5.5rem, 1fr));
		gap: 0.5rem;
	}
	.report-summary div {
		display: grid;
		gap: 0.2rem;
		padding: 0.65rem;
		background: var(--canvas);
	}
	.report-summary span {
		color: var(--muted);
		font-size: 0.66rem;
	}
	.report-summary strong {
		font-family: var(--font-display);
		font-size: 1.25rem;
	}
	.report-issues,
	.report-entry ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.report-issues li {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.55rem 0.65rem;
		color: #8a5b16;
		background: #fff8e8;
		font-size: 0.72rem;
	}
	.report-issues li.error {
		color: #9b382f;
		background: #fff0ed;
	}
	.report-entries {
		border: 1px solid var(--line);
	}
	.report-entries-heading {
		padding: 0.65rem 0.75rem;
		background: var(--canvas);
		font-size: 0.72rem;
	}
	.report-entries-heading span {
		color: var(--muted);
	}
	.report-entry {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.6rem;
		padding: 0.55rem 0.7rem 0.55rem calc(0.7rem + var(--entry-depth) * 1rem);
		border-top: 1px solid var(--line);
	}
	.report-entry.ignored {
		background: var(--canvas);
	}
	.report-entry.rejected {
		background: #fff0ed;
	}
	.report-entry > div {
		display: grid;
		min-width: 0;
	}
	.report-entry strong {
		overflow-wrap: anywhere;
		font-size: 0.74rem;
	}
	.report-entry span,
	.report-entry small,
	.report-entry li {
		color: var(--muted);
		font-size: 0.66rem;
	}
	.report-entry > ul {
		grid-column: 2 / -1;
	}
	.report details {
		font-size: 0.7rem;
	}
	.report details dl {
		display: grid;
		gap: 0.5rem;
		margin-bottom: 0;
	}
	.report details dd {
		margin: 0.1rem 0 0;
		overflow-wrap: anywhere;
		font-family: monospace;
	}
	.confirm-trigger,
	.confirmation button {
		justify-self: start;
		padding: 0.55rem 0.75rem;
		border-radius: 0.35rem;
		font-size: 0.72rem;
		font-weight: 750;
		cursor: pointer;
	}
	.confirmation-target {
		display: grid;
	}
	.confirm-trigger-bottom {
		margin-top: 0.25rem;
	}
	.confirmation-footer {
		display: flex;
		flex-wrap: wrap;
		gap: 0.65rem;
		align-items: center;
	}
	.confirm-trigger,
	.confirmation .primary {
		color: white;
		background: var(--teal-dark);
		border: 1px solid var(--teal-dark);
	}
	.confirmation {
		display: grid;
		gap: 0.6rem;
		padding: 0.85rem;
		background: #edf5f2;
		border: 1px solid var(--teal);
	}
	.confirmation p {
		margin: 0;
		font-size: 0.74rem;
	}
	.confirmation > div {
		display: flex;
		gap: 0.5rem;
	}
	.confirmation .secondary {
		color: var(--teal-dark);
		background: white;
		border: 1px solid var(--teal);
	}
	.confirmation button:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.confirm-trigger:disabled {
		opacity: 0.5;
		cursor: default;
	}
	@keyframes pulse {
		to {
			opacity: 0.3;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.pulse {
			animation: none;
		}
	}
	@media (max-width: 52rem) {
		.zip-panel {
			grid-template-columns: 1fr;
		}
		.report-summary {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
