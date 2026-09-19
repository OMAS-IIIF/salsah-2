<script lang="ts">
	import { authSession } from '$lib/auth/session';
	import { archiveRequest } from '$lib/archive/client';
	import { m } from '$lib/paraglide/messages';
	/** Explicit estimate/create/status/download workflow using unchanged ZIP v1 contracts. */
	let { project, folderIri }: { project: string; folderIri: string } = $props();
	let estimate = $state<{
		filesTotal: number;
		sourceBytes: number;
		exceedsLimit: boolean;
		warningCount: number;
	} | null>(null);
	let job = $state<{ exportId: string; state: string; canDownload: boolean } | null>(null);
	let error = $state('');
	let busy = $state(false);
	let url = $state('');
	const storageKey = $derived(
		`salsah-export:${project}:${folderIri}:${$authSession.user?.userIri ?? ''}`
	);
	async function restore() {
		const id = sessionStorage.getItem(storageKey);
		if (!id || job) return;
		busy = true;
		try {
			job = await archiveRequest(`/exports/${encodeURIComponent(id)}`);
		} catch (e) {
			error = String(e);
		} finally {
			busy = false;
		}
	}
	const selection = $derived({
		projectShortName: project,
		kind: 'STAGING_FOLDER',
		selectionIri: folderIri,
		includeTrash: false
	});
	async function run(action: 'estimate' | 'create' | 'refresh' | 'download') {
		busy = true;
		error = '';
		try {
			if (action === 'estimate') estimate = await archiveRequest('/exports/estimate', selection);
			if (action === 'create') {
				job = await archiveRequest('/exports', selection);
				if (job?.exportId) sessionStorage.setItem(storageKey, job.exportId);
			}
			if (action === 'refresh' && job)
				job = await archiveRequest(`/exports/${encodeURIComponent(job.exportId)}`);
			if (action === 'download' && job) {
				const result = await archiveRequest<{ url: string; method: string }>(
					`/exports/${encodeURIComponent(job.exportId)}/download-capability`,
					{}
				);
				const parsed = new URL(result.url);
				if (result.method !== 'GET' || !['http:', 'https:'].includes(parsed.protocol))
					throw new Error('Invalid download authorization.');
				url = result.url;
			}
		} catch (e) {
			error = String(e);
		} finally {
			busy = false;
		}
	}
</script>

<details
	ontoggle={(event) => {
		if (event.currentTarget.open) void restore();
	}}
>
	<summary>{m.repository_export()}</summary>
	<button disabled={busy} onclick={() => run('estimate')}>{m.archive_review()}</button>
	{#if estimate}<p>
			{estimate.filesTotal}
			{m.repository_export_files()} · {estimate.sourceBytes}
			{m.repository_export_bytes()} · {estimate.warningCount} ⚠
		</p>
		<button disabled={busy || estimate.exceedsLimit || !!job} onclick={() => run('create')}
			>{m.repository_export_create()}</button
		>{/if}
	{#if job}<p role="status">{job.state}</p>
		<button disabled={busy} onclick={() => run('refresh')}>{m.repository_export_refresh()}</button
		>{#if job.canDownload}<button disabled={busy} onclick={() => run('download')}
				>{m.repository_export()}</button
			>{/if}{/if}
	{#if url}<!-- The URL is an HTTP(S) media-server capability, not an application route. -->
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
		<a href={url}>{m.repository_export_open()}</a>{/if}
	{#if error}<p role="alert">{error}</p>{/if}
</details>

<style>
	details {
		font-size: 0.8rem;
		padding: 0.5rem;
	}
	button {
		padding: 0.4rem;
		margin: 0.2rem;
		border: 1px solid var(--line);
		border-radius: 0.3rem;
		background: white;
	}
	p {
		max-width: 25rem;
		overflow-wrap: anywhere;
	}
</style>
