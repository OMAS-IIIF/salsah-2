<script lang="ts">
	import { page } from '$app/state';
	import { authSession } from '$lib/auth/session';
	import { archiveRequest } from '$lib/archive/client';
	import { m } from '$lib/paraglide/messages';
	interface Job {
		exportId: string;
		state: string;
		canDownload: boolean;
		selection: { displayName: string };
	}
	let job = $state<Job | null>(null);
	let error = $state('');
	let busy = $state(false);
	let url = $state('');
	// Status remains owner-protected. Download capabilities are requested only on user action.
	$effect(() => {
		const id = page.params.exportId;
		if ($authSession.status !== 'authenticated' || !id) return;
		let active = true;
		job = null;
		url = '';
		error = '';
		void archiveRequest<Job>(`/exports/${encodeURIComponent(id)}`)
			.then((value) => {
				if (active) job = value;
			})
			.catch((e) => {
				if (active) error = String(e);
			});
		return () => {
			active = false;
		};
	});
	async function act(download: boolean) {
		const id = page.params.exportId;
		if (!id) return;
		busy = true;
		error = '';
		url = '';
		try {
			if (download) {
				const result = await archiveRequest<{ url: string; method: string }>(
					`/exports/${encodeURIComponent(id)}/download-capability`,
					{}
				);
				if (result.method !== 'GET' || !['https:', 'http:'].includes(new URL(result.url).protocol))
					throw new Error(m.mail_request_error());
				if (page.params.exportId === id) url = result.url;
			} else {
				const result = await archiveRequest<Job>(`/exports/${encodeURIComponent(id)}`);
				if (page.params.exportId === id) job = result;
			}
		} catch (e) {
			error = String(e);
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head><title>ZIP Export · SALSAH</title></svelte:head>
<section>
	<h1>ZIP Export</h1>
	{#if job}<h2>{job.selection.displayName}</h2>
		<p role="status">{job.state}</p>{:else}<p>{m.mail_loading()}</p>{/if}
	<button disabled={busy || $authSession.status !== 'authenticated'} onclick={() => act(false)}
		>{m.mail_refresh()}</button
	>
	{#if job?.canDownload}<button disabled={busy} onclick={() => act(true)}
			>{m.mail_download()}</button
		>{/if}
	{#if url}<!-- Authorized external media URL, never an application route. -->
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
		<a href={url} referrerpolicy="no-referrer">{m.mail_open_download()}</a>{/if}
	{#if error}<p role="alert">{error}</p>{/if}
</section>

<style>
	section {
		padding: 2rem;
	}
	button {
		margin: 0.5rem;
		padding: 0.6rem;
		border: 1px solid var(--line);
	}
</style>
