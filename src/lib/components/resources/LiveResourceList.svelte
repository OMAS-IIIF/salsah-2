<script lang="ts">
	import ResourceCardGrid from '$lib/components/resources/ResourceCardGrid.svelte';
	import { m } from '$lib/paraglide/messages';
	import { loadRecentResourceCards } from '$lib/resources/client';
	import type { ResourceCard } from '$lib/resources/types';

	interface Props {
		project: string;
	}

	let { project }: Props = $props();
	let cards = $state<ResourceCard[]>([]);
	let loading = $state(true);
	let error = $state(false);
	let reloadGeneration = $state(0);
	function reload(): void {
		reloadGeneration += 1;
	}

	$effect(() => {
		const requestedProject = project;
		const requestedGeneration = reloadGeneration;
		loading = true;
		error = false;
		void loadRecentResourceCards(requestedProject)
			.then((result) => {
				if (requestedProject === project && requestedGeneration === reloadGeneration)
					cards = result;
			})
			.catch(() => {
				if (requestedProject === project && requestedGeneration === reloadGeneration) {
					cards = [];
					error = true;
				}
			})
			.finally(() => {
				if (requestedProject === project && requestedGeneration === reloadGeneration)
					loading = false;
			});
	});
</script>

<section class="live-panel" aria-labelledby="live-resource-title">
	<header>
		<div>
			<p>{m.live_resources_kicker()}</p>
			<h2 id="live-resource-title">{m.live_resources_title()}</h2>
			<span class="intro">{m.live_resources_intro()}</span>
		</div>
		<small>{m.live_resources_source()}</small>
	</header>

	{#if loading}
		<div class="state" role="status"><i></i>{m.live_resources_loading()}</div>
	{:else if error}
		<div class="state error" role="alert">
			<span>{m.live_resources_error()}</span>
			<button type="button" onclick={reload}>{m.resource_retry()}</button>
		</div>
	{:else if cards.length === 0}
		<p class="state empty">{m.live_resources_empty()}</p>
	{:else}
		<ResourceCardGrid {project} {cards} />
	{/if}
</section>

<style>
	.live-panel {
		overflow: hidden;
		background: rgb(255 253 248 / 96%);
		border: 1px solid var(--line);
		border-radius: 0.9rem;
		box-shadow: 0 4px 18px rgb(17 44 70 / 5%);
	}
	header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1.5rem;
		padding: 1.4rem 1.5rem 1.2rem;
		border-top: 0.28rem solid var(--teal);
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
		font-size: clamp(1.4rem, 2.2vw, 1.8rem);
		font-weight: 500;
	}
	.intro {
		display: block;
		max-width: 44rem;
		margin-top: 0.45rem;
		color: var(--muted);
		font-size: 0.8rem;
		line-height: 1.5;
	}
	header > small {
		flex: 0 0 auto;
		padding: 0.38rem 0.6rem;
		color: #087f7b;
		background: #e6f4f1;
		border-radius: 999px;
		font-size: 0.65rem;
		font-weight: 750;
	}
	.state {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		min-height: 7rem;
		margin: 0;
		padding: 1.2rem 1.5rem;
		color: var(--muted);
		border-top: 1px solid #e8e3da;
		font-size: 0.8rem;
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
		header {
			padding: 1.2rem;
		}
		header > small {
			white-space: nowrap;
		}
	}
</style>
