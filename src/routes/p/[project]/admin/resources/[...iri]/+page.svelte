<script lang="ts">
	import { page } from '$app/state';
	import ResourceEditor from '$lib/components/admin/ResourceEditor.svelte';

	let project = $derived(page.params.project ?? '');
	let iri = $derived(page.params.iri ?? '');
	let initialLanguage = $derived(page.url.searchParams.get('language') ?? '');
</script>

<ResourceEditor {project} {iri} {initialLanguage} />
