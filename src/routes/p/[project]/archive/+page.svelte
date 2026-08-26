<script lang="ts">
	import { page } from '$app/state';
	import ArchiveTree from '$lib/components/archive/ArchiveTree.svelte';

	let project = $derived(page.params.project ?? '');
</script>

<ArchiveTree {project} />
