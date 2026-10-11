<script lang="ts">
	import Viewer from '$lib/components/media/IiifImageViewer.svelte';
	import CompactMediaPreview from '$lib/components/media/CompactMediaPreview.svelte';
	import { authSession } from '$lib/auth/session';
	import { env } from '$env/dynamic/public';
	let asset = $state('a');
	let shown = $state(true);
	let user = $state('unknown');
	function login(userId: string) {
		authSession.set({
			status: 'authenticated',
			accessToken: 'fixture-access-' + userId,
			user: {
				userId,
				userIri: 'urn:' + userId,
				givenName: userId,
				familyName: 'Fixture',
				email: '',
				isActive: true,
				inProjects: [],
				hasRole: {}
			}
		});
	}
	login('unknown');
	const media = $derived({
		kind: 'iiif-image' as const,
		infoUrl: env.PUBLIC_MEDIA_URL + '/iiif/3/' + asset + '/info.json',
		capability: 'stale'
	});
</script>

<h1>SALSAH media renewal</h1>
<p>Reader: {user}; asset: {asset}</p>
<button
	onclick={() => {
		user = user === 'unknown' ? 'editor' : 'unknown';
		login(user);
	}}>Switch reader</button
>
<button onclick={() => (asset = asset === 'a' ? 'b' : 'a')}>Switch image</button>
<button onclick={() => (shown = !shown)}>Toggle media</button>
<button onclick={() => fetch(env.PUBLIC_API_URL + '/deny', { method: 'POST' })}>Deny renewal</button
>
{#if shown}
	<CompactMediaPreview {media} title="Fixture preview" />
	<Viewer infoUrl={media.infoUrl} label="Fixture image" />
	<div style="margin-top:3000px">
		<CompactMediaPreview
			media={{
				kind: 'iiif-image' as const,
				infoUrl: env.PUBLIC_MEDIA_URL + '/iiif/3/b/info.json',
				capability: 'stale'
			}}
			title="Offscreen preview"
		/>
	</div>
{/if}
