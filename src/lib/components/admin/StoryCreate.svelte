<script lang="ts">
	import type { Pathname } from '$app/types';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { authSession } from '$lib/auth/session';
	import { getLocale, locales } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages';
	import { projectAdministrationPath, projectStoryEditorPath } from '$lib/projects/context';
	import { localizedText } from '$lib/resources/model';
	import type { OldapResourceSearchHit } from '$lib/resources/types';
	import {
		createStory,
		loadStoryAuthors,
		loadStoryCreationOptions,
		type StoryCreationClass
	} from '$lib/stories/client';

	interface Props {
		project: string;
	}

	let { project }: Props = $props();
	let classes = $state<StoryCreationClass[]>([]);
	let authors = $state<OldapResourceSearchHit[]>([]);
	let selectedClassIri = $state('');
	let selectedAuthorIri = $state('');
	let selectedRoleIri = $state('');
	let title = $state('');
	let language = $state(getLocale().toLowerCase());
	let loading = $state(true);
	let authorsLoading = $state(false);
	let creating = $state(false);
	let error = $state<string | null>(null);
	let reloadGeneration = $state(0);
	let authorGeneration = 0;
	let selectedClass = $derived(classes.find(({ iri }) => iri === selectedClassIri) ?? null);
	let userRoleIris = $derived(
		$authSession.status === 'authenticated' ? Object.keys($authSession.user.hasRole) : []
	);
	let availableRoles = $derived(userRoleIris.filter((role) => role.startsWith(`${project}:`)));
	let canCreate = $derived(
		Boolean(
			title.trim() &&
			selectedClassIri &&
			selectedAuthorIri &&
			selectedRoleIri &&
			!loading &&
			!authorsLoading &&
			!creating
		)
	);

	$effect(() => {
		const requestedProject = project;
		const requestedGeneration = reloadGeneration;
		let cancelled = false;
		loading = true;
		error = null;
		void loadStoryCreationOptions(requestedProject)
			.then((options) => {
				if (cancelled || requestedGeneration !== reloadGeneration) return;
				classes = options.classes;
				selectedClassIri = options.classes.length === 1 ? options.classes[0].iri : '';
			})
			.catch((reason: unknown) => {
				if (!cancelled)
					error = reason instanceof Error ? reason.message : m.admin_story_create_error();
			})
			.finally(() => {
				if (!cancelled) loading = false;
			});

		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		const authorClassIri = selectedClass?.authorClassIri;
		if (!authorClassIri) {
			authors = [];
			selectedAuthorIri = '';
			return;
		}
		const generation = ++authorGeneration;
		authorsLoading = true;
		error = null;
		void loadStoryAuthors(project, authorClassIri)
			.then((result) => {
				if (generation !== authorGeneration) return;
				authors = result;
				const currentUserName =
					$authSession.status === 'authenticated'
						? `${$authSession.user.givenName} ${$authSession.user.familyName}`.trim()
						: '';
				const matchingUser = result.find(
					(author) =>
						authorTitle(author).localeCompare(currentUserName, undefined, {
							sensitivity: 'base'
						}) === 0
				);
				selectedAuthorIri = matchingUser?.iri ?? (result.length === 1 ? result[0].iri : '');
			})
			.catch((reason: unknown) => {
				if (generation === authorGeneration)
					error = reason instanceof Error ? reason.message : m.admin_story_create_error();
			})
			.finally(() => {
				if (generation === authorGeneration) authorsLoading = false;
			});
	});

	$effect(() => {
		if (availableRoles.includes(selectedRoleIri)) return;
		selectedRoleIri = availableRoles.length === 1 ? availableRoles[0] : '';
	});

	function classLabel(option: StoryCreationClass): string {
		return localizedText(option.label, getLocale()) ?? option.iri;
	}

	function authorTitle(author: OldapResourceSearchHit): string {
		return localizedText(author['schema:name'], getLocale()) ?? author.iri;
	}

	async function submit(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		if (!canCreate) return;
		creating = true;
		error = null;
		try {
			const created = await createStory(project, {
				classIri: selectedClassIri,
				title,
				language,
				authorIri: selectedAuthorIri,
				roleIri: selectedRoleIri
			});
			await goto(resolve(projectStoryEditorPath(project, created.iri, language) as Pathname));
		} catch (reason: unknown) {
			error = reason instanceof Error ? reason.message : m.admin_story_create_error();
			creating = false;
		}
	}
</script>

<svelte:head><title>{m.admin_story_create_title()} · SALSAH 2.0</title></svelte:head>

