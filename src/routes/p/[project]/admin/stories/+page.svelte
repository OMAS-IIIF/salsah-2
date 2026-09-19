<script lang="ts">
	import { page } from '$app/state';
	import StoryAdministration from '$lib/components/admin/StoryAdministration.svelte';

	let project = $derived(page.params.project ?? '');
</script>

<StoryAdministration {project} />
