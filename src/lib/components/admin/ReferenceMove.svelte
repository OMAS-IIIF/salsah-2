<script lang="ts">
	import StagingFolderPicker from './StagingFolderPicker.svelte';
	import { authSession } from '$lib/auth/session';
	import { moveReference, readFolderInventory, type ReferenceMove } from '$lib/staging/repository';
	import { isDefiniteRejection } from '$lib/archive/client';
	import { m } from '$lib/paraglide/messages';
	import type { StagingMediaObjectNode } from '$lib/staging/types';
	/** Persist the exact revision-bound command before sending; ambiguous failures cannot mint a new ID. */
	let {
		project,
		media,
		onclose,
		onmoved
	}: {
		project: string;
		media: StagingMediaObjectNode | null;
		onclose: () => void;
		onmoved: () => void;
	} = $props();
	let target = $state('');
	let rejected = $state(false);
	$effect(() => {
		void media;
		rejected = false;
	});
	let pending = $state<{ id: string; request: ReferenceMove } | null>(null);
	let error = $state('');
	let blocked = $state(false);
	let busy = $state(false);
	let dialog = $state<HTMLDialogElement>();
	const key = $derived(`salsah-reference:${project}:${$authSession.user?.userIri ?? ''}`);
	$effect(() => {
		const saved = sessionStorage.getItem(key);
		pending = null;
		blocked = false;
		error = '';
		if (saved)
			try {
				const p = JSON.parse(saved);
				if (
					!/^[a-f0-9-]{36}$/.test(p.id) ||
					!p.request ||
					!['mediaIri', 'sourceFolderIri', 'targetFolderIri'].every(
						(k) => typeof p.request[k] === 'string'
					) ||
					!['sourceRevision', 'targetRevision'].every((k) => /^[a-f0-9]{64}$/.test(p.request[k]))
				)
					throw new Error('Invalid recovery record.');
				pending = p;
			} catch (e) {
				blocked = true;
				error = String(e);
			}
	});
	$effect(() => {
		if ((media || pending || blocked) && dialog && !dialog.open) dialog.showModal();
	});
	async function submit() {
		if (busy || blocked || rejected) return;
		const commandKey = key;
		const commandProject = project;
		busy = true;
		error = '';
		try {
			if (!pending) {
				if (!media?.repositoryEntry?.canMove || !target) return;
				const [source, destination] = await Promise.all([
					readFolderInventory(project, media.folderIri),
					readFolderInventory(project, target)
				]);
				const request = {
					mediaIri: media.iri,
					sourceFolderIri: source.folderIri,
					targetFolderIri: destination.folderIri,
					sourceRevision: media.folderRevision ?? source.revision,
					targetRevision: destination.revision
				};
				const command = { id: crypto.randomUUID(), request };
				sessionStorage.setItem(commandKey, JSON.stringify(command));
				pending = command;
			}
			const receipt = await moveReference(commandProject, pending.request, pending.id);
			if (receipt.state !== 'committed' || receipt.operationId !== pending.id)
				throw new Error('Invalid move receipt.');
			sessionStorage.removeItem(commandKey);
			pending = null;
			dialog?.close();
			onmoved();
			onclose();
		} catch (e) {
			error = String(e);
			if (isDefiniteRejection(e)) {
				rejected = true;
				sessionStorage.removeItem(commandKey);
				pending = null;
				onmoved();
			}
		} finally {
			busy = false;
		}
	}
</script>

{#if media || pending || blocked}
	<dialog
		bind:this={dialog}
		oncancel={(e) => {
			if (pending || busy || blocked) e.preventDefault();
			else onclose();
		}}
	>
		<h2>{m.repository_move()}</h2>
		<p>{media?.originalName ?? pending?.request.mediaIri}</p>
		{#if media && !pending}<StagingFolderPicker
				{project}
				areaIri={media.areaIri}
				bind:value={target}
				disabled={busy || blocked}
			/>{/if}
		{#if error}<p role="alert">{error}</p>{/if}
		<button disabled={busy || blocked || rejected || (!pending && !target)} onclick={submit}
			>{pending ? m.archive_retry() : m.archive_move()}</button
		>
		<button
			disabled={busy || !!pending || blocked}
			onclick={() => {
				dialog?.close();
				onclose();
			}}>{m.repository_close()}</button
		>
	</dialog>
{/if}

<style>
	dialog {
		max-width: 38rem;
		width: 90%;
		border: 1px solid var(--line);
		border-radius: 0.7rem;
		padding: 1.5rem;
		color: var(--navy);
	}
	dialog::backdrop {
		background: #142e4677;
	}
	button {
		padding: 0.6rem;
		margin: 0.5rem 0.3rem 0.5rem 0;
	}
	p {
		overflow-wrap: anywhere;
	}
</style>
