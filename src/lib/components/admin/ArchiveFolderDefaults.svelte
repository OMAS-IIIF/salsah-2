<script lang="ts">
	import { ArchiveMappingAdministration } from 'oldap-guilib/archive-mapping';
	import { authSession } from '$lib/auth/session';
	import { getApiBaseUrl } from '$lib/api/baseUrl';
	import { archiveRequest } from '$lib/archive/client';
	/** Shared OLDAP mapping UI; SALSAH owns authentication and project navigation. */
	let { project }: { project: string } = $props();
	function transport(actor: string) {
		return <T,>(path: string, body?: unknown, method?: string, id?: string): Promise<T> => {
			if ($authSession.user?.userIri !== actor)
				throw new Error('Benutzer gewechselt. Bitte Ansicht neu laden.');
			return archiveRequest<T>(path, body, method, id);
		};
	}
</script>

<div class="folder-defaults">
	<h2>Ordner zuordnen</h2>

	{#if $authSession.user}
		{#key `${getApiBaseUrl()}:${project}:${$authSession.user.userIri}`}
			<ArchiveMappingAdministration
				{project}
				scope={`${getApiBaseUrl()}:${project}:${$authSession.user.userIri}`}
				request={transport($authSession.user.userIri)}
			/>
		{/key}
	{/if}
</div>

<style>
	h2 {
		font-size: 1.125rem;
		font-weight: 600;
		margin-bottom: 1rem;
	}
	.folder-defaults :global(.administration > h2) {
		display: none;
	}
</style>
