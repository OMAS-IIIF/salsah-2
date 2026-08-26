<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { SvelteSet } from 'svelte/reactivity';
	import { mediaPreviewUrl } from '$lib/media/capability';
	import { projectResourcePath } from '$lib/projects/context';
	import { m } from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import { fallbackLabel, localizedText } from '$lib/resources/model';
	import type { ResourceCard } from '$lib/resources/types';

	/** Render ontology-labelled resources without knowing their project domain. */
	interface Props {
		project: string;
		cards: ResourceCard[];
	}

	let { project, cards }: Props = $props();
	let failedPreviews = new SvelteSet<string>();

	function title(card: ResourceCard): string {
		return (
			localizedText(card.resource['schema:name'], getLocale()) ?? fallbackLabel(card.resource.iri)
		);
	}

	function classLabel(card: ResourceCard): string {
		return localizedText(card.classLabels, getLocale()) ?? fallbackLabel(card.resource.resclass);
	}

	function previewUrl(card: ResourceCard): string | null {
		return card.media && !failedPreviews.has(card.resource.iri)
			? mediaPreviewUrl(card.media)
			: null;
	}
</script>

<div class="resource-grid">
	{#each cards as card (card.resource.iri)}
		<a href={resolve(projectResourcePath(project, card.resource.iri) as Pathname)}>
			<span class="preview">
				{#if previewUrl(card)}
					<img
						src={previewUrl(card) ?? ''}
						alt=""
						loading="lazy"
						onerror={() => failedPreviews.add(card.resource.iri)}
					/>
				{:else}
					<span class="document" aria-hidden="true"><i></i><i></i><i></i></span>
					<em>{m.live_resources_no_preview()}</em>
				{/if}
			</span>
			<span class="summary">
				<small>{classLabel(card)}</small>
				<strong>{title(card)}</strong>
				<code>{card.resource.iri}</code>
			</span>
			<b aria-hidden="true">→</b>
		</a>
	{/each}
</div>

<style>
	.resource-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 21rem));
		gap: 1rem;
		padding: 1.25rem 1.5rem 1.5rem;
		background: #f3f1eb;
		border-top: 1px solid #e8e3da;
	}
	.resource-grid a {
		position: relative;
		display: grid;
		grid-template-rows: 10.5rem minmax(6.5rem, auto);
		min-width: 0;
		overflow: hidden;
		color: inherit;
		background: var(--paper);
		border: 1px solid #ded9cf;
		border-radius: 0.65rem;
		box-shadow: 0 2px 8px rgb(17 44 70 / 4%);
		text-decoration: none;
	}
	.resource-grid a:hover,
	.resource-grid a:focus-visible {
		z-index: 1;
		box-shadow: 0 0 0 2px var(--teal) inset;
		outline: none;
	}
	.preview {
		position: relative;
		display: grid;
		place-items: center;
		overflow: hidden;
		color: #71808b;
		background: linear-gradient(145deg, rgb(17 44 70 / 6%), transparent 55%), #ecebe5;
	}
	.preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.preview em {
		margin-top: 3.8rem;
		font-size: 0.62rem;
		font-style: normal;
	}
	.document {
		position: absolute;
		top: 2.3rem;
		display: grid;
		align-content: center;
		gap: 0.3rem;
		width: 2.8rem;
		height: 3.45rem;
		padding: 0.65rem 0.48rem;
		background: var(--navy);
		border-radius: 0.25rem;
		box-shadow: 0 4px 10px rgb(17 44 70 / 15%);
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
		align-content: start;
		gap: 0.28rem;
		min-width: 0;
		padding: 1rem 2.8rem 1.1rem 1.1rem;
	}
	.summary small {
		color: var(--copper-dark);
		font-size: 0.61rem;
		font-weight: 750;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.summary strong {
		display: -webkit-box;
		overflow: hidden;
		color: var(--navy);
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 1rem;
		font-weight: 600;
		line-height: 1.3;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
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
		position: absolute;
		right: 1.15rem;
		bottom: 1.25rem;
		color: var(--teal);
	}
	@media (max-width: 42rem) {
		.resource-grid {
			padding: 0;
			background: var(--paper);
		}
		.resource-grid a {
			grid-template-columns: 7.5rem minmax(0, 1fr);
			grid-template-rows: minmax(7.5rem, auto);
			border: 0;
			border-radius: 0;
			box-shadow: none;
		}
		.summary {
			padding: 1rem 2.5rem 1rem 1rem;
		}
		.preview em {
			display: none;
		}
		.document {
			top: auto;
		}
	}
</style>
