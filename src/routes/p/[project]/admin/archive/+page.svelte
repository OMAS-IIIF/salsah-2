<script lang="ts">
	import ArchiveSectionNav from '$lib/components/admin/ArchiveSectionNav.svelte';
	import ResourceAdministration from '$lib/components/admin/ResourceAdministration.svelte';
	let section = $state('structure');

	import ArchiveFolderDefaults from '$lib/components/admin/ArchiveFolderDefaults.svelte';
	import WriterRecoveryPanel from '$lib/components/admin/WriterRecoveryPanel.svelte';
	import { authSession } from '$lib/auth/session';
	import { page } from '$app/state';
	import ArchiveStructureAdministration from '$lib/components/admin/ArchiveStructureAdministration.svelte';
	import { m } from '$lib/paraglide/messages';
</script>

<svelte:head><title>{m.archive_admin_title()} · SALSAH 2</title></svelte:head>
<div class="archive-workspace">
	<h1>Archiv verwalten</h1>
	<p>Struktur gestalten, Ordner zuordnen und Archiv-Inhalte bearbeiten.</p>
	<ArchiveSectionNav
		bind:value={section}
		items={[
			{ id: 'structure', label: 'Archivstruktur' },
			{ id: 'mapping', label: 'Ordner zuordnen' },
			{ id: 'contents', label: 'Archiv-Inhalte' }
		]}
	/>
	<!-- Keep all panels mounted to preserve selections, drafts and exact retry state. -->
	<section hidden={section !== 'structure'} aria-label="Archivstruktur">
		<ArchiveStructureAdministration project={page.params.project ?? ''} />
	</section>
	<section hidden={section !== 'mapping'} aria-label="Ordner zuordnen">
		<p>Lege fest, welches Archivziel beim Erfassen der Medien vorgeschlagen wird.</p>
		<ArchiveFolderDefaults project={page.params.project ?? ''} />
	</section>
	<section hidden={section !== 'contents'} aria-label="Archiv-Inhalte">
		<ResourceAdministration project={page.params.project ?? ''} embedded />
	</section>
</div>

<div class="writer-operations">
	{#key $authSession.user?.userIri}
		{#if $authSession.user}<WriterRecoveryPanel userKey={$authSession.user.userIri} />{/if}
	{/key}
</div>

<style>
	[hidden] {
		display: none !important;
	}
	.archive-workspace {
		max-width: 80rem;
		margin: auto;
		padding: clamp(1rem, 4vw, 3rem);
	}
	.archive-workspace h1 {
		font-size: 1.5rem;
		font-weight: 600;
	}
	.archive-workspace > p {
		color: #64748b;
		margin-block: 0.5rem;
	}
	.archive-workspace :global(.administration) {
		padding: 0;
	}
	.archive-workspace :global(h2) {
		font-size: 1.125rem;
		font-weight: 600;
	}

	.writer-operations {
		max-width: 80rem;
		margin-inline: auto;
		padding-inline: clamp(1rem, 4vw, 3rem);
		padding-bottom: 2rem;
	}
</style>
