<script lang="ts">
	import { searchStagingFolders } from '$lib/staging/client';
	import type { StagingFolderNode } from '$lib/staging/types';
	import { localizedText, fallbackLabel } from '$lib/resources/model';
	import { getLocale } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages';
	/** Browse a single private area on demand; technical destinations are never selectable. */
	let {
		project,
		areaIri,
		value = $bindable(''),
		allowRoot = false,
		disabled = false
	}: {
		project: string;
		areaIri: string;
		value?: string;
		allowRoot?: boolean;
		disabled?: boolean;
	} = $props();
	let parent = $state<string | null>(null);
	let folders = $state<StagingFolderNode[]>([]);
	let label = $state('');
	let error = $state('');
	$effect(() => {
		let cancelled = false;
		void searchStagingFolders(project, areaIri, parent)
			.then((v) => {
				if (!cancelled) folders = v;
			})
			.catch((e) => {
				if (!cancelled) error = String(e);
			});
		return () => {
			cancelled = true;
		};
	});
	function name(folder: StagingFolderNode) {
		return localizedText(folder.title, getLocale()) ?? fallbackLabel(folder.iri);
	}
</script>

<fieldset {disabled}>
	<legend>{m.repository_destination()}</legend>
	<p>{m.archive_selected()}: {label || value || '—'}</p>
	<button type="button" onclick={() => (parent = null)}>{m.archive_roots()}</button>
	{#each folders as folder (folder.iri)}<div>
			<button
				type="button"
				disabled={['Trash', 'Mobile', ...(!allowRoot ? ['top'] : [])].includes(name(folder))}
				onclick={() => {
					value = folder.iri;
					label = name(folder);
				}}>{name(folder)}</button
			><button
				type="button"
				disabled={['Trash', 'Mobile'].includes(name(folder))}
				onclick={() => (parent = folder.iri)}
				aria-label={`${m.archive_browse()}: ${name(folder)}`}>›</button
			>
		</div>{/each}
	{#if error}<p role="alert">{error}</p>{/if}
</fieldset>

<style>
	fieldset {
		border: 1px solid var(--line);
		padding: 0.8rem;
		min-width: 0;
	}
	button {
		padding: 0.4rem 0.7rem;
		margin: 0.2rem;
		border: 1px solid var(--line);
		border-radius: 0.3rem;
		background: white;
	}
	div {
		display: flex;
	}
	div button:first-child {
		flex: 1;
		text-align: left;
	}
	p {
		font-size: 0.85rem;
	}
</style>
