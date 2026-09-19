<script lang="ts">
	import { onMount } from 'svelte';
	import { getLocale } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages';
	import { mediaPreviewUrl } from '$lib/media/capability';
	import { localizedText } from '$lib/resources/model';
	import { loadRecentResourceCards, searchProjectResourceCards } from '$lib/resources/client';
	import type { ResourceCard } from '$lib/resources/types';

	interface Props {
		project: string;
		onselect: (asset: ResourceCard) => void;
		onclose: () => void;
	}

	let { project, onselect, onclose }: Props = $props();
	let query = $state('');
	let results = $state<ResourceCard[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let searchGeneration = $state(0);
	let searchInput = $state<HTMLInputElement>();

	onMount(() => searchInput?.focus());

	$effect(() => {
		const requestedProject = project;
		let cancelled = false;
		loading = true;
		error = null;
		void loadRecentResourceCards(requestedProject, 24)
			.then((cards) => {
				if (!cancelled) results = cards.filter(({ media }) => media !== null);
			})
			.catch((reason: unknown) => {
				if (!cancelled) error = reason instanceof Error ? reason.message : m.asset_picker_error();
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
		const normalizedQuery = query.trim();
		if (!normalizedQuery || loading) return;
		const generation = ++searchGeneration;
		loading = true;
		error = null;
		try {
			const cards = await searchProjectResourceCards(project, normalizedQuery, 48);
			if (generation === searchGeneration) results = cards.filter(({ media }) => media !== null);
		} catch (reason: unknown) {
			if (generation === searchGeneration) {
				error = reason instanceof Error ? reason.message : m.asset_picker_error();
			}
		} finally {
			if (generation === searchGeneration) loading = false;
		}
	}

	function title(card: ResourceCard): string {
		return localizedText(card.resource['schema:name'], getLocale()) ?? m.story_asset_untitled();
	}

	function classLabel(card: ResourceCard): string {
		return localizedText(card.classLabels, getLocale()) ?? card.resource.resclass;
	}

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') onclose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	class="picker-backdrop"
	role="presentation"
	onclick={(event) => event.target === event.currentTarget && onclose()}
>
	<div class="picker" role="dialog" aria-modal="true" aria-labelledby="asset-picker-title">
		<header>
			<div>
				<p>{m.asset_picker_kicker()}</p>
				<h2 id="asset-picker-title">{m.asset_picker_title()}</h2>
				<span>{m.asset_picker_intro()}</span>
			</div>
			<button type="button" class="close" onclick={onclose} aria-label={m.asset_picker_close()}
				>×</button
			>
		</header>

		<form role="search" onsubmit={search}>
			<input
				bind:this={searchInput}
				bind:value={query}
				type="search"
				placeholder={m.asset_picker_placeholder()}
				aria-label={m.asset_picker_search_label()}
			/>
			<button type="submit" disabled={!query.trim() || loading}>{m.search_submit()}</button>
		</form>

		<div class="result-heading">
			<strong>{query.trim() ? m.asset_picker_results() : m.asset_picker_recent()}</strong>
			<small>{m.asset_picker_images_only()}</small>
		</div>

		<div class="results">
			{#if loading}
				<p class="state" role="status">{m.asset_picker_loading()}</p>
			{:else if error}
				<p class="state error" role="alert">{error}</p>
			{:else if results.length}
				{#each results as card (card.resource.iri)}
					<button type="button" class="asset" onclick={() => onselect(card)}>
						<img src={mediaPreviewUrl(card.media!)} alt="" />
						<span>
							<small>{classLabel(card)}</small>
							<strong>{title(card)}</strong>
						</span>
						<b aria-hidden="true">+</b>
					</button>
				{/each}
			{:else}
				<p class="state">{m.asset_picker_empty()}</p>
			{/if}
		</div>
	</div>
</div>

<style>
	.picker-backdrop {
		position: fixed;
		z-index: 100;
		inset: 0;
		display: grid;
		place-items: center;
		padding: 1rem;
		background: rgb(5 20 33 / 64%);
		backdrop-filter: blur(3px);
	}
	.picker {
		display: grid;
		grid-template-rows: auto auto auto minmax(0, 1fr);
		width: min(58rem, 100%);
		max-height: min(50rem, calc(100vh - 2rem));
		overflow: hidden;
		background: var(--paper);
		border: 1px solid #bfc8ce;
		border-radius: 0.8rem;
		box-shadow: 0 22px 70px rgb(0 0 0 / 30%);
	}
	.picker > header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 2rem;
		padding: 1.3rem 1.4rem 1rem;
	}
	.picker header p {
		margin: 0 0 0.3rem;
		color: var(--copper-dark);
		font-size: 0.63rem;
		font-weight: 760;
		letter-spacing: 0.13em;
		text-transform: uppercase;
	}
	h2 {
		margin: 0;
		color: var(--navy);
		font-family: Georgia, serif;
		font-size: clamp(1.7rem, 4vw, 2.6rem);
		font-weight: 500;
	}
	.picker header span {
		display: block;
		max-width: 42rem;
		margin-top: 0.45rem;
		color: var(--muted);
		font-size: 0.76rem;
		line-height: 1.5;
	}
	.close {
		width: 2.25rem;
		height: 2.25rem;
		padding: 0;
		color: var(--muted);
		background: transparent;
		border: 1px solid var(--line);
		border-radius: 50%;
		font-size: 1.3rem;
		cursor: pointer;
	}
	form {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0.55rem;
		padding: 0 1.4rem 1rem;
	}
	form input {
		min-width: 0;
		padding: 0.72rem 0.8rem;
		color: var(--navy);
		background: white;
		border: 1px solid var(--line);
		border-radius: 0.48rem;
		font-size: 0.82rem;
	}
	form input:focus {
		border-color: var(--teal);
		outline: 2px solid rgb(25 148 143 / 15%);
	}
	form button {
		padding: 0.65rem 1rem;
		color: white;
		background: var(--copper);
		border: 0;
		border-radius: 0.48rem;
		font-size: 0.72rem;
		font-weight: 720;
	}
	form button:disabled {
		opacity: 0.45;
	}
	.result-heading {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.75rem 1.4rem;
		border-top: 1px solid var(--line);
		border-bottom: 1px solid var(--line);
	}
	.result-heading strong {
		color: var(--navy);
		font-size: 0.72rem;
	}
	.result-heading small {
		color: var(--muted);
		font-size: 0.62rem;
	}
	.results {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.7rem;
		padding: 1rem 1.4rem 1.4rem;
		overflow-y: auto;
	}
	.asset {
		display: grid;
		grid-template-columns: 5.4rem minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.7rem;
		min-width: 0;
		padding: 0.55rem;
		color: inherit;
		background: white;
		border: 1px solid var(--line);
		border-radius: 0.55rem;
		text-align: left;
		cursor: pointer;
	}
	.asset:hover,
	.asset:focus-visible {
		border-color: var(--teal);
		outline: none;
		box-shadow: 0 4px 14px rgb(17 44 70 / 9%);
	}
	.asset img {
		display: block;
		width: 5.4rem;
		height: 4.2rem;
		object-fit: cover;
		background: var(--navy);
		border-radius: 0.35rem;
	}
	.asset span {
		display: grid;
		gap: 0.2rem;
		min-width: 0;
	}
	.asset small,
	.asset strong {
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.asset small {
		color: var(--copper-dark);
		font-size: 0.58rem;
		font-weight: 700;
		white-space: nowrap;
	}
	.asset strong {
		color: var(--navy);
		font-family: Georgia, serif;
		font-size: 0.82rem;
		font-weight: 500;
		line-height: 1.25;
	}
	.asset b {
		display: grid;
		place-items: center;
		width: 1.55rem;
		height: 1.55rem;
		color: white;
		background: var(--teal);
		border-radius: 50%;
	}
	.state {
		grid-column: 1 / -1;
		margin: 0;
		padding: 1.4rem;
		color: var(--muted);
		background: #f5f1e9;
		border-radius: 0.5rem;
		font-size: 0.75rem;
		text-align: center;
	}
	.state.error {
		color: #8a4b27;
		background: #fbefe6;
	}
	@media (max-width: 62rem) {
		.results {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 42rem) {
		.picker-backdrop {
			padding: 0;
		}
		.picker {
			width: 100%;
			height: 100vh;
			max-height: none;
			border-radius: 0;
		}
		.results {
			grid-template-columns: 1fr;
		}
	}
</style>
