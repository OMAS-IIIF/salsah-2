<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { getLocale } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages';
	import {
		projectAdministrationPath,
		projectStoryCreatePath,
		projectStoryEditorPath
	} from '$lib/projects/context';
	import { localizedText } from '$lib/resources/model';
	import type { OldapResourceSearchHit } from '$lib/resources/types';
	import { loadStoryAdministration } from '$lib/stories/client';

	interface Props {
		project: string;
	}

	let { project }: Props = $props();
	let stories = $state<OldapResourceSearchHit[]>([]);
	let classLabels = $state(new Map<string, string>());
	let loading = $state(true);
	let error = $state<string | null>(null);
	let reloadGeneration = $state(0);

	$effect(() => {
		const requestedProject = project;
		const requestedGeneration = reloadGeneration;
		let cancelled = false;
		loading = true;
		error = null;
		void loadStoryAdministration(requestedProject)
			.then(({ model, stories: result }) => {
				if (cancelled || requestedGeneration !== reloadGeneration) return;
				stories = result;
				classLabels = new Map(
					model.resources.map((resourceClass) => [
						resourceClass.iri,
						localizedText(resourceClass.label, getLocale()) ?? resourceClass.iri
					])
				);
			})
			.catch((reason: unknown) => {
				if (!cancelled) error = reason instanceof Error ? reason.message : m.admin_stories_error();
			})
			.finally(() => {
				if (!cancelled) loading = false;
			});

		return () => {
			cancelled = true;
		};
	});

	function title(story: OldapResourceSearchHit): string {
		return localizedText(story['schema:name'], getLocale()) ?? m.story_asset_untitled();
	}

	function summary(story: OldapResourceSearchHit): string | null {
		return localizedText(story['schema:abstract'], getLocale());
	}
</script>

<svelte:head><title>{m.admin_stories_title()} · SALSAH 2.0</title></svelte:head>

<div class="stories-page">
	<a class="back" href={resolve(projectAdministrationPath(project) as Pathname)}
		>← {m.admin_back()}</a
	>
	<header>
		<div>
			<p>{m.admin_stories_kicker()}</p>
			<h1>{m.admin_stories_title()}</h1>
			<span>{m.admin_stories_intro()}</span>
		</div>
		<div class="header-actions">
			<small>{m.admin_existing_only()}</small>
			<a href={resolve(projectStoryCreatePath(project) as Pathname)}
				>＋ {m.admin_story_create_action()}</a
			>
		</div>
	</header>

	{#if loading}
		<div class="state" role="status">{m.admin_stories_loading()}</div>
	{:else if error}
		<div class="state error" role="alert">
			<span>{error}</span><button type="button" onclick={() => (reloadGeneration += 1)}
				>{m.resource_retry()}</button
			>
		</div>
	{:else if stories.length}
		<div class="story-list">
			{#each stories as story (story.iri)}
				<a href={resolve(projectStoryEditorPath(project, story.iri) as Pathname)}>
					<i aria-hidden="true">¶</i>
					<span>
						<small>{classLabels.get(story.resclass) ?? story.resclass}</small>
						<strong>{title(story)}</strong>
						{#if summary(story)}<p>{summary(story)}</p>{/if}
					</span>
					<b aria-hidden="true">{m.admin_edit()} →</b>
				</a>
			{/each}
		</div>
	{:else}
		<div class="state">{m.admin_stories_empty()}</div>
	{/if}
</div>

<style>
	.stories-page {
		max-width: 76rem;
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
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 2rem;
		margin: 1.5rem 0 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--line);
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
		max-width: 45rem;
		margin-top: 0.7rem;
		color: var(--muted);
		line-height: 1.55;
	}
	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.7rem;
	}
	.header-actions small {
		padding: 0.45rem 0.65rem;
		color: #76552a;
		background: #f4e8d4;
		border-radius: 999px;
		font-size: 0.65rem;
		white-space: nowrap;
	}
	.header-actions a {
		padding: 0.7rem 0.9rem;
		color: white;
		background: var(--copper);
		border-radius: 0.45rem;
		font-size: 0.72rem;
		font-weight: 720;
		text-decoration: none;
		white-space: nowrap;
	}
	.story-list {
		display: grid;
		gap: 0.7rem;
	}
	.story-list a {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 1rem;
		padding: 1.1rem;
		color: inherit;
		background: rgb(255 253 248 / 94%);
		border: 1px solid var(--line);
		border-radius: 0.65rem;
		text-decoration: none;
	}
	.story-list a:hover {
		border-color: var(--teal);
	}
	.story-list i {
		display: grid;
		place-items: center;
		width: 3rem;
		height: 3rem;
		color: white;
		background: var(--navy);
		border-radius: 0.5rem;
		font-family: Georgia, serif;
		font-size: 1.3rem;
		font-style: normal;
	}
	.story-list span {
		display: grid;
		gap: 0.2rem;
	}
	.story-list small {
		color: var(--copper-dark);
		font-size: 0.64rem;
		font-weight: 700;
	}
	.story-list strong {
		color: var(--navy);
		font-family: Georgia, serif;
		font-size: 1.25rem;
		font-weight: 500;
	}
	.story-list p {
		margin: 0.2rem 0 0;
		color: var(--muted);
		font-size: 0.76rem;
	}
	.story-list b {
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
	.state button {
		padding: 0.45rem 0.7rem;
		color: white;
		background: var(--copper);
		border: 0;
		border-radius: 0.4rem;
	}
	@media (max-width: 42rem) {
		header {
			align-items: flex-start;
			flex-direction: column;
		}
		.header-actions {
			width: 100%;
			justify-content: space-between;
		}
		.story-list a {
			grid-template-columns: auto minmax(0, 1fr);
		}
		.story-list b {
			display: none;
		}
	}
</style>
