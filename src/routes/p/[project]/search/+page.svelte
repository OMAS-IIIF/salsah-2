<script lang="ts">
	import { page } from '$app/state';
	import ProjectSearch from '$lib/components/search/ProjectSearch.svelte';

	let project = $derived(page.params.project ?? '');
	let query = $derived(page.url.searchParams.get('q') ?? '');
</script>

<ProjectSearch {project} {query} />
