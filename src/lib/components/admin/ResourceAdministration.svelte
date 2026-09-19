<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { getLocale } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages';
	import { mediaPreviewUrl } from '$lib/media/capability';
	import { projectAdministrationPath, projectResourceEditorPath } from '$lib/projects/context';
	import { localizedText } from '$lib/resources/model';
	import type { ResourceCard } from '$lib/resources/types';
	import {
		loadEditableResourceCards,
		searchEditableResourceCards
	} from '$lib/resourceEditor/client';

	interface Props {
		project: string;
		/** Embedded archive view omits page navigation and document title. */
		embedded?: boolean;
	}

	let { project, embedded = false }: Props = $props();
	let query = $state('');
	let cards = $state<ResourceCard[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let generation = $state(0);

	$effect(() => {
		const requestedProject = project;
		const requestedGeneration = generation;
		let cancelled = false;
		loading = true;
		error = null;
		void loadEditableResourceCards(requestedProject)
			.then((result) => {
				if (!cancelled && requestedGeneration === generation) cards = result;
			})
			.catch((reason: unknown) => {
				if (!cancelled)
					error = reason instanceof Error ? reason.message : m.admin_resources_load_error();
			})
			.finally(() => {
				if (!cancelled) loading = false;
			});
		return () => {
			cancelled = true;
		};
	});

	async function search(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		const normalized = query.trim();
		if (!normalized || loading) return;
		const requestGeneration = ++generation;
		loading = true;
		error = null;
		try {
			const result = await searchEditableResourceCards(project, normalized);
			if (requestGeneration === generation) cards = result;
		} catch (reason: unknown) {
			if (requestGeneration === generation)
				error = reason instanceof Error ? reason.message : m.admin_resources_load_error();
		} finally {
			if (requestGeneration === generation) loading = false;
		}
	}

	function resetSearch(): void {
		query = '';
		generation += 1;
	}

	function title(card: ResourceCard): string {
		return localizedText(card.resource['schema:name'], getLocale()) ?? m.story_asset_untitled();
	}

	function classLabel(card: ResourceCard): string {
		return localizedText(card.classLabels, getLocale()) ?? card.resource.resclass;
	}
</script>

<svelte:head
	>{#if !embedded}<title>{m.admin_resources_title()} · SALSAH 2.0</title>{/if}</svelte:head
>

<div class="resources-page" class:embedded>
	{#if embedded}<h2>Archiv-Inhalte</h2>
		<p>Ressourcen suchen und Metadaten bearbeiten.</p>{:else}
		<a class="back" href={resolve(projectAdministrationPath(project) as Pathname)}
			>← {m.admin_back()}</a
		>
		<header>
			<p>{m.admin_resources_kicker()}</p>
			<h1>{m.admin_resources_title()}</h1>
			<span>{m.admin_resources_intro()}</span>
		</header>
	{/if}
	<form role="search" onsubmit={search}>
		<input
			bind:value={query}
			type="search"
			placeholder={m.admin_resources_search_placeholder()}
			aria-label={m.admin_resources_search_label()}
		/>
		<button type="submit" disabled={!query.trim() || loading}>{m.search_submit()}</button>
		{#if query.trim()}
			<button type="button" class="secondary" onclick={resetSearch}
				>{m.admin_resources_recent()}</button
			>
		{/if}
	</form>

	<div class="result-heading">
		<strong>{query.trim() ? m.admin_resources_results() : m.admin_resources_recent()}</strong>
		<small>{m.admin_resources_supported_hint()}</small>
	</div>

	{#if loading}
		<div class="state" role="status">{m.admin_resources_loading()}</div>
	{:else if error}
		<div class="state error" role="alert">
			<span>{error}</span><button type="button" onclick={() => (generation += 1)}
				>{m.resource_retry()}</button
			>
		</div>
	{:else if cards.length}
		<div class="resource-list">
			{#each cards as card (card.resource.iri)}
				<a href={resolve(projectResourceEditorPath(project, card.resource.iri) as Pathname)}>
					{#if card.media}
						<img src={mediaPreviewUrl(card.media)} alt="" loading="lazy" />
					{:else}
						<i aria-hidden="true">▦</i>
					{/if}
					<span>
						<small>{classLabel(card)}</small>
						<strong>{title(card)}</strong>
						<code>{card.resource.iri}</code>
					</span>
					<b aria-hidden="true">{m.admin_edit()} →</b>
				</a>
			{/each}
		</div>
	{:else}
		<div class="state">{m.admin_resources_empty()}</div>
	{/if}
</div>

<style>
	.resources-page.embedded {
		padding: 0;
	}
	.embedded h2 {
		font-size: 1.125rem;
		font-weight: 600;
	}
	.resources-page {
		max-width: 78rem;
		margin: auto;
		padding: 2rem clamp(1.1rem, 4vw, 4rem) 4rem;
	}
	.back {
		color: var(--muted);
		font-size: 0.72rem;
		font-weight: 680;
		text-decoration: none;
	}
	header {
		max-width: 55rem;
		margin: 1.5rem 0 1.4rem;
	}
	header p {
		margin: 0 0 0.4rem;
		color: var(--copper-dark);
		font-size: 0.67rem;
		font-weight: 760;
		letter-spacing: 0.13em;
		text-transform: uppercase;
	}
	h1 {
		margin: 0;
		color: var(--navy);
		font-family: Georgia, serif;
		font-size: clamp(2.4rem, 6vw, 4.5rem);
		font-weight: 500;
		letter-spacing: -0.04em;
	}
	header span {
		display: block;
		margin-top: 0.7rem;
		color: var(--muted);
		line-height: 1.55;
	}
	form {
		display: flex;
		gap: 0.55rem;
		margin-bottom: 1rem;
	}
	form input {
		flex: 1;
		min-width: 0;
		padding: 0.75rem 0.85rem;
		color: var(--navy);
		background: white;
		border: 1px solid var(--line);
		border-radius: 0.48rem;
	}
	button {
		padding: 0.65rem 1rem;
		color: white;
		background: var(--copper);
		border: 0;
		border-radius: 0.48rem;
		font-weight: 720;
	}
	button.secondary {
		color: var(--navy);
		background: white;
		border: 1px solid var(--line);
	}
	button:disabled {
		opacity: 0.45;
	}
	.result-heading {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		margin: 1.2rem 0 0.6rem;
		color: var(--navy);
		font-size: 0.72rem;
	}
	.result-heading small {
		color: var(--muted);
	}
	.resource-list {
		display: grid;
		gap: 0.65rem;
	}
	.resource-list a {
		display: grid;
		grid-template-columns: 4.3rem minmax(0, 1fr) auto;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem;
		color: inherit;
		background: rgb(255 253 248 / 94%);
		border: 1px solid var(--line);
		border-radius: 0.65rem;
		text-decoration: none;
	}
	.resource-list a:hover {
		border-color: var(--teal);
	}
	.resource-list img,
	.resource-list i {
		width: 4.3rem;
		height: 3.4rem;
		object-fit: cover;
		background: #e7ecec;
		border-radius: 0.42rem;
	}
	.resource-list i {
		display: grid;
		place-items: center;
		color: white;
		background: var(--navy);
		font-style: normal;
	}
	.resource-list span {
		display: grid;
		gap: 0.16rem;
		min-width: 0;
	}
	.resource-list small {
		color: var(--copper-dark);
		font-size: 0.64rem;
		font-weight: 700;
	}
	.resource-list strong {
		color: var(--navy);
		font-family: Georgia, serif;
		font-size: 1.15rem;
		font-weight: 500;
	}
	.resource-list code {
		overflow: hidden;
		color: var(--muted);
		font-size: 0.61rem;
		text-overflow: ellipsis;
	}
	.resource-list b {
		color: var(--teal);
		font-size: 0.7rem;
	}
	.state {
		padding: 1.3rem;
		color: var(--muted);
		background: rgb(255 253 248 / 94%);
		border: 1px solid var(--line);
		border-radius: 0.65rem;
	}
	.state.error {
		display: flex;
		align-items: center;
		justify-content: space-between;
		color: #8a4b27;
	}
	@media (max-width: 42rem) {
		form {
			flex-wrap: wrap;
		}
		form input {
			flex-basis: 100%;
		}
		.result-heading {
			align-items: flex-start;
			flex-direction: column;
		}
		.resource-list a {
			grid-template-columns: 3.4rem minmax(0, 1fr);
		}
		.resource-list img,
		.resource-list i {
			width: 3.4rem;
			height: 3.4rem;
		}
		.resource-list b {
			display: none;
		}
	}
</style>
