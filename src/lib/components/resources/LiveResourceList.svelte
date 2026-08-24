<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { projectResourcePath } from '$lib/projects/context';
	import { m } from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import { searchRecentResources } from '$lib/resources/client';
	import { fallbackLabel, localizedText } from '$lib/resources/model';
	import type { OldapResourceSearchHit } from '$lib/resources/types';

	interface Props {
		project: string;
	}

	let { project }: Props = $props();
	let resources = $state<OldapResourceSearchHit[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let reloadGeneration = $state(0);

	function title(resource: OldapResourceSearchHit): string {
		return localizedText(resource['schema:name'], getLocale()) ?? fallbackLabel(resource.iri);
	}

	function reload(): void {
		reloadGeneration += 1;
	}

	$effect(() => {
		const requestedProject = project;
		const requestedGeneration = reloadGeneration;
		loading = true;
		error = null;
		void searchRecentResources(requestedProject)
			.then((result) => {
				if (requestedProject === project && requestedGeneration === reloadGeneration) {
					resources = result;
				}
			})
			.catch((cause: unknown) => {
				if (requestedProject === project && requestedGeneration === reloadGeneration) {
					resources = [];
					error = cause instanceof Error ? cause.message : m.live_resources_error();
				}
			})
			.finally(() => {
				if (requestedProject === project && requestedGeneration === reloadGeneration) {
					loading = false;
				}
			});
	});
</script>

<section class="live-panel" aria-labelledby="live-resource-title">
	<header>
		<div>
			<p>{m.live_resources_kicker()}</p>
			<h2 id="live-resource-title">{m.live_resources_title()}</h2>
		</div>
		<span>{m.live_resources_source()}</span>
	</header>

	{#if loading}
		<div class="state" role="status"><i></i>{m.live_resources_loading()}</div>
	{:else if error}
		<div class="state error" role="alert">
			<span>{m.live_resources_error()}</span>
			<button type="button" onclick={reload}>{m.resource_retry()}</button>
		</div>
	{:else if resources.length === 0}
		<p class="empty">{m.live_resources_empty()}</p>
	{:else}
		<div class="resource-grid">
			{#each resources as resource (resource.iri)}
				<a href={resolve(projectResourcePath(project, resource.iri) as Pathname)}>
					<span class="document" aria-hidden="true"><i></i><i></i><i></i></span>
					<span class="summary">
						<small>{fallbackLabel(resource.resclass)}</small>
						<strong>{title(resource)}</strong>
						<code>{resource.iri}</code>
					</span>
					<b aria-hidden="true">→</b>
				</a>
			{/each}
		</div>
	{/if}
</section>

<style>
	.live-panel {
		margin-top: 1.5rem;
		overflow: hidden;
		background: rgb(255 253 248 / 96%);
		border: 1px solid var(--line);
		border-left: 0.3rem solid var(--teal);
		border-radius: 0.8rem;
		box-shadow: 0 2px 8px rgb(17 44 70 / 4%);
	}
	header {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.1rem 1.3rem 0.9rem;
	}
	header p {
		margin: 0 0 0.35rem;
		color: var(--copper-dark);
		font-size: 0.66rem;
		font-weight: 750;
		letter-spacing: 0.13em;
		text-transform: uppercase;
	}
	h2 {
		margin: 0;
		color: var(--navy);
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 1.35rem;
		font-weight: 500;
	}
	header > span {
		padding: 0.35rem 0.55rem;
		color: #087f7b;
		background: #e6f4f1;
		border-radius: 999px;
		font-size: 0.65rem;
		font-weight: 750;
	}
	.resource-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
		border-top: 1px solid #e8e3da;
	}
	.resource-grid a {
		display: grid;
		grid-template-columns: 2.5rem minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.85rem;
		min-height: 5rem;
		padding: 0.8rem 1.2rem;
		color: inherit;
		border-right: 1px solid #ece8e0;
		text-decoration: none;
	}
	.resource-grid a:hover {
		background: #f7f8f4;
	}
	.document {
		display: grid;
		align-content: center;
		gap: 0.25rem;
		width: 2.35rem;
		height: 2.8rem;
		padding: 0.55rem 0.4rem;
		background: var(--navy);
		border-radius: 0.2rem;
	}
	.document i {
		height: 1px;
		background: rgb(255 255 255 / 72%);
	}
	.document i:last-child {
		width: 65%;
	}
	.summary {
		display: grid;
		gap: 0.14rem;
		min-width: 0;
	}
	.summary small {
		color: var(--copper-dark);
		font-size: 0.6rem;
		font-weight: 750;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.summary strong {
		overflow: hidden;
		color: var(--navy);
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 0.92rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.summary code {
		overflow: hidden;
		color: var(--muted);
		font-family: inherit;
		font-size: 0.66rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.resource-grid b {
		color: var(--teal);
	}
	.state,
	.empty {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		min-height: 4.5rem;
		margin: 0;
		padding: 0.9rem 1.3rem;
		color: var(--muted);
		border-top: 1px solid #e8e3da;
		font-size: 0.78rem;
	}
	.state i {
		width: 0.9rem;
		height: 0.9rem;
		border: 2px solid #cbd7d4;
		border-top-color: var(--teal);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	.state.error {
		justify-content: space-between;
		color: #8e3d2d;
	}
	.state button {
		padding: 0.4rem 0.65rem;
		color: var(--navy);
		background: white;
		border: 1px solid var(--line);
		border-radius: 0.35rem;
		font-weight: 700;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	@media (max-width: 42rem) {
		header {
			align-items: flex-start;
		}
		header > span {
			white-space: nowrap;
		}
	}
</style>
