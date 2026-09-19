<script lang="ts">
	import { page } from '$app/state';
	import StoryEditor from '$lib/components/admin/StoryEditor.svelte';

	let project = $derived(page.params.project ?? '');
	let iri = $derived(page.params.iri ?? '');
	let initialLanguage = $derived(page.url.searchParams.get('language') ?? '');
</script>

<StoryEditor {project} {iri} {initialLanguage} />