<div class="create-page">
	<a class="back" href={resolve(projectAdministrationPath(project, 'stories') as Pathname)}
		>← {m.admin_story_back()}</a
	>
	<header>
		<p>{m.admin_story_create_kicker()}</p>
		<h1>{m.admin_story_create_title()}</h1>
		<span>{m.admin_story_create_intro()}</span>
	</header>

	{#if loading}
		<div class="state" role="status">{m.admin_story_create_loading()}</div>
	{:else if error && !classes.length}
		<div class="state error" role="alert">
			<span>{error}</span><button type="button" onclick={() => (reloadGeneration += 1)}
				>{m.resource_retry()}</button
			>
		</div>
	{:else}
		<form onsubmit={submit}>
			<section>
				<h2>{m.admin_story_create_basics()}</h2>
				<div class="field-grid">
					{#if classes.length > 1}
						<label
							><span>{m.admin_story_create_class()}</span><select
								bind:value={selectedClassIri}
								required
							>
								<option value="">{m.admin_story_create_choose()}</option>
								{#each classes as option (option.iri)}<option value={option.iri}
										>{classLabel(option)}</option
									>{/each}
							</select></label
						>
					{/if}
					<label class="title-field"
						><span>{m.admin_story_create_name()}</span><input
							bind:value={title}
							required
							maxlength="500"
						/></label
					>
					<label
						><span>{m.admin_story_language()}</span><select bind:value={language}>
							{#each locales as locale (locale)}<option value={locale}
									>{locale.toUpperCase()}</option
								>{/each}
						</select></label
					>
				</div>
			</section>

			<section>
				<h2>{m.admin_story_create_responsibility()}</h2>
				<p>{m.admin_story_create_private_note()}</p>
				<div class="field-grid">
					<label
						><span>{m.admin_story_create_author()}</span><select
							bind:value={selectedAuthorIri}
							required
							disabled={authorsLoading}
						>
							<option value=""
								>{authorsLoading ? m.asset_picker_loading() : m.admin_story_create_choose()}</option
							>
							{#each authors as author (author.iri)}<option value={author.iri}
									>{authorTitle(author)}</option
								>{/each}
						</select></label
					>
					<label
						><span>{m.admin_story_create_role()}</span><select
							bind:value={selectedRoleIri}
							required
						>
							<option value="">{m.admin_story_create_choose()}</option>
							{#each availableRoles as role (role)}<option value={role}>{role}</option>{/each}
						</select></label
					>
				</div>
				{#if !availableRoles.length}<p class="validation" role="alert">
						{m.admin_story_create_no_role()}
					</p>{/if}
				{#if !authorsLoading && !authors.length}<p class="validation" role="alert">
						{m.admin_story_create_no_author()}
					</p>{/if}
			</section>

			{#if error}<p class="validation" role="alert">{error}</p>{/if}
			<footer>
				<a href={resolve(projectAdministrationPath(project, 'stories') as Pathname)}
					>{m.admin_story_create_cancel()}</a
				>
				<button type="submit" disabled={!canCreate}
					>{creating ? m.admin_story_creating() : m.admin_story_create_submit()}</button
				>
			</footer>
		</form>
	{/if}
</div>

<style>
	.create-page {
		max-width: 60rem;
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
		font-size: clamp(2.4rem, 6vw, 4.3rem);
		font-weight: 500;
		letter-spacing: -0.04em;
	}
	header span {
		display: block;
		max-width: 43rem;
		margin-top: 0.7rem;
		color: var(--muted);
		line-height: 1.55;
	}
	form {
		display: grid;
		gap: 1rem;
	}
	section {
		padding: 1.4rem;
		background: rgb(255 253 248 / 94%);
		border: 1px solid var(--line);
		border-radius: 0.7rem;
	}
	h2 {
		margin: 0 0 1rem;
		color: var(--navy);
		font-family: Georgia, serif;
		font-size: 1.55rem;
		font-weight: 500;
	}
	section > p {
		margin: -0.45rem 0 1rem;
		color: var(--muted);
		font-size: 0.78rem;
		line-height: 1.5;
	}
	.field-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(12rem, 0.45fr);
		gap: 1rem;
	}
	label {
		display: grid;
		align-content: start;
		gap: 0.4rem;
	}
	label span {
		color: var(--navy);
		font-size: 0.68rem;
		font-weight: 720;
	}
	input,
	select {
		width: 100%;
		min-height: 2.85rem;
		padding: 0.65rem 0.75rem;
		color: var(--navy);
		background: white;
		border: 1px solid #cbd1d3;
		border-radius: 0.45rem;
		font: inherit;
	}
	input:focus,
	select:focus {
		border-color: var(--teal);
		outline: 2px solid rgb(29 150 145 / 18%);
	}
	footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 1rem;
		padding-top: 0.4rem;
	}
	footer a {
		color: var(--muted);
		font-size: 0.75rem;
		font-weight: 680;
		text-decoration: none;
	}
	button {
		padding: 0.78rem 1.15rem;
		color: white;
		background: var(--copper);
		border: 0;
		border-radius: 0.48rem;
		font: inherit;
		font-size: 0.75rem;
		font-weight: 720;
		cursor: pointer;
	}
	button:disabled {
		cursor: not-allowed;
		opacity: 0.48;
	}
	.state,
	.validation {
		padding: 1rem;
		color: var(--muted);
		background: rgb(255 253 248 / 94%);
		border: 1px solid var(--line);
		border-radius: 0.6rem;
	}
	.state.error {
		display: flex;
		align-items: center;
		justify-content: space-between;
		color: #8a4b27;
	}
	.validation {
		margin: 0.8rem 0 0;
		color: #8a4b27;
		background: #fff7ef;
		border-color: #e1b997;
		font-size: 0.75rem;
	}
	@media (max-width: 42rem) {
		.field-grid {
			grid-template-columns: 1fr;
		}
		footer {
			align-items: stretch;
			flex-direction: column-reverse;
		}
		footer a,
		footer button {
			text-align: center;
		}
	}
</style>
