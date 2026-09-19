<script lang="ts">
	import CataloguePlacement from './CataloguePlacement.svelte';
	import { m } from '$lib/paraglide/messages';
	import CompactMediaPreview from '$lib/components/media/CompactMediaPreview.svelte';
	import { getLocale, locales } from '$lib/paraglide/runtime';
	import {
		catalogueStagingMediaBatch,
		suggestedCatalogueTitle,
		type BatchCatalogueItem,
		type BatchCatalogueReport
	} from '$lib/staging/batchCatalogue';
	import {
		loadCatalogueRelationOptions,
		loadCatalogueTargets,
		type CatalogueResult,
		type CatalogueTarget
	} from '$lib/staging/catalogue';
	import { localizedText } from '$lib/resources/model';
	import type { OldapResourceSearchHit } from '$lib/resources/types';
	import type { StagingMediaObjectNode } from '$lib/staging/types';

	interface Props {
		project: string;
		media: StagingMediaObjectNode[];
		onitemcomplete: (
			media: StagingMediaObjectNode,
			result: CatalogueResult,
			target: CatalogueTarget
		) => void;
		onfinished: (report: BatchCatalogueReport, target: CatalogueTarget) => void;
		onclose: () => void;
		onbusychange: (busy: boolean) => void;
	}

	type Stage = 'edit' | 'preview' | 'running' | 'report';

	let { project, media, onitemcomplete, onfinished, onclose, onbusychange }: Props = $props();
	let dialog = $state<HTMLDialogElement>();
	let archiveUnitIri = $state('');
	let placementReady = $state(false);
	let mixed = $derived(media.some((item) => Boolean(item.repositoryEntry)));
	let targets = $state<CatalogueTarget[]>([]);
	let selectedTargetIri = $state('');
	let language = $state(getLocale().toLowerCase());
	let titles = $state<Record<string, string>>({});
	let commonDescription = $state('');
	let relationOptions = $state<Record<string, OldapResourceSearchHit[]>>({});
	let selectedRelations = $state<Record<string, string>>({});
	let loading = $state(true);
	let relationsLoading = $state(false);
	let error = $state<string | null>(null);
	let stage = $state<Stage>('edit');
	let completed = $state(0);
	let report = $state<BatchCatalogueReport | null>(null);
	let relationGeneration = 0;
	let selectedTarget = $derived(targets.find(({ iri }) => iri === selectedTargetIri) ?? null);
	let descriptionField = $derived(
		selectedTarget?.fields.find(({ iri }) => iri === 'schema:description') ?? null
	);
	let canPreview = $derived(
		Boolean(
			selectedTarget &&
			!loading &&
			(!mixed || placementReady) &&
			!relationsLoading &&
			!error &&
			media.every((item) => Boolean(titles[item.iri]?.trim())) &&
			(!descriptionField?.required || Boolean(commonDescription.trim()))
		)
	);

	$effect(() => {
		if (dialog && !dialog.open) dialog.showModal();
	});

	$effect(() => {
		const missing = media.filter((item) => !(item.iri in titles));
		if (!missing.length) return;
		titles = {
			...titles,
			...Object.fromEntries(missing.map((item) => [item.iri, suggestedCatalogueTitle(item)]))
		};
	});

	$effect(() => {
		const requestedProject = project;
		let cancelled = false;
		loading = true;
		error = null;
		void loadCatalogueTargets(requestedProject, getLocale())
			.then((result) => {
				if (cancelled || requestedProject !== project) return;
				targets = result;
				selectedTargetIri = result.length === 1 ? result[0].iri : '';
			})
			.catch((reason: unknown) => {
				if (!cancelled)
					error = reason instanceof Error ? reason.message : m.staging_catalogue_error();
			})
			.finally(() => {
				if (!cancelled) loading = false;
			});
		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		const target = selectedTarget;
		const generation = ++relationGeneration;
		relationOptions = {};
		selectedRelations = {};
		if (!target?.relations.length) {
			relationsLoading = false;
			return;
		}
		relationsLoading = true;
		error = null;
		void Promise.all(
			target.relations.map(
				async (relation) =>
					[relation.iri, await loadCatalogueRelationOptions(project, relation.toClass)] as const
			)
		)
			.then((entries) => {
				if (generation !== relationGeneration) return;
				relationOptions = Object.fromEntries(
					entries.map(([iri, options]) => [
						iri,
						options.sort((left, right) =>
							relationOptionLabel(left).localeCompare(relationOptionLabel(right), getLocale())
						)
					])
				);
			})
			.catch((reason: unknown) => {
				if (generation === relationGeneration) {
					error = reason instanceof Error ? reason.message : m.staging_batch_relations_error();
				}
			})
			.finally(() => {
				if (generation === relationGeneration) relationsLoading = false;
			});
	});

	function close(): void {
		if (stage === 'running') return;
		dialog?.close();
		onclose();
	}

	function setTitle(iri: string, value: string): void {
		titles = { ...titles, [iri]: value };
		error = null;
	}

	function relationOptionLabel(option: OldapResourceSearchHit): string {
		return localizedText(option['schema:name'], getLocale()) ?? option.iri;
	}

	function selectedRelationLabel(relationIri: string): string {
		const selected = selectedRelations[relationIri];
		if (!selected) return m.staging_batch_relation_not_set();
		const option = relationOptions[relationIri]?.find(({ iri }) => iri === selected);
		return option ? relationOptionLabel(option) : selected;
	}

	function setRelation(iri: string, value: string): void {
		selectedRelations = { ...selectedRelations, [iri]: value };
		error = null;
	}

	function items(target: CatalogueTarget): BatchCatalogueItem[] {
		const relations = Object.fromEntries(
			target.relations
				.map((relation) => [relation.iri, selectedRelations[relation.iri]] as const)
				.filter((entry): entry is readonly [string, string] => Boolean(entry[1]))
				.map(([iri, value]) => [iri, [value]])
		);
		return media.map((item) => {
			const values: Record<string, string> = { 'schema:name': titles[item.iri]?.trim() ?? '' };
			if (target.fields.some(({ iri }) => iri === 'schema:description')) {
				values['schema:description'] = commonDescription.trim();
			}
			return { media: item, values, relations, ...(archiveUnitIri ? { archiveUnitIri } : {}) };
		});
	}

	function showPreview(event: SubmitEvent): void {
		event.preventDefault();
		if (!canPreview) return;
		stage = 'preview';
	}

	async function applyBatch(): Promise<void> {
		const target = selectedTarget;
		if (!target || !canPreview || stage !== 'preview') return;
		stage = 'running';
		completed = 0;
		error = null;
		onbusychange(true);
		try {
			const result = await catalogueStagingMediaBatch(
				project,
				target,
				language,
				items(target),
				(value) => (completed = value)
			);
			report = result;
			for (const outcome of result.outcomes) {
				if (outcome.status === 'catalogued') {
					onitemcomplete(outcome.item.media, outcome.result, target);
				}
			}
			onfinished(result, target);
			stage = 'report';
		} catch (reason: unknown) {
			error = reason instanceof Error ? reason.message : m.staging_catalogue_error();
			stage = 'preview';
		} finally {
			onbusychange(false);
		}
	}
