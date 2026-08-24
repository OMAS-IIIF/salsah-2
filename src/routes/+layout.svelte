<script lang="ts">
	import type { Pathname } from '$app/types';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { safeReturnPath } from '$lib/auth/navigation';
	import { authSession, logout, restoreSession } from '$lib/auth/session';
	import { m } from '$lib/paraglide/messages';
	import { getLocale, locales, localizeHref } from '$lib/paraglide/runtime';
	import {
		clearProjectContext,
		loadWorkingProjects,
		projectContext,
		projectDisplayName,
		projectPath,
		selectWorkingProject
	} from '$lib/projects/context';
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';

	let { children } = $props();
	let isLoginRoute = $derived(page.route.id === '/login');
	let isProjectSelectionRoute = $derived(page.route.id === '/projects');
	let isProjectRoute = $derived(page.route.id?.startsWith('/p/[project]') ?? false);
	let authenticationInitialized = $state(false);
	let projectsInitializedForUser = $state<string | null>(null);
	let tenantMenuOpen = $state(false);
	let localeMenuOpen = $state(false);
	let profileMenuOpen = $state(false);
	let currentProject = $derived(
		$projectContext.status === 'ready' ? $projectContext.current : null
	);
	let hasValidatedProject = $derived(
		isProjectRoute && currentProject?.projectShortName === page.params.project
	);

	const navigation = [
		{ label: m.nav_workspace, icon: '▦', hash: '' },
		{ label: m.nav_search, icon: '⌕', hash: '#search' },
		{ label: m.nav_archive, icon: '▤', hash: '#archive' },
		{ label: m.nav_import, icon: '⇧', hash: '#import' }
	] as const;

	function initials(givenName: string, familyName: string): string {
		return `${givenName.charAt(0)}${familyName.charAt(0)}`.toUpperCase();
	}

	function projectInitials(shortName: string): string {
		return (
			shortName
				.replace(/[^A-Za-z0-9]/g, '')
				.slice(0, 2)
				.toUpperCase() || 'P'
		);
	}

	function currentProjectHref(hash = ''): Pathname {
		return (
			currentProject ? projectPath(currentProject.projectShortName, '', hash) : '/projects'
		) as Pathname;
	}

	function localizedCurrentHref(locale: (typeof locales)[number]): Pathname {
		const currentHref = `${page.url.pathname}${page.url.search}${page.url.hash}`;
		return localizeHref(currentHref, { locale }) as Pathname;
	}

	onMount(async () => {
		const restored = await restoreSession();
		if (restored && isLoginRoute) {
			await goto(resolve(safeReturnPath(page.url.searchParams.get('next')) as Pathname));
		}
		authenticationInitialized = true;
	});

	$effect(() => {
		const session = $authSession;
		if (session.status !== 'authenticated') {
			if (projectsInitializedForUser !== null) clearProjectContext();
			projectsInitializedForUser = null;
			return;
		}
		if (projectsInitializedForUser === session.user.userId) return;
		projectsInitializedForUser = session.user.userId;
		void loadWorkingProjects(session.user, session.accessToken).catch(() => undefined);
	});

	$effect(() => {
		if (!authenticationInitialized || $authSession.status !== 'authenticated') return;
		if ($projectContext.status === 'error') {
			if (page.route.id !== '/projects') void goto(resolve('/projects'), { replaceState: true });
			return;
		}
		if ($projectContext.status !== 'ready') return;
		// The login route owns its validated `next` destination. Redirecting a
		// newly authenticated sole-project user here would race that deep link.
		if (isLoginRoute) return;

		const projects = $projectContext.projects;
		if (page.route.id === '/') {
			const destination =
				projects.length === 1 ? projectPath(projects[0].projectShortName) : '/projects';
			void goto(resolve(destination as Pathname), { replaceState: true });
			return;
		}

		if (page.route.id === '/projects') {
			if (projects.length === 1) {
				void goto(resolve(projectPath(projects[0].projectShortName) as Pathname), {
					replaceState: true
				});
			}
			return;
		}

		if (page.route.id?.startsWith('/p/[project]')) {
			const routeProject = page.params.project;
			if (!routeProject || !selectWorkingProject(routeProject)) {
				void goto(resolve('/projects'));
			}
			return;
		}

		const destination =
			projects.length === 1 ? projectPath(projects[0].projectShortName) : '/projects';
		void goto(resolve(destination as Pathname));
	});

	$effect(() => {
		if (!authenticationInitialized || isLoginRoute || $authSession.status !== 'anonymous') return;
		const destination = `${page.url.pathname}${page.url.search}${page.url.hash}`;
		const loginDestination = `/login?next=${encodeURIComponent(destination)}` as Pathname;
		void goto(resolve(loginDestination));
	});

	async function handleLogout(): Promise<void> {
		try {
			await logout();
		} finally {
			clearProjectContext();
			await goto(resolve('/login'));
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{m.app_title()}</title>
</svelte:head>

{#if isLoginRoute}
	{#if authenticationInitialized && $authSession.status === 'anonymous'}
		{@render children()}
	{:else}
		<div class="session-loading" role="status"><span></span>{m.session_restoring()}</div>
	{/if}
{:else if $authSession.status === 'authenticated'}
	<div class="app-shell">
		<header class="topbar">
			<a class="brand" href={resolve(currentProjectHref())} aria-label={m.home_label()}>
				<img src="/brand/salsah-2.0-logo-horizontal.svg" alt="SALSAH 2.0" />
			</a>

			<details class="tenant-menu" bind:open={tenantMenuOpen}>
				<summary class="tenant" aria-label={m.change_workspace()}>
					<span class="tenant-mark"
						>{currentProject ? projectInitials(currentProject.projectShortName) : '–'}</span
					>
					<span
						><small>{m.current_workspace()}</small><strong
							>{currentProject
								? projectDisplayName(currentProject, getLocale())
								: m.project_choose()}</strong
						></span
					>
					<b aria-hidden="true">⌄</b>
				</summary>
				<div>
					{#if $projectContext.status === 'ready'}
						{#each $projectContext.projects as project (project.projectIri)}
							<a
								class:current={currentProject?.projectIri === project.projectIri}
								href={resolve(projectPath(project.projectShortName) as Pathname)}
								onclick={() => (tenantMenuOpen = false)}
							>
								<strong>{projectDisplayName(project, getLocale())}</strong>
								<small>{project.projectShortName}</small>
							</a>
						{/each}
					{/if}
					{#if $projectContext.projects.length > 1}
						<a
							class="all-projects"
							href={resolve('/projects')}
							onclick={() => (tenantMenuOpen = false)}>{m.project_show_all()}</a
						>
					{/if}
				</div>
			</details>

			<div class="topbar-actions">
				<label class="global-search">
					<span aria-hidden="true">⌕</span>
					<input type="search" placeholder={m.search_placeholder()} aria-label={m.search_label()} />
					<kbd>⌘ K</kbd>
				</label>
				<details class="locale-menu" bind:open={localeMenuOpen}>
					<summary aria-label={m.language_label()}>{getLocale().toUpperCase()}</summary>
					<div>
						{#each locales as locale (locale)}
							<a
								class:current={locale === getLocale()}
								href={resolve(localizedCurrentHref(locale))}
								onclick={() => (localeMenuOpen = false)}>{locale.toUpperCase()}</a
							>
						{/each}
					</div>
				</details>
				<button class="round-button notification" type="button" aria-label={m.notifications_label()}
					>♧<i></i></button
				>
				<details class="profile-menu" bind:open={profileMenuOpen}>
					<summary
						class="profile"
						aria-label={`${m.profile_label()}: ${$authSession.user.givenName} ${$authSession.user.familyName}`}
					>
						{initials($authSession.user.givenName, $authSession.user.familyName)}
					</summary>
					<div>
						<strong>{$authSession.user.givenName} {$authSession.user.familyName}</strong>
						<small>{$authSession.user.userId}</small>
						{#if $projectContext.projects.length > 1}
							<a
								class="profile-project-switch"
								href={resolve('/projects')}
								onclick={() => (profileMenuOpen = false)}>{m.project_show_all()}</a
							>
						{/if}
						<button type="button" onclick={handleLogout}>{m.logout_action()}</button>
					</div>
				</details>
			</div>
		</header>

		<div class="shell-body" class:selection={isProjectSelectionRoute}>
			{#if !isProjectSelectionRoute}
				<aside class="sidebar" aria-label={m.primary_navigation()}>
					<nav class="primary-nav">
						{#each navigation as item (item.icon)}
							<a
								class:active={page.url.hash === item.hash}
								href={resolve(currentProjectHref(item.hash))}
								><b aria-hidden="true">{item.icon}</b><span>{item.label()}</span></a
							>
						{/each}
					</nav>
					<nav class="secondary-nav">
						<a href={resolve(currentProjectHref('#administration'))}
							><b aria-hidden="true">◇</b><span>{m.nav_administration()}</span></a
						>
						<a href={resolve(currentProjectHref('#help'))}
							><b aria-hidden="true">?</b><span>{m.nav_help()}</span></a
						>
					</nav>
				</aside>
			{/if}
			<main class="workspace">
				{#if isProjectRoute && hasValidatedProject && currentProject}
					{#key `${currentProject.projectIri}:${page.url.pathname}`}
						{@render children()}
					{/key}
				{:else if isProjectRoute}
					<div class="project-loading" role="status">
						<span></span>{m.project_context_loading()}
					</div>
				{:else}
					{@render children()}
				{/if}
			</main>
		</div>
	</div>
{:else}
	<div class="session-loading" role="status"><span></span>{m.session_restoring()}</div>
{/if}

<style>
	.topbar {
		position: sticky;
		top: 0;
		z-index: 20;
		display: grid;
		grid-template-columns: 14.5rem minmax(12rem, 1fr) auto;
		align-items: center;
		height: 5rem;
		padding: 0 1.5rem 0 1.75rem;
		background: rgb(255 253 248 / 94%);
		border-bottom: 1px solid var(--line);
		backdrop-filter: blur(18px);
	}
	.brand {
		display: flex;
		width: 10.75rem;
	}
	.brand img {
		display: block;
		width: 100%;
		height: auto;
	}
	.tenant {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		justify-self: start;
		min-width: 0;
		padding: 0.4rem 0.65rem;
		color: var(--ink);
		background: transparent;
		border: 0;
		border-radius: 0.45rem;
		text-align: left;
		cursor: pointer;
		list-style: none;
	}
	.tenant::-webkit-details-marker {
		display: none;
	}
	.tenant-menu {
		position: relative;
		justify-self: start;
		min-width: 0;
	}
	.tenant:hover,
	.round-button:hover,
	.locale-menu summary:hover {
		background: #f1ede5;
	}
	.tenant-mark {
		display: grid;
		place-items: center;
		width: 2.25rem;
		height: 2.25rem;
		flex: 0 0 auto;
		color: white;
		background: var(--navy);
		border-radius: 0.35rem;
		font-family: Georgia, serif;
		font-size: 0.75rem;
	}
	.tenant > span:nth-child(2) {
		display: grid;
		min-width: 0;
	}
	.tenant small {
		color: var(--muted);
		font-size: 0.64rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.tenant strong {
		overflow: hidden;
		font-family: Georgia, serif;
		font-size: 0.98rem;
		font-weight: 600;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.tenant b {
		color: var(--muted);
		font-size: 1rem;
	}
	.tenant-menu > div {
		position: absolute;
		top: calc(100% + 0.45rem);
		left: 0;
		z-index: 40;
		display: grid;
		min-width: min(22rem, calc(100vw - 2rem));
		padding: 0.4rem;
		background: white;
		border: 1px solid var(--line);
		border-radius: 0.55rem;
		box-shadow: var(--shadow);
	}
	.tenant-menu > div > a {
		display: grid;
		padding: 0.55rem 0.65rem;
		border-radius: 0.35rem;
		text-decoration: none;
	}
	.tenant-menu > div > a:hover,
	.tenant-menu > div > a.current {
		background: #edf7f5;
	}
	.tenant-menu a strong {
		color: var(--navy);
		font-family: Georgia, serif;
		font-size: 0.85rem;
		font-weight: 600;
	}
	.tenant-menu a small {
		margin-top: 0.12rem;
		color: var(--muted);
		font-size: 0.65rem;
	}
	.tenant-menu > div > a.all-projects {
		margin-top: 0.3rem;
		color: var(--copper-dark);
		border-top: 1px solid var(--line);
		border-radius: 0;
		font-size: 0.72rem;
		font-weight: 700;
	}
	.topbar-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.global-search {
		display: flex;
		align-items: center;
		width: clamp(12rem, 22vw, 19rem);
		height: 2.55rem;
		padding: 0 0.65rem;
		color: var(--muted);
		background: #f5f2eb;
		border: 1px solid transparent;
		border-radius: 0.45rem;
	}
	.global-search:focus-within {
		background: white;
		border-color: var(--teal);
	}
	.global-search input {
		width: 100%;
		min-width: 0;
		padding: 0 0.55rem;
		color: var(--ink);
		background: transparent;
		border: 0;
		outline: 0;
	}
	.global-search kbd {
		padding: 0.16rem 0.35rem;
		background: white;
		border: 1px solid var(--line);
		border-radius: 0.25rem;
		font-family: inherit;
		font-size: 0.68rem;
		white-space: nowrap;
	}
	.locale-menu {
		position: relative;
	}
	.locale-menu summary,
	.round-button,
	.profile {
		display: grid;
		place-items: center;
		width: 2.55rem;
		height: 2.55rem;
		padding: 0;
		color: var(--navy);
		background: transparent;
		border: 0;
		border-radius: 50%;
		list-style: none;
		font-size: 0.74rem;
		font-weight: 750;
	}
	.locale-menu summary {
		cursor: pointer;
	}
	.locale-menu summary::-webkit-details-marker {
		display: none;
	}
	.locale-menu > div {
		position: absolute;
		top: calc(100% + 0.5rem);
		right: 0;
		display: grid;
		min-width: 5rem;
		padding: 0.35rem;
		background: white;
		border: 1px solid var(--line);
		border-radius: 0.45rem;
		box-shadow: var(--shadow);
	}
	.locale-menu a {
		padding: 0.45rem 0.6rem;
		border-radius: 0.3rem;
		font-size: 0.72rem;
		text-decoration: none;
	}
	.locale-menu a:hover,
	.locale-menu a.current {
		color: var(--teal);
		background: #edf7f5;
	}
	.notification {
		position: relative;
		font-size: 1.25rem;
	}
	.notification i {
		position: absolute;
		top: 0.55rem;
		right: 0.55rem;
		width: 0.42rem;
		height: 0.42rem;
		background: var(--copper);
		border: 2px solid var(--paper);
		border-radius: 50%;
	}
	.profile {
		margin-left: 0.2rem;
		color: white;
		background: var(--navy);
		border: 2px solid white;
		box-shadow: 0 0 0 1px #bfc7cc;
		cursor: pointer;
	}
	.profile::-webkit-details-marker {
		display: none;
	}
	.profile-menu {
		position: relative;
	}
	.profile-menu > div {
		position: absolute;
		top: calc(100% + 0.65rem);
		right: 0;
		display: grid;
		min-width: 14rem;
		padding: 0.9rem;
		background: white;
		border: 1px solid var(--line);
		border-radius: 0.55rem;
		box-shadow: var(--shadow);
	}
	.profile-menu strong {
		color: var(--navy);
		font-family: Georgia, serif;
		font-size: 0.92rem;
	}
	.profile-menu small {
		margin-top: 0.15rem;
		color: var(--muted);
		font-size: 0.68rem;
	}
	.profile-menu button {
		margin-top: 0.8rem;
		padding: 0.55rem 0.65rem;
		color: var(--copper-dark);
		background: #faf3ed;
		border: 0;
		border-radius: 0.35rem;
		font-size: 0.75rem;
		font-weight: 700;
		text-align: left;
	}
	.profile-menu .profile-project-switch {
		margin-top: 0.8rem;
		padding: 0.55rem 0.65rem;
		color: var(--teal);
		background: #edf7f5;
		border-radius: 0.35rem;
		font-size: 0.75rem;
		font-weight: 700;
		text-decoration: none;
	}
	.profile-menu .profile-project-switch:hover {
		background: #deefec;
	}
	.profile-menu button:hover {
		background: #f4e4d8;
	}
	.shell-body {
		display: grid;
		grid-template-columns: 6.25rem minmax(0, 1fr);
		min-height: calc(100vh - 5rem);
	}
	.shell-body.selection {
		grid-template-columns: minmax(0, 1fr);
	}
	.sidebar {
		position: sticky;
		top: 5rem;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		height: calc(100vh - 5rem);
		padding: 1.15rem 0.55rem 1rem;
		background: var(--navy);
	}
	.primary-nav,
	.secondary-nav {
		display: grid;
		gap: 0.35rem;
	}
	.sidebar a {
		position: relative;
		display: grid;
		place-items: center;
		gap: 0.3rem;
		min-height: 4.2rem;
		padding: 0.5rem 0.15rem;
		color: #cbd5dd;
		border-radius: 0.55rem;
		font-size: 0.66rem;
		font-weight: 600;
		line-height: 1.15;
		text-align: center;
		text-decoration: none;
	}
	.sidebar a:hover,
	.sidebar a.active {
		color: white;
		background: rgb(255 255 255 / 10%);
	}
	.sidebar a.active::before {
		position: absolute;
		top: 0.7rem;
		bottom: 0.7rem;
		left: -0.55rem;
		width: 0.2rem;
		background: var(--teal);
		border-radius: 0 0.2rem 0.2rem 0;
		content: '';
	}
	.sidebar a b {
		font-family: Georgia, serif;
		font-size: 1.55rem;
		font-weight: 400;
		line-height: 1;
	}
	.workspace {
		min-width: 0;
	}
	.session-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.7rem;
		min-height: 100vh;
		color: var(--muted);
		background: var(--parchment);
		font-size: 0.8rem;
	}
	.project-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.7rem;
		min-height: calc(100vh - 5rem);
		color: var(--muted);
		font-size: 0.8rem;
	}
	.project-loading span,
	.session-loading span {
		width: 1rem;
		height: 1rem;
		border: 2px solid #c7cfce;
		border-top-color: var(--teal);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	@media (max-width: 960px) {
		.topbar {
			grid-template-columns: 11.5rem 1fr auto;
			padding-left: 1.1rem;
		}
		.brand {
			width: 9.5rem;
		}
		.tenant > span:nth-child(2),
		.global-search {
			display: none;
		}
		.tenant {
			justify-self: end;
		}
		.tenant-menu {
			justify-self: end;
		}
	}
	@media (max-width: 680px) {
		.topbar {
			grid-template-columns: 1fr auto;
			height: 4.25rem;
			padding: 0 0.85rem;
		}
		.brand {
			width: 8.75rem;
		}
		.tenant-menu,
		.locale-menu,
		.round-button {
			display: none;
		}
		.shell-body {
			grid-template-columns: 1fr;
			padding-bottom: 4.6rem;
		}
		.shell-body.selection {
			padding-bottom: 0;
		}
		.sidebar {
			position: fixed;
			top: auto;
			right: 0;
			bottom: 0;
			left: 0;
			z-index: 30;
			display: block;
			height: 4.6rem;
			padding: 0.35rem 0.45rem;
			background: var(--navy);
		}
		.primary-nav {
			grid-template-columns: repeat(4, 1fr);
			gap: 0.2rem;
		}
		.sidebar a {
			min-height: 3.8rem;
			padding: 0.3rem;
		}
		.sidebar a.active::before {
			top: -0.35rem;
			right: 25%;
			bottom: auto;
			left: 25%;
			width: auto;
			height: 0.2rem;
		}
		.secondary-nav {
			display: none;
		}
	}
</style>
