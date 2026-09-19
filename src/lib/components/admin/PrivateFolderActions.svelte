<script lang="ts">
	import StagingFolderPicker from './StagingFolderPicker.svelte';
	import { archiveRequest } from '$lib/archive/client';
	import type { StagingFolderNode } from '$lib/staging/types';
	import { localizedText, fallbackLabel } from '$lib/resources/model';
	import { getLocale } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages';
	/** Private name/parent edits preserve folder identity; OLDAP checks cycles, area and system roots. */
	let {
		project,
		folder,
		onchanged
	}: { project: string; folder: StagingFolderNode; onchanged: () => void } = $props();
	let open = $state(false);
	let dialog = $state<HTMLDialogElement>();
	let name = $state('');
	let parent = $state('');
	let busy = $state(false);
	let error = $state('');
	$effect(() => {
		if (open && dialog && !dialog.open) dialog.showModal();
	});
	function show() {
		name = localizedText(folder.title, getLocale()) ?? fallbackLabel(folder.iri);
		parent = '';
		error = '';
		open = true;
	}
	async function save(move: boolean) {
		if (busy || (!move && !name.trim()) || (move && (!parent || parent === folder.iri))) return;
		busy = true;
		error = '';
		try {
			await archiveRequest(
				`/data/${encodeURIComponent(project)}/${encodeURIComponent(folder.iri)}`,
				move ? { 'shared:inStagingFolder': [parent] } : { 'schema:name': name.trim() }
			);
			dialog?.close();
			open = false;
			onchanged();
		} catch (e) {
			error = String(e);
		} finally {
			busy = false;
		}
	}
</script>

<button class="folder-trigger" type="button" onclick={show}>{m.repository_folder_manage()}</button>
{#if open}<dialog
		bind:this={dialog}
		oncancel={(e) => {
			if (busy) e.preventDefault();
			else open = false;
		}}
	>
		<h2>{m.repository_rename()}</h2>
		<label>{m.archive_name()}<input bind:value={name} disabled={busy} /></label><button
			disabled={busy || !name.trim()}
			onclick={() => save(false)}>{m.archive_save()}</button
		><StagingFolderPicker
			{project}
			areaIri={folder.areaIri}
			bind:value={parent}
			allowRoot
			disabled={busy}
		/><button disabled={busy || !parent || parent === folder.iri} onclick={() => save(true)}
			>{m.archive_move()}</button
		>{#if error}<p role="alert">{error}</p>{/if}<button
			disabled={busy}
			onclick={() => {
				dialog?.close();
				open = false;
			}}>{m.repository_close()}</button
		>
	</dialog>{/if}

<style>
	.folder-trigger {
		font-size: 0.7rem;
		font-weight: 700;
		color: var(--teal-dark);
		border-color: var(--teal);
		padding: 0.5rem 0.7rem;
	}
	dialog {
		width: 90%;
		max-width: 38rem;
		border: 1px solid var(--line);
		border-radius: 0.7rem;
		padding: 1.5rem;
	}
	dialog::backdrop {
		background: #142e4677;
	}
	button,
	input {
		padding: 0.5rem;
		margin: 0.3rem;
		border: 1px solid var(--line);
		background: white;
		border-radius: 0.3rem;
	}
	label {
		display: grid;
	}
	p {
		overflow-wrap: anywhere;
	}
</style>
