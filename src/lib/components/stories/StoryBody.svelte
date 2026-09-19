<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { getLocale } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages';
	import { mediaPreviewUrl } from '$lib/media/capability';
	import { projectResourcePath } from '$lib/projects/context';
	import { loadStoryAssets } from '$lib/resources/client';
	import { localizedText } from '$lib/resources/model';
	import type { StoryAsset } from '$lib/resources/types';
	import { parseStoryMarkdown, storyAssetIris } from '$lib/stories/markdown';

	interface Props {
		project: string;
		markdown: string;
	}

	let { project, markdown }: Props = $props();
	let assets = $state<StoryAsset[]>([]);
	let assetsLoading = $state(false);
	let assetLoadFailed = $state(false);
	let nodes = $derived(parseStoryMarkdown(markdown));
	let requestedIris = $derived(storyAssetIris(nodes));
	let requestedIriKey = $derived(JSON.stringify(requestedIris));
	let assetsByIri = $derived(new Map(assets.map((asset) => [asset.iri, asset])));

	$effect(() => {
		const requestedProject = project;
		const requestedAssets = JSON.parse(requestedIriKey) as string[];
		let cancelled = false;
		assets = [];
		assetLoadFailed = false;
		if (!requestedAssets.length) {
			assetsLoading = false;
			return;
		}
		assetsLoading = true;
		void loadStoryAssets(requestedProject, requestedAssets)
			.then((result) => {
				if (!cancelled) assets = result;
			})
			.catch(() => {
				if (!cancelled) assetLoadFailed = true;
			})
			.finally(() => {
				if (!cancelled) assetsLoading = false;
			});

		return () => {
			cancelled = true;
		};
	});

	function assetTitle(asset: StoryAsset): string {
		return localizedText(asset.title, getLocale()) ?? m.story_asset_untitled();
	}
</script>

<article class="story-body">
	{#each nodes as node, index (`story-node-${index}`)}
		{#if node.kind === 'html'}
			<!-- HTML is generated from Markdown with rehype-sanitize in parseStoryMarkdown. -->
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			<div class="story-prose">{@html node.html}</div>
		{:else if node.kind === 'invalid-asset'}
			<aside class="asset-message invalid" role="note">{m.story_asset_invalid()}</aside>
		{:else if assetsLoading}
			<div class="asset-message" role="status">{m.story_asset_loading()}</div>
		{:else if assetsByIri.get(node.iri) && assetsByIri.get(node.iri)?.media}
			{@const asset = assetsByIri.get(node.iri) as StoryAsset}
			<a
				class="story-asset"
				href={resolve(projectResourcePath(project, asset.iri) as Pathname)}
				aria-label={m.story_asset_open({ title: assetTitle(asset) })}
			>
				<figure>
					<img src={mediaPreviewUrl(asset.media!)} alt={assetTitle(asset)} />
					<figcaption>
						<strong>{node.caption ?? assetTitle(asset)}</strong>
						<span>{m.story_asset_open_hint()}</span>
					</figcaption>
				</figure>
			</a>
		{:else}
			<aside class="asset-message unavailable" role="note">
				<strong>{node.caption ?? m.story_asset_unavailable_title()}</strong>
				<span>
					{assetLoadFailed ? m.story_asset_load_error() : m.story_asset_unavailable()}
				</span>
			</aside>
		{/if}
	{/each}
</article>

<style>
	.story-body {
		display: grid;
		gap: 1.4rem;
		padding: clamp(1.5rem, 4vw, 3.25rem);
		background: rgb(255 253 248 / 96%);
		border: 1px solid var(--line);
		border-radius: 0.7rem;
		box-shadow: 0 3px 16px rgb(17 44 70 / 4%);
	}
	.story-prose {
		max-width: 47rem;
		color: var(--ink);
		font-family: Georgia, 'Times New Roman', serif;
		font-size: clamp(1rem, 1.3vw, 1.12rem);
		line-height: 1.78;
	}
	.story-prose :global(*:first-child) {
		margin-top: 0;
	}
	.story-prose :global(*:last-child) {
		margin-bottom: 0;
	}
	.story-prose :global(h2),
	.story-prose :global(h3) {
		margin: 2rem 0 0.7rem;
		color: var(--navy);
		font-weight: 500;
		line-height: 1.2;
	}
	.story-prose :global(h2) {
		font-size: clamp(1.55rem, 3vw, 2.25rem);
	}
	.story-prose :global(h3) {
		font-size: 1.3rem;
	}
	.story-prose :global(p),
	.story-prose :global(ul),
	.story-prose :global(ol),
	.story-prose :global(blockquote) {
		margin: 0 0 1rem;
	}
	.story-prose :global(a) {
		color: var(--teal);
	}
	.story-prose :global(blockquote) {
		padding-left: 1rem;
		color: var(--muted);
		border-left: 3px solid var(--copper);
	}
	.story-asset {
		display: block;
		max-width: 62rem;
		color: inherit;
		text-decoration: none;
	}
	.story-asset figure {
		margin: 0;
		overflow: hidden;
		background: #0c263d;
		border: 1px solid #203f58;
		border-radius: 0.65rem;
		box-shadow: 0 8px 24px rgb(17 44 70 / 14%);
		transition:
			transform 150ms ease,
			box-shadow 150ms ease;
	}
	.story-asset:hover figure {
		transform: translateY(-2px);
		box-shadow: 0 11px 30px rgb(17 44 70 / 20%);
	}
	.story-asset img {
		display: block;
		width: 100%;
		max-height: 68vh;
		object-fit: contain;
	}
	.story-asset figcaption {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.8rem 1rem;
		color: #f8f3e9;
		background: #112c46;
	}
	.story-asset figcaption strong {
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 0.9rem;
		font-weight: 500;
	}
	.story-asset figcaption span {
		color: #b8c7d2;
		font-size: 0.64rem;
		white-space: nowrap;
	}
	.asset-message {
		max-width: 47rem;
		padding: 1rem 1.1rem;
		color: var(--muted);
		background: #f5f1e9;
		border: 1px dashed #cfc7ba;
		border-radius: 0.55rem;
		font-size: 0.78rem;
	}
	.asset-message strong,
	.asset-message span {
		display: block;
	}
	.asset-message strong {
		margin-bottom: 0.25rem;
		color: var(--navy);
	}
	.asset-message.invalid {
		color: #8a4b27;
		background: #fbefe6;
		border-color: #d6a984;
	}
	@media (max-width: 42rem) {
		.story-body {
			padding: 1.2rem;
		}
		.story-asset figcaption {
			align-items: flex-start;
			flex-direction: column;
			gap: 0.25rem;
		}
	}
</style>
