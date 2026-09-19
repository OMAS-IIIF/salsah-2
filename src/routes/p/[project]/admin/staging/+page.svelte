<script lang="ts">
	import { page } from '$app/state';
	import StagingWorkspace from '$lib/components/admin/StagingWorkspace.svelte';
	let project = $derived(page.params.project ?? '');
</script>

<StagingWorkspace {project} />
