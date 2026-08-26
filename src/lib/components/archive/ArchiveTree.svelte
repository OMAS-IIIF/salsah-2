<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import { mediaPreviewUrl } from '$lib/media/capability';
	import { m } from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import { projectResourcePath } from '$lib/projects/context';
	import { loadArchiveMedia, searchArchiveUnits } from '$lib/resources/client';
	import { fallbackLabel, localizedText } from '$lib/resources/model';
	import type { ArchiveTreeMedia, ArchiveTreeUnit } from '$lib/resources/types';

	interface Props {
		project: string;
	}

	type VisibleEntry =
		| { kind: 'unit'; unit: ArchiveTreeUnit; depth: number }
		| { kind: 'media'; media: ArchiveTreeMedia; parentIri: string; depth: number };

	let { project }: Props = $props();
	let roots = $state<ArchiveTreeUnit[]>([]);
	let children = new SvelteMap<string, ArchiveTreeUnit[]>();
	let mediaChildren = new SvelteMap<string, ArchiveTreeMedia[]>();
	let expanded = new SvelteSet<string>();
	let loadingChildren = new SvelteSet<string>();
	let childErrors = new SvelteSet<string>();
	let failedPreviews = new SvelteSet<string>();
	let loading = $state(true);
	let error = $state(false);
	let reloadGeneration = $state(0);

	let visibleEntries = $derived.by(() => {
		const visible: VisibleEntry[] = [];
		function append(units: ArchiveTreeUnit[], depth: number): void {
			for (const unit of units) {
				visible.push({ kind: 'unit', unit, depth });
				if (!expanded.has(unit.iri)) continue;
				append(children.get(unit.iri) ?? [], depth + 1);
				for (const media of mediaChildren.get(unit.iri) ?? []) {
					visible.push({ kind: 'media', media, parentIri: unit.iri, depth: depth + 1 });
				}
			}
		}
		append(roots, 1);
		return visible;
	});

	$effect(() => {
		const requestedProject = project;
		const requestedGeneration = reloadGeneration;
		loading = true;
		error = false;
		roots = [];
		children.clear();
		mediaChildren.clear();
		expanded.clear();
		loadingChildren.clear();
		childErrors.clear();
		failedPreviews.clear();
		void searchArchiveUnits(requestedProject, null)
			.then((result) => {
				if (requestedProject === project && requestedGeneration === reloadGeneration)
					roots = result;
			})
			.catch(() => {
				if (requestedProject === project && requestedGeneration === reloadGeneration) error = true;
			})
			.finally(() => {
				if (requestedProject === project && requestedGeneration === reloadGeneration)
					loading = false;
			});
	});

	function title(unit: ArchiveTreeUnit): string {
		return localizedText(unit.title, getLocale()) ?? fallbackLabel(unit.iri);
	}

	function mediaTitle(media: ArchiveTreeMedia): string {
		return localizedText(media.title, getLocale()) ?? fallbackLabel(media.iri);
	}

	function loadedContentCount(unit: ArchiveTreeUnit): number | null {
		if (!children.has(unit.iri) || !mediaChildren.has(unit.iri)) return null;
		return (children.get(unit.iri)?.length ?? 0) + (mediaChildren.get(unit.iri)?.length ?? 0);
	}

	function preview(media: ArchiveTreeMedia): string | null {
		return media.media && !failedPreviews.has(media.iri) ? mediaPreviewUrl(media.media) : null;
	}

	function level(unit: ArchiveTreeUnit): string {
		const labels: Record<string, () => string> = {
			'shared:ArchiveGroup': m.archive_level_archive_group,
			'shared:Fonds': m.archive_level_fonds,
			'shared:Subfonds': m.archive_level_subfonds,
			'shared:Series': m.archive_level_series,
			'shared:Subseries': m.archive_level_subseries,
			'shared:File': m.archive_level_file,
			'shared:Item': m.archive_level_item
		};
		return unit.archiveLevel
			? (labels[unit.archiveLevel]?.() ?? fallbackLabel(unit.archiveLevel))
			: m.archive_level_unknown();
	}

	async function toggle(unit: ArchiveTreeUnit): Promise<void> {
		if (expanded.has(unit.iri)) {
			expanded.delete(unit.iri);
			return;
		}
		if (loadedContentCount(unit) !== null) {
			expanded.add(unit.iri);
			return;
		}
		loadingChildren.add(unit.iri);
		childErrors.delete(unit.iri);
		try {
			const [archiveUnits, media] = await Promise.all([
				searchArchiveUnits(project, unit.iri),
				loadArchiveMedia(project, unit.mediaIris)
			]);
			children.set(unit.iri, archiveUnits);
			mediaChildren.set(unit.iri, media);
			if (archiveUnits.length || media.length) expanded.add(unit.iri);
		} catch {
			childErrors.add(unit.iri);
		} finally {
			loadingChildren.delete(unit.iri);
		}
	}

	function retry(): void {
		reloadGeneration += 1;
	}
