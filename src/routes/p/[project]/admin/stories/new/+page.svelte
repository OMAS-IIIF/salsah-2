<script lang="ts">
	import { page } from '$app/state';
	import StoryCreate from '$lib/components/admin/StoryCreate.svelte';

	let project = $derived(page.params.project ?? '');
</script>

<StoryCreate {project} />
