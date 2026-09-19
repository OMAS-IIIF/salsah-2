<script lang="ts">
	import ArchiveUnitPicker from './ArchiveUnitPicker.svelte';
	import { folderArchiveDefault, commonSourceFolder } from '$lib/staging/repository';
	import { m } from '$lib/paraglide/messages';
	import type { StagingMediaObjectNode } from '$lib/staging/types';
	/** Initialize once per source selection. Later manual choices are never overwritten. */
	let {
		project,
		media,
		value = $bindable(''),
		ready = $bindable(false),
		disabled = false
	}: {
		project: string;
		media: StagingMediaObjectNode[];
		value?: string;
		ready?: boolean;
		disabled?: boolean;
	} = $props();
	let error = $state('');
	const folder = $derived(commonSourceFolder(media));
	$effect(() => {
		const source = folder;
		let cancelled = false;
		ready = false;
		value = '';
		error = '';
		if (!source) {
			ready = true;
			return;
		}
		void folderArchiveDefault(project, source)
			.then((v) => {
				if (!cancelled) {
					value = v;
					ready = true;
				}
			})
			.catch(() => {
				if (!cancelled) error = m.repository_default_error();
			});
		return () => {
			cancelled = true;
		};
	});
</script>

<p>{m.repository_default()}</p>
{#if error}<p role="alert">{error}</p>{/if}
<ArchiveUnitPicker {project} bind:value disabled={disabled || !ready} />