</script>

<dialog
	bind:this={dialog}
	aria-labelledby="batch-catalogue-title"
	oncancel={(event) => {
		event.preventDefault();
		close();
	}}
>
	<header>
		<div>
			<p>{m.staging_batch_kicker()}</p>
			<h2 id="batch-catalogue-title">{m.staging_batch_title()}</h2>
			<span>{m.staging_selection_count({ count: media.length })}</span>
		</div>
		<button
			type="button"
			onclick={close}
			disabled={stage === 'running'}
			aria-label={m.staging_review_close()}>×</button
		>
	</header>

	{#if stage === 'edit'}
		<form onsubmit={showPreview}>
			{#if mixed}<CataloguePlacement
					{project}
					{media}
					bind:value={archiveUnitIri}
					bind:ready={placementReady}
				/>{/if}
			<p class="intro">{m.staging_batch_intro()}</p>
			{#if loading}
				<p class="state" role="status">{m.staging_catalogue_loading()}</p>
			{:else if targets.length === 0}
				<p class="state">{m.staging_catalogue_no_targets()}</p>
			{:else}
				<div class="settings">
					<label>
						<span>{m.staging_catalogue_target()}</span>
						<select bind:value={selectedTargetIri} required>
							{#if targets.length > 1}<option value="">{m.staging_catalogue_target_choose()}</option
								>{/if}
							{#each targets as target (target.iri)}<option value={target.iri}
									>{target.label}</option
								>{/each}
						</select>
					</label>
					<label>
						<span>{m.staging_catalogue_language()}</span>
						<select bind:value={language} required>
							{#each locales as locale (locale)}<option value={locale}
									>{locale.toUpperCase()}</option
								>{/each}
						</select>
					</label>
				</div>
				{#if descriptionField}
					<label class="common-description">
						<span>{m.staging_batch_description()}{descriptionField.required ? ' *' : ''}</span>
						<textarea rows="3" bind:value={commonDescription} required={descriptionField.required}
						></textarea>
						<small>{m.staging_batch_description_hint()}</small>
					</label>
				{/if}
				{#if selectedTarget?.relations.length}
					<fieldset class="common-relations">
						<legend>{m.staging_batch_relations()}</legend>
						<p>{m.staging_batch_relations_hint()}</p>
						{#if relationsLoading}
							<span class="relation-state" role="status">{m.staging_batch_relations_loading()}</span
							>
						{:else}
							<div>
								{#each selectedTarget.relations as relation (relation.iri)}
									<label>
										<span>{relation.label}</span>
										<select
											value={selectedRelations[relation.iri] ?? ''}
											onchange={(event) => setRelation(relation.iri, event.currentTarget.value)}
										>
											<option value="">{m.staging_batch_relation_not_set()}</option>
											{#each relationOptions[relation.iri] ?? [] as option (option.iri)}
												<option value={option.iri}>{relationOptionLabel(option)}</option>
											{/each}
										</select>
										{#if relation.description}<small>{relation.description}</small>{/if}
									</label>
								{/each}
							</div>
						{/if}
					</fieldset>
				{/if}
				<div class="items">
					{#each media as item (item.iri)}
						<div class="batch-item">
							{#if item.mediaDelivery}
								<CompactMediaPreview
									media={item.mediaDelivery}
									title={item.originalName ?? item.iri}
								/>
							{:else}
								<span class="item-thumbnail fallback" aria-hidden="true">▧</span>
							{/if}
							<div class="item-fields">
								<strong>{item.originalName ?? item.iri}</strong>
								<label>
									<span>{m.staging_batch_item_title()}</span>
									<input
										type="text"
										value={titles[item.iri] ?? ''}
										required
										oninput={(event) => setTitle(item.iri, event.currentTarget.value)}
									/>
								</label>
							</div>
						</div>
					{/each}
				</div>
			{/if}
			{#if error}<p class="error" role="alert">{error}</p>{/if}
			<footer>
				<button class="secondary" type="button" onclick={close}
					>{m.staging_catalogue_cancel()}</button
				>
				<button class="primary" type="submit" disabled={!canPreview}
					>{m.staging_batch_preview()}</button
				>
			</footer>
		</form>
	{:else if stage === 'preview' || stage === 'running'}
		<section class="preview">
			{#if mixed}<p>{m.archive_selected()}: {archiveUnitIri || m.archive_none()}</p>{/if}
			<p class="intro">{m.staging_batch_preview_intro()}</p>
			<dl>
				<div>
					<dt>{m.staging_catalogue_target()}</dt>
					<dd>{selectedTarget?.label}</dd>
				</div>
				<div>
					<dt>{m.staging_catalogue_language()}</dt>
					<dd>{language.toUpperCase()}</dd>
				</div>
				{#if descriptionField}
					<div>
						<dt>{m.staging_batch_description()}</dt>
						<dd>{commonDescription || '—'}</dd>
					</div>
				{/if}
			</dl>
			{#if selectedTarget?.relations.length}
				<div class="relation-preview">
					<strong>{m.staging_batch_relations()}</strong>
					<ul>
						{#each selectedTarget.relations as relation (relation.iri)}
							<li>
								<span>{relation.label}</span><strong>{selectedRelationLabel(relation.iri)}</strong>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
			<ul>
				{#each media as item (item.iri)}
					<li><span>{item.originalName ?? item.iri}</span><strong>{titles[item.iri]}</strong></li>
				{/each}
			</ul>
			{#if stage === 'running'}
				<p class="progress" role="status">
					{m.staging_batch_progress({ completed, total: media.length })}
				</p>
			{/if}
			{#if error}<p class="error" role="alert">{error}</p>{/if}
			<footer>
				<button
					class="secondary"
					type="button"
					onclick={() => (stage = 'edit')}
					disabled={stage === 'running'}>{m.staging_batch_back()}</button
				>
				<button class="primary" type="button" onclick={applyBatch} disabled={stage === 'running'}
					>{stage === 'running' ? m.staging_cataloguing() : m.staging_batch_apply()}</button
				>
			</footer>
		</section>
	{:else if report}
		<section class="report">
			<h3>{report.failed ? m.staging_batch_report_partial() : m.staging_batch_report_success()}</h3>
			<p>{m.staging_batch_report_summary({ completed: report.completed, total: report.total })}</p>
			<ul>
				{#each report.outcomes as outcome (outcome.item.media.iri)}
					<li class:failed={outcome.status === 'failed'}>
						<strong>{outcome.item.media.originalName ?? outcome.item.media.iri}</strong>
						<span>
							{outcome.status === 'catalogued'
								? m.staging_batch_status_catalogued()
								: outcome.status === 'failed'
									? m.staging_batch_status_failed({ error: outcome.error })
									: m.staging_batch_status_not_started()}
						</span>
					</li>
				{/each}
			</ul>
			<footer>
				<button class="primary" type="button" onclick={close}>{m.staging_review_close()}</button>
			</footer>
		</section>
	{/if}
</dialog>

<style>
	dialog {
		position: fixed;
		inset: 50% auto auto 50%;
		z-index: 40;
		width: min(58rem, calc(100vw - 2rem));
		max-height: calc(100vh - 2rem);
		margin: 0;
		padding: 0;
		transform: translate(-50%, -50%);
		overflow: auto;
		color: var(--navy);
		background: var(--paper);
		border: 1px solid var(--line);
		border-radius: 0.8rem;
		box-shadow: 0 1.5rem 5rem rgb(9 31 52 / 28%);
	}
	dialog::backdrop {
		background: rgb(9 31 52 / 48%);
	}
	header {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid var(--line);
	}
	header p {
		margin: 0 0 0.25rem;
		color: var(--copper-dark);
		font-size: 0.64rem;
		font-weight: 760;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}
	header h2 {
		margin: 0;
		font:
			500 1.7rem/1.2 Georgia,
			'Times New Roman',
			serif;
	}
	header span {
		display: block;
		margin-top: 0.3rem;
		color: var(--muted);
		font-size: 0.75rem;
	}
	header button {
		width: 2.2rem;
		height: 2.2rem;
		color: var(--navy);
		background: transparent;
		border: 1px solid var(--line);
		border-radius: 50%;
		font-size: 1.2rem;
	}
	form,
	.preview,
	.report {
		padding: 1.25rem 1.5rem;
	}
	.intro,
	.state {
		margin: 0 0 1rem;
		color: var(--muted);
		line-height: 1.5;
	}
	.settings {
		display: grid;
		grid-template-columns: minmax(14rem, 1fr) minmax(7rem, 0.35fr);
		gap: 0.8rem;
	}
	label,
	label > span,
	label > small {
		display: block;
	}
	label > span {
		margin-bottom: 0.3rem;
		font-size: 0.72rem;
		font-weight: 700;
	}
	label > small {
		margin-top: 0.25rem;
		color: var(--muted);
	}
	input,
	select,
	textarea {
		box-sizing: border-box;
		width: 100%;
		padding: 0.6rem 0.65rem;
		color: var(--navy);
		background: white;
		border: 1px solid var(--line);
		border-radius: 0.35rem;
		font: inherit;
	}
	textarea {
		resize: vertical;
	}
	.common-description {
		margin-top: 0.9rem;
	}
	.common-relations {
		margin: 1rem 0 0;
		padding: 0.85rem;
		border: 1px solid var(--line);
		border-radius: 0.4rem;
	}
	.common-relations legend {
		padding: 0 0.35rem;
		font-weight: 700;
	}
	.common-relations > p,
	.relation-state {
		margin: 0 0 0.75rem;
		color: var(--muted);
		font-size: 0.74rem;
	}
	.common-relations > div {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.8rem;
	}
	.items {
		display: grid;
		gap: 0.65rem;
		margin-top: 1rem;
	}
	.batch-item {
		display: grid;
		grid-template-columns: 5rem minmax(0, 1fr);
		gap: 0.8rem;
		align-items: center;
		padding: 0.7rem;
		background: #f8f5ef;
		border: 1px solid var(--line);
		border-radius: 0.4rem;
	}
	.item-thumbnail {
		display: grid;
		width: 5rem;
		height: 5rem;
		padding: 0;
		place-items: center;
		overflow: hidden;
		color: var(--teal-dark);
		background: #e8ebe7;
		border: 1px solid #d8ddd8;
		border-radius: 0.4rem;
	}
	.item-thumbnail.fallback {
		font-size: 1.4rem;
	}
	.item-fields {
		display: grid;
		gap: 0.45rem;
		min-width: 0;
	}
	.item-fields strong {
		overflow-wrap: anywhere;
	}
	.item-fields label span {
		margin: 0;
		color: var(--muted);
	}
	.preview dl {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		margin: 0 0 1rem;
		border: 1px solid var(--line);
		border-radius: 0.4rem;
	}
	.preview dl div {
		min-width: 0;
		padding: 0.7rem;
	}
	.preview dt {
		color: var(--muted);
		font-size: 0.65rem;
		text-transform: uppercase;
	}
	.preview dd {
		margin: 0.2rem 0 0;
		overflow-wrap: anywhere;
	}
	.preview ul,
	.report ul {
		margin: 0;
		padding: 0;
		list-style: none;
		border: 1px solid var(--line);
		border-radius: 0.4rem;
	}
	.relation-preview {
		display: grid;
		gap: 0.45rem;
		margin-bottom: 1rem;
	}
	.preview li,
	.report li {
		display: grid;
		grid-template-columns: minmax(10rem, 0.7fr) minmax(12rem, 1fr);
		gap: 1rem;
		padding: 0.7rem;
		border-bottom: 1px solid var(--line);
	}
	.preview li:last-child,
	.report li:last-child {
		border-bottom: 0;
	}
	.preview li span,
	.report li span {
		color: var(--muted);
		overflow-wrap: anywhere;
	}
	.report h3 {
		margin: 0;
		font:
			500 1.45rem/1.2 Georgia,
			'Times New Roman',
			serif;
	}
	.report > p {
		color: var(--muted);
	}
	.report li.failed span,
	.error {
		color: #9b382f;
	}
	.error {
		padding: 0.7rem;
		background: #fff0ed;
	}
	.progress {
		padding: 0.7rem;
		color: var(--teal-dark);
		background: #edf5f2;
	}
	footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.55rem;
		margin-top: 1rem;
	}
	footer button {
		padding: 0.55rem 0.8rem;
		border-radius: 0.35rem;
		font-size: 0.72rem;
		font-weight: 700;
	}
	footer .secondary {
		color: var(--navy);
		background: white;
		border: 1px solid var(--line);
	}
	footer .primary {
		color: white;
		background: var(--copper);
		border: 1px solid var(--copper);
	}
	button:disabled {
		opacity: 0.5;
		cursor: default;
	}
	@media (max-width: 42rem) {
		.settings,
		.common-relations > div,
		.preview dl,
		.preview li,
		.report li {
			grid-template-columns: 1fr;
		}
		.batch-item {
			grid-template-columns: 4rem minmax(0, 1fr);
		}
		.item-thumbnail {
			width: 4rem;
			height: 4rem;
		}
	}
</style>
