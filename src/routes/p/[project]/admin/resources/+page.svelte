<script lang="ts">
	import { page } from '$app/state';
	import ResourceAdministration from '$lib/components/admin/ResourceAdministration.svelte';

	let project = $derived(page.params.project ?? '');
</script>

<ResourceAdministration {project} />
