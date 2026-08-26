<script lang="ts">
	import type { Pathname } from '$app/types';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ResourceCardGrid from '$lib/components/resources/ResourceCardGrid.svelte';
	import { m } from '$lib/paraglide/messages';
	import { projectSearchPath } from '$lib/projects/context';
	import { searchProjectResourceCards } from '$lib/resources/client';
	import type { ResourceCard } from '$lib/resources/types';

	/**
	 * Own the project-bound query draft and asynchronous OLDAP result states.
	 * The canonical query remains in the route so searches are deep-linkable.
	 */
	interface Props {
		project: string;
		query: string;
	}

	let { project, query }: Props = $props();
	let draft = $derived(query);
	let cards = $state<ResourceCard[]>([]);
	let loading = $state(false);
	let error = $state(false);
	let reloadGeneration = $state(0);

	$effect(() => {
		const requestedProject = project;
		const requestedQuery = query.trim();
		const requestedGeneration = reloadGeneration;
		if (!requestedQuery) {
			cards = [];
			loading = false;
			error = false;
			return;
		}
		loading = true;
		error = false;
		void searchProjectResourceCards(requestedProject, requestedQuery)
			.then((result) => {
				if (
					requestedProject === project &&
					requestedQuery === query.trim() &&
					requestedGeneration === reloadGeneration
				) {
					cards = result;
				}
			})
			.catch(() => {
				if (
					requestedProject === project &&
					requestedQuery === query.trim() &&
					requestedGeneration === reloadGeneration
				) {
					cards = [];
					error = true;
				}
			})
			.finally(() => {
				if (
					requestedProject === project &&
					requestedQuery === query.trim() &&
					requestedGeneration === reloadGeneration
				) {
					loading = false;
				}
			});
	});

	async function submitSearch(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		await goto(resolve(projectSearchPath(project, draft) as Pathname));
	}
</script>

<div class="search-page">
	<header>
		<p>{m.search_page_kicker()}</p>
		<h1>{m.search_page_title()}</h1>
		<span>{m.search_page_intro()}</span>
	</header>

	<form role="search" onsubmit={submitSearch}>
		<span aria-hidden="true">⌕</span>
		<input
			bind:value={draft}
			type="search"
			aria-label={m.search_label()}
			placeholder={m.search_placeholder()}
		/>
		<button type="submit">{m.search_submit()}</button>
	</form>

	<section class="results" aria-live="polite" aria-busy={loading}>
		{#if !query.trim()}
			<div class="state initial">
				<strong>{m.search_initial_title()}</strong>
				<span>{m.search_initial_text()}</span>
			</div>
		{:else if loading}
			<div class="state loading" role="status">
				<i></i>{m.search_loading({ query: query.trim() })}
			</div>
		{:else if error}
			<div class="state error" role="alert">
				<span>{m.search_error()}</span>
				<button type="button" onclick={() => (reloadGeneration += 1)}>{m.resource_retry()}</button>
			</div>
		{:else if cards.length === 0}
			<div class="state empty">
				<strong>{m.search_empty_title({ query: query.trim() })}</strong>
				<span>{m.search_empty_text()}</span>
			</div>
		{:else}
			<div class="result-heading">
				<h2>{m.search_results_title({ query: query.trim() })}</h2>
				<span>{m.search_results_count({ count: cards.length })}</span>
			</div>
			<ResourceCardGrid {project} {cards} />
		{/if}
	</section>
</div>

<style>
	.search-page {
		max-width: 112rem;
		margin: auto;
		padding: clamp(1.8rem, 4vw, 3.2rem) clamp(1.1rem, 3vw, 3.5rem) 4rem;
	}
	header {
		max-width: 54rem;
	}
	header p {
		margin: 0 0 0.45rem;
		color: var(--copper-dark);
		font-size: 0.68rem;
		font-weight: 750;
		letter-spacing: 0.13em;
		text-transform: uppercase;
	}
	h1,
	h2 {
		margin: 0;
		color: var(--navy);
		font-family: Georgia, 'Times New Roman', serif;
		font-weight: 500;
	}
	h1 {
		font-size: clamp(2.2rem, 5vw, 4rem);
		letter-spacing: -0.04em;
		line-height: 1.03;
	}
	header > span {
		display: block;
		max-width: 46rem;
		margin-top: 0.75rem;
		color: var(--muted);
		font-size: clamp(0.9rem, 1.5vw, 1.05rem);
		line-height: 1.55;
	}
	form {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		max-width: 58rem;
		min-height: 3.5rem;
		margin: 2rem 0;
		padding-left: 1rem;
		color: var(--muted);
		background: white;
		border: 1px solid var(--line);
		border-radius: 0.65rem;
		box-shadow: 0 4px 18px rgb(17 44 70 / 5%);
	}
	form:focus-within {
		border-color: var(--teal);
		box-shadow: 0 0 0 2px rgb(31 153 148 / 14%);
	}
	form input {
		min-width: 0;
		padding: 0.8rem;
		color: var(--ink);
		background: transparent;
		border: 0;
		font-size: 1rem;
		outline: none;
	}
	form button {
		align-self: stretch;
		padding: 0 1.2rem;
		color: white;
		background: var(--copper);
		border: 0;
		border-radius: 0 0.58rem 0.58rem 0;
		font-weight: 700;
	}
	.results {
		overflow: hidden;
		background: rgb(255 253 248 / 96%);
		border: 1px solid var(--line);
		border-top: 0.28rem solid var(--teal);
		border-radius: 0.9rem;
		box-shadow: 0 4px 18px rgb(17 44 70 / 5%);
	}
	.result-heading {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.3rem 1.5rem 1.1rem;
	}
	.result-heading h2 {
		font-size: clamp(1.25rem, 2vw, 1.65rem);
	}
	.result-heading span {
		flex: 0 0 auto;
		color: var(--teal);
		font-size: 0.72rem;
		font-weight: 750;
	}
	.state {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		min-height: 9rem;
		padding: 1.4rem 1.5rem;
		color: var(--muted);
		font-size: 0.82rem;
	}
	.state.initial,
	.state.empty {
		align-items: flex-start;
		flex-direction: column;
		justify-content: center;
	}
	.state strong {
		color: var(--navy);
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 1.2rem;
	}
	.state i {
		width: 1rem;
		height: 1rem;
		border: 2px solid #cbd7d4;
		border-top-color: var(--teal);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	.state.error {
		justify-content: space-between;
		color: #8e3d2d;
	}
	.state.error button {
		padding: 0.45rem 0.7rem;
		color: var(--navy);
		background: white;
		border: 1px solid var(--line);
		border-radius: 0.4rem;
		font-weight: 700;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	@media (max-width: 42rem) {
		form {
			grid-template-columns: auto minmax(0, 1fr);
			padding-left: 0.8rem;
		}
		form button {
			grid-column: 1 / -1;
			min-height: 2.8rem;
			border-radius: 0 0 0.58rem 0.58rem;
		}
		.result-heading {
			align-items: flex-start;
			flex-direction: column;
		}
	}
</style>
