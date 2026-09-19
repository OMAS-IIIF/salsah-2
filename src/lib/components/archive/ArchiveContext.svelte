<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import { projectArchivePath, projectResourcePath } from '$lib/projects/context';
	import { loadArchiveContexts } from '$lib/resources/client';
	import { fallbackLabel, localizedText } from '$lib/resources/model';
	import type {
		ArchiveContextPath,
		ArchivePathSegment,
		OldapResourceRecord
	} from '$lib/resources/types';

	interface Props {
		project: string;
		iri: string;
		record: OldapResourceRecord;
		isMediaObject: boolean;
	}

	let { project, iri, record, isMediaObject }: Props = $props();
	let paths = $state<ArchiveContextPath[]>([]);
	let loading = $state(true);
	let error = $state(false);
	let reloadGeneration = $state(0);
	let archiveCandidate = $derived(isMediaObject || record['shared:archiveLevel'] !== undefined);

	$effect(() => {
		const requestedProject = project;
		const requestedIri = iri;
		const requestedRecord = record;
		const requestedGeneration = reloadGeneration;
		if (!archiveCandidate) {
			loading = false;
			error = false;
			paths = [];
			return;
		}
		loading = true;
		error = false;
		paths = [];
		void loadArchiveContexts(requestedProject, requestedIri, requestedRecord)
			.then((result) => {
				if (
					requestedProject === project &&
					requestedIri === iri &&
					requestedGeneration === reloadGeneration
				) {
					paths = result;
				}
			})
			.catch(() => {
				if (
					requestedProject === project &&
					requestedIri === iri &&
					requestedGeneration === reloadGeneration
				) {
					error = true;
				}
			})
			.finally(() => {
				if (
					requestedProject === project &&
					requestedIri === iri &&
					requestedGeneration === reloadGeneration
				) {
					loading = false;
				}
			});
	});

	function title(segment: ArchivePathSegment): string {
		return localizedText(segment.title, getLocale()) ?? fallbackLabel(segment.iri);
	}
</script>

{#if paths.length || (archiveCandidate && (loading || error))}
	<section class="archive-context" aria-labelledby="archive-context-title" aria-busy={loading}>
		<div class="context-heading">
			<span class="archive-mark" aria-hidden="true">▤</span>
			<div>
				<p>{m.archive_context_kicker()}</p>
				<h2 id="archive-context-title">{m.archive_context_title()}</h2>
			</div>
			<a href={resolve(projectArchivePath(project) as Pathname)}>
				{m.archive_context_open_tree()}<span aria-hidden="true">→</span>
			</a>
		</div>

		{#if loading}
			<div class="context-state" role="status"><i></i>{m.archive_context_loading()}</div>
		{:else if error}
			<div class="context-state error" role="alert">
				<span>{m.archive_context_error()}</span>
				<button type="button" onclick={() => (reloadGeneration += 1)}>{m.resource_retry()}</button>
			</div>
		{:else}
			<div class="paths">
				{#each paths as path, pathIndex (`${pathIndex}:${path.segments.map(({ iri: segmentIri }) => segmentIri).join('|')}`)}
					<nav aria-label={m.archive_context_path({ number: pathIndex + 1 })}>
						{#if paths.length > 1}
							<small>{m.archive_context_placement({ number: pathIndex + 1 })}</small>
						{/if}
						<ol>
							{#each path.segments as segment (segment.iri)}
								<li>
									{#if segment.isCurrent}
										<span aria-current="page">{title(segment)}</span>
									{:else}
										<a href={resolve(projectResourcePath(project, segment.iri) as Pathname)}
											>{title(segment)}</a
										>
									{/if}
								</li>
							{/each}
						</ol>
					</nav>
				{/each}
			</div>
		{/if}
	</section>
{/if}

<style>
	.archive-context {
		margin-top: 1.5rem;
		overflow: hidden;
		background: rgb(255 253 248 / 94%);
		border: 1px solid var(--line);
		border-left: 0.28rem solid var(--teal);
		border-radius: 0.7rem;
		box-shadow: 0 3px 16px rgb(17 44 70 / 4%);
	}
	.context-heading {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.8rem;
		padding: 0.9rem 1rem;
	}
	.archive-mark {
		display: grid;
		place-items: center;
		width: 2.35rem;
		height: 2.35rem;
		color: white;
		background: var(--navy);
		border-radius: 0.4rem;
		font-size: 1.15rem;
	}
	.context-heading p {
		margin: 0 0 0.2rem;
		color: var(--copper-dark);
		font-size: 0.61rem;
		font-weight: 750;
		letter-spacing: 0.11em;
		text-transform: uppercase;
	}
	h2 {
		margin: 0;
		color: var(--navy);
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 1.05rem;
		font-weight: 600;
	}
	.context-heading > a {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--teal);
		font-size: 0.7rem;
		font-weight: 730;
		text-decoration: none;
	}
	.context-heading > a:hover {
		text-decoration: underline;
	}
	.paths,
	.context-state {
		padding: 0.8rem 1rem 1rem 4.15rem;
		border-top: 1px solid #e8e3da;
	}
	.paths {
		display: grid;
		gap: 0.7rem;
	}
	nav > small {
		display: block;
		margin-bottom: 0.35rem;
		color: var(--muted);
		font-size: 0.6rem;
		font-weight: 700;
		text-transform: uppercase;
	}
	ol {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	li {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.75rem;
	}
	li:not(:last-child)::after {
		color: #9aa5aa;
		content: '›';
	}
	li a {
		color: var(--navy);
		font-weight: 650;
		text-decoration: none;
	}
	li a:hover {
		color: var(--teal);
		text-decoration: underline;
	}
	li span[aria-current='page'] {
		color: var(--copper-dark);
		font-weight: 750;
	}
	.context-state {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		color: var(--muted);
		font-size: 0.72rem;
	}
	.context-state i {
		width: 0.8rem;
		height: 0.8rem;
		border: 2px solid #cbd7d4;
		border-top-color: var(--teal);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	.context-state.error {
		justify-content: space-between;
		color: #8e3d2d;
	}
	.context-state button {
		padding: 0.35rem 0.55rem;
		color: var(--navy);
		background: white;
		border: 1px solid var(--line);
		border-radius: 0.35rem;
		font-size: 0.67rem;
		font-weight: 700;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	@media (max-width: 42rem) {
		.context-heading {
			grid-template-columns: auto minmax(0, 1fr);
		}
		.context-heading > a {
			grid-column: 2;
		}
		.paths,
		.context-state {
			padding-left: 1rem;
		}
	}
</style>