</script>

<div class="archive-page">
	<header>
		<p>{m.archive_page_kicker()}</p>
		<h1>{m.archive_page_title()}</h1>
		<span>{m.archive_page_intro()}</span>
	</header>

	<section class="tree-panel" aria-labelledby="archive-tree-title" aria-busy={loading}>
		<div class="panel-heading">
			<div>
				<p>{m.archive_tree_kicker()}</p>
				<h2 id="archive-tree-title">{m.archive_tree_title()}</h2>
			</div>
			<small>{m.archive_live_source()}</small>
		</div>

		{#if loading}
			<div class="state" role="status"><i></i>{m.archive_loading()}</div>
		{:else if error}
			<div class="state error" role="alert">
				<span>{m.archive_error()}</span>
				<button type="button" onclick={retry}>{m.resource_retry()}</button>
			</div>
		{:else if roots.length === 0}
			<div class="state empty">
				<strong>{m.archive_empty_title()}</strong>
				<span>{m.archive_empty_text()}</span>
			</div>
		{:else}
			<ul class="tree" role="tree" aria-label={m.archive_tree_title()}>
				{#each visibleEntries as entry (`${entry.kind}:${entry.kind === 'unit' ? entry.unit.iri : `${entry.parentIri}:${entry.media.iri}`}`)}
					{#if entry.kind === 'unit'}
						<li
							role="treeitem"
							aria-selected="false"
							aria-level={entry.depth}
							aria-expanded={loadedContentCount(entry.unit) === 0
								? undefined
								: expanded.has(entry.unit.iri)}
							style={`--tree-depth: ${entry.depth - 1}`}
						>
							<button
								class="toggle"
								type="button"
								onclick={() => toggle(entry.unit)}
								aria-label={expanded.has(entry.unit.iri)
									? m.archive_collapse({ title: title(entry.unit) })
									: m.archive_expand({ title: title(entry.unit) })}
							>
								{#if loadingChildren.has(entry.unit.iri)}
									<i class="mini-spinner"></i>
								{:else if loadedContentCount(entry.unit) === 0}
									<span class="leaf" aria-hidden="true">·</span>
								{:else}
									<span aria-hidden="true">{expanded.has(entry.unit.iri) ? '⌄' : '›'}</span>
								{/if}
							</button>
							<span class="folder" aria-hidden="true"><i></i></span>
							<a href={resolve(projectResourcePath(project, entry.unit.iri) as Pathname)}>
								<strong>{title(entry.unit)}</strong>
								<code>{entry.unit.iri}</code>
							</a>
							<span class="level">{level(entry.unit)}</span>
							{#if childErrors.has(entry.unit.iri)}
								<span class="child-error">{m.archive_children_error()}</span>
							{/if}
						</li>
					{:else}
						<li
							class="media-row"
							role="treeitem"
							aria-selected="false"
							aria-level={entry.depth}
							style={`--tree-depth: ${entry.depth - 1}`}
						>
							<span class="media-leaf" aria-hidden="true">·</span>
							<a
								class="media-link"
								href={resolve(projectResourcePath(project, entry.media.iri) as Pathname)}
							>
								<span class="thumbnail">
									{#if preview(entry.media)}
										<img
											src={preview(entry.media) ?? ''}
											alt=""
											loading="lazy"
											onerror={() => failedPreviews.add(entry.media.iri)}
										/>
									{:else}
										<span aria-hidden="true">▧</span>
									{/if}
								</span>
								<span class="media-summary">
									<strong>{mediaTitle(entry.media)}</strong>
									<code>{entry.media.iri}</code>
								</span>
							</a>
							<span class="media-kind">{m.archive_media_object()}</span>
						</li>
					{/if}
				{/each}
			</ul>
		{/if}
	</section>
</div>

<style>
	.archive-page {
		max-width: 112rem;
		margin: auto;
		padding: clamp(1.8rem, 4vw, 3.2rem) clamp(1.1rem, 3vw, 3.5rem) 4rem;
	}
	header {
		max-width: 58rem;
		margin-bottom: 2rem;
	}
	header p,
	.panel-heading p {
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
		max-width: 48rem;
		margin-top: 0.75rem;
		color: var(--muted);
		font-size: clamp(0.9rem, 1.5vw, 1.05rem);
		line-height: 1.55;
	}
	.tree-panel {
		overflow: hidden;
		background: rgb(255 253 248 / 96%);
		border: 1px solid var(--line);
		border-radius: 0.9rem;
		box-shadow: 0 4px 18px rgb(17 44 70 / 5%);
	}
	.panel-heading {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.35rem 1.5rem 1.15rem;
		border-top: 0.28rem solid var(--teal);
	}
	.panel-heading h2 {
		font-size: clamp(1.4rem, 2.2vw, 1.8rem);
	}
	.panel-heading small {
		padding: 0.38rem 0.6rem;
		color: #087f7b;
		background: #e6f4f1;
		border-radius: 999px;
		font-size: 0.65rem;
		font-weight: 750;
	}
	.tree {
		margin: 0;
		padding: 0;
		border-top: 1px solid #e8e3da;
		list-style: none;
	}
	.tree li {
		display: grid;
		grid-template-columns: 1.8rem 3.5rem minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.7rem;
		min-height: 5rem;
		padding: 0.65rem 1.2rem 0.65rem calc(1rem + var(--tree-depth) * 2rem);
		border-bottom: 1px solid #e8e3da;
	}
	.tree li:last-child {
		border-bottom: 0;
	}
	.tree li:hover {
		background: #f8f6f0;
	}
	.tree li.media-row {
		min-height: 5.6rem;
		background: #fbfcf9;
	}
	.toggle {
		display: grid;
		place-items: center;
		width: 1.8rem;
		height: 1.8rem;
		padding: 0;
		color: var(--teal);
		background: transparent;
		border: 0;
		border-radius: 50%;
		font-size: 1.3rem;
		cursor: pointer;
	}
	.toggle:hover,
	.toggle:focus-visible {
		background: #e6f4f1;
		outline: none;
	}
	.leaf {
		color: #a8b0b3;
	}
	.media-leaf {
		display: grid;
		place-items: center;
		color: #a8b0b3;
		font-size: 1.3rem;
	}
	.folder {
		position: relative;
		display: block;
		width: 2rem;
		height: 1.45rem;
		margin-top: 0.25rem;
		background: #d8a472;
		border-radius: 0.18rem;
	}
	.folder i {
		position: absolute;
		top: -0.32rem;
		left: 0.16rem;
		width: 0.82rem;
		height: 0.42rem;
		background: #d8a472;
		border-radius: 0.16rem 0.16rem 0 0;
	}
	.tree a {
		display: grid;
		min-width: 0;
		gap: 0.22rem;
		text-decoration: none;
	}
	.tree a.media-link {
		grid-column: 2 / 4;
		grid-template-columns: 3.5rem minmax(0, 1fr);
		align-items: center;
		gap: 0.8rem;
	}
	.thumbnail {
		display: grid;
		place-items: center;
		width: 3.5rem;
		height: 3.5rem;
		overflow: hidden;
		color: #71808b;
		background: #e8ebe7;
		border: 1px solid #d8ddd8;
		border-radius: 0.35rem;
		font-size: 1.5rem;
	}
	.thumbnail img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.media-summary {
		display: grid;
		min-width: 0;
		gap: 0.22rem;
	}
	.tree a:hover strong,
	.tree a:focus-visible strong {
		color: var(--teal);
	}
	.tree strong {
		overflow: hidden;
		color: var(--navy);
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 1rem;
		font-weight: 600;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.tree code {
		overflow: hidden;
		color: var(--muted);
		font-family: inherit;
		font-size: 0.66rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.level {
		padding: 0.3rem 0.55rem;
		color: var(--copper-dark);
		background: #faf0e7;
		border-radius: 999px;
		font-size: 0.65rem;
		font-weight: 750;
	}
	.media-kind {
		padding: 0.3rem 0.55rem;
		color: #087f7b;
		background: #e6f4f1;
		border-radius: 999px;
		font-size: 0.65rem;
		font-weight: 750;
	}
	.child-error {
		grid-column: 3 / -1;
		color: #8e3d2d;
		font-size: 0.68rem;
	}
	.state {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		min-height: 9rem;
		padding: 1.4rem 1.5rem;
		color: var(--muted);
		border-top: 1px solid #e8e3da;
		font-size: 0.82rem;
	}
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
	.state i,
	.mini-spinner {
		width: 1rem;
		height: 1rem;
		border: 2px solid #cbd7d4;
		border-top-color: var(--teal);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	.mini-spinner {
		width: 0.75rem;
		height: 0.75rem;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	@media (max-width: 42rem) {
		.panel-heading {
			padding: 1.2rem;
		}
		.tree li {
			grid-template-columns: 1.6rem 2.7rem minmax(0, 1fr);
			gap: 0.5rem;
			padding-right: 0.8rem;
			padding-left: calc(0.55rem + var(--tree-depth) * 1rem);
		}
		.folder {
			width: 1.65rem;
			height: 1.2rem;
		}
		.level {
			grid-column: 3;
			justify-self: start;
		}
		.tree a.media-link {
			grid-column: 2 / -1;
			grid-template-columns: 2.7rem minmax(0, 1fr);
		}
		.thumbnail {
			width: 2.7rem;
			height: 2.7rem;
		}
		.media-kind {
			grid-column: 3;
			justify-self: start;
		}
	}
</style>
