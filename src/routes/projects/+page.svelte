<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { authSession } from '$lib/auth/session';
	import {
		loadWorkingProjects,
		projectContext,
		projectDisplayName,
		projectPath
	} from '$lib/projects/context';
	import { getLocale } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages';
	let retrying = $state(false);

	function projectInitials(shortName: string): string {
		return (
			shortName
				.replace(/[^A-Za-z0-9]/g, '')
				.slice(0, 2)
				.toUpperCase() || 'P'
		);
	}

	async function retryProjectLoading(): Promise<void> {
		if ($authSession.status !== 'authenticated' || retrying) return;
		retrying = true;
		try {
			await loadWorkingProjects($authSession.user, $authSession.accessToken);
		} catch {
			// The project context retains the actionable error for this view.
		} finally {
			retrying = false;
		}
	}
</script>

<svelte:head><title>{m.project_selection_title()} · SALSAH 2.0</title></svelte:head>

<section class="project-selection" aria-labelledby="project-selection-title">
	<div class="selection-heading">
		<p>{m.project_selection_eyebrow()}</p>
		<h1 id="project-selection-title">{m.project_selection_title()}</h1>
		<span>{m.project_selection_intro()}</span>
	</div>

	{#if $projectContext.status === 'loading' || $projectContext.status === 'idle'}
		<div class="selection-state" role="status">{m.project_context_loading()}</div>
	{:else if $projectContext.status === 'error'}
		<div class="selection-state error" role="alert">
			<strong>{m.project_context_error()}</strong>
			<small>{$projectContext.error}</small>
			<button type="button" disabled={retrying} onclick={retryProjectLoading}>
				{retrying ? m.project_context_loading() : m.project_retry()}
			</button>
		</div>
	{:else if $projectContext.projects.length === 0}
		<div class="selection-state">
			<strong>{m.project_selection_empty_title()}</strong>
			<small>{m.project_selection_empty_text()}</small>
		</div>
	{:else}
		<div class="project-list">
			{#each $projectContext.projects as project (project.projectIri)}
				<a href={resolve(projectPath(project.projectShortName) as Pathname)}>
					<i aria-hidden="true">{projectInitials(project.projectShortName)}</i>
					<span>
						<strong>{projectDisplayName(project, getLocale())}</strong>
						<small>{project.projectShortName}</small>
					</span>
					<b aria-hidden="true">→</b>
				</a>
			{/each}
		</div>
	{/if}
</section>

<style>
	.project-selection {
		width: min(58rem, calc(100% - 2.5rem));
		margin: 0 auto;
		padding: clamp(3rem, 8vw, 7rem) 0;
	}
	.selection-heading {
		max-width: 42rem;
		margin-bottom: 2rem;
	}
	.selection-heading p {
		margin: 0 0 0.5rem;
		color: var(--copper-dark);
		font-size: 0.68rem;
		font-weight: 750;
		letter-spacing: 0.13em;
		text-transform: uppercase;
	}
	h1 {
		margin: 0;
		color: var(--navy);
		font-family: Georgia, 'Times New Roman', serif;
		font-size: clamp(2.2rem, 5vw, 3.7rem);
		font-weight: 500;
		letter-spacing: -0.035em;
	}
	.selection-heading span {
		display: block;
		margin-top: 0.8rem;
		color: var(--muted);
		line-height: 1.55;
	}
	.project-list {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
		gap: 0.9rem;
	}
	.project-list a {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 1rem;
		min-height: 6.2rem;
		padding: 1rem 1.15rem;
		background: rgb(255 253 248 / 92%);
		border: 1px solid var(--line);
		border-radius: 0.7rem;
		box-shadow: 0 2px 8px rgb(17 44 70 / 3%);
		text-decoration: none;
		transition:
			border-color 120ms ease,
			transform 120ms ease,
			box-shadow 120ms ease;
	}
	.project-list a:hover {
		border-color: var(--teal);
		box-shadow: var(--shadow);
		transform: translateY(-1px);
	}
	.project-list i {
		display: grid;
		place-items: center;
		width: 3.25rem;
		height: 3.25rem;
		color: white;
		background: var(--navy);
		border-radius: 0.5rem;
		font-family: Georgia, serif;
		font-size: 0.85rem;
		font-style: normal;
	}
	.project-list span {
		display: grid;
		min-width: 0;
	}
	.project-list strong {
		overflow: hidden;
		color: var(--navy);
		font-family: Georgia, serif;
		font-size: 1.1rem;
		font-weight: 600;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.project-list small,
	.selection-state small {
		margin-top: 0.25rem;
		color: var(--muted);
		font-size: 0.72rem;
	}
	.project-list b {
		color: var(--teal);
		font-size: 1.2rem;
	}
	.selection-state {
		display: grid;
		gap: 0.35rem;
		padding: 1.2rem;
		background: var(--paper);
		border: 1px solid var(--line);
		border-radius: 0.65rem;
	}
	.selection-state strong {
		color: var(--navy);
		font-family: Georgia, serif;
		font-size: 1.05rem;
	}
	.selection-state.error {
		color: #8b3228;
		background: #f9e7e2;
		border-color: #e9c2b7;
	}
	.selection-state button {
		justify-self: start;
		margin-top: 0.55rem;
		padding: 0.55rem 0.75rem;
		color: white;
		background: var(--copper);
		border: 0;
		border-radius: 0.4rem;
		font-size: 0.74rem;
		font-weight: 700;
	}
	.selection-state button:hover:not(:disabled) {
		background: var(--copper-dark);
	}
	.selection-state button:disabled {
		cursor: wait;
		opacity: 0.65;
	}
</style>
