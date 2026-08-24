<script lang="ts">
	import { page } from '$app/state';
	import ResourceDetail from '$lib/components/resources/ResourceDetail.svelte';
</script>

<ResourceDetail project={page.params.project ?? ''} iri={page.params.iri ?? ''} />
