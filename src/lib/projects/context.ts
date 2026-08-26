import { get, writable } from 'svelte/store';
import { getApiBaseUrl } from '$lib/api/baseUrl';
import type { AuthenticatedUser } from '$lib/auth/types';
import type { ProjectContextState, WorkingProject } from './types';

/** OLDAP infrastructure projects are authorization contexts, not user workspaces. */
export const SYSTEM_PROJECT_IRIS = new Set(['oldap:SystemProject', 'oldap:SharedProject']);

export const projectContext = writable<ProjectContextState>({
	status: 'idle',
	projects: [],
	current: null,
	error: null
});

let loadedForUser: string | null = null;
let loadPromise: Promise<WorkingProject[]> | null = null;
let loadGeneration = 0;

interface ProjectResponse {
	projectIri?: unknown;
	projectShortName?: unknown;
	shortName?: unknown;
	label?: unknown;
}

/** Filter infrastructure projects and collapse duplicate membership entries. */
export function workingProjectMemberships(
	inProjects: AuthenticatedUser['inProjects']
): AuthenticatedUser['inProjects'] {
	return [
		...new Map(
			inProjects
				.filter(({ project }) => !SYSTEM_PROJECT_IRIS.has(project))
				.map((membership) => [membership.project, membership])
		).values()
	];
}

function responseMessage(value: unknown): string | null {
	if (!value || typeof value !== 'object') return null;
	const message = (value as { message?: unknown }).message;
	return typeof message === 'string' ? message : null;
}

async function fetchProject(
	projectIri: string,
	permissions: string[],
	accessToken: string
): Promise<WorkingProject> {
	const url = new URL(`${getApiBaseUrl()}/admin/project/get`);
	url.searchParams.set('iri', projectIri);
	const response = await fetch(url, {
		headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` }
	});
	const body = (await response.json().catch(() => null)) as ProjectResponse | null;
	if (!response.ok) {
		throw new Error(
			responseMessage(body) ?? `Project request failed for ${projectIri} (HTTP ${response.status}).`
		);
	}

	const shortName = body?.projectShortName ?? body?.shortName;
	if (typeof body?.projectIri !== 'string' || typeof shortName !== 'string' || !shortName.trim()) {
		throw new Error(`OLDAP returned incomplete project data for ${projectIri}.`);
	}

	return {
		projectIri: body.projectIri,
		projectShortName: shortName,
		labels: Array.isArray(body.label)
			? body.label.filter((label): label is string => typeof label === 'string')
			: [],
		permissions
	};
}

/**
 * Load the authenticated user's domain projects and enrich their memberships
 * with OLDAP project metadata. System and shared infrastructure projects are
 * intentionally excluded from the working-project list.
 */
export function loadWorkingProjects(
	user: AuthenticatedUser,
	accessToken: string
): Promise<WorkingProject[]> {
	if (loadedForUser === user.userId && get(projectContext).status === 'ready') {
		return Promise.resolve(get(projectContext).projects);
	}
	if (loadedForUser === user.userId && loadPromise) return loadPromise;

	loadedForUser = user.userId;
	const generation = ++loadGeneration;
	projectContext.set({ status: 'loading', projects: [], current: null, error: null });

	const memberships = workingProjectMemberships(user.inProjects);

	const currentLoad = Promise.all(
		memberships.map(({ project, permissions }) =>
			fetchProject(project, permissions ?? [], accessToken)
		)
	)
		.then((projects) => {
			projects.sort((left, right) =>
				left.projectShortName.localeCompare(right.projectShortName, undefined, {
					sensitivity: 'base'
				})
			);
			if (generation === loadGeneration && loadedForUser === user.userId) {
				projectContext.set({ status: 'ready', projects, current: null, error: null });
			}
			return projects;
		})
		.catch((error: unknown) => {
			const message =
				error instanceof Error ? error.message : 'Working projects could not be loaded.';
			if (generation === loadGeneration && loadedForUser === user.userId) {
				projectContext.set({ status: 'error', projects: [], current: null, error: message });
			}
			throw error;
		})
		.finally(() => {
			if (generation === loadGeneration) loadPromise = null;
		});

	loadPromise = currentLoad;
	return currentLoad;
}

/** Select a loaded project by its stable short name. */
export function selectWorkingProject(projectShortName: string): WorkingProject | null {
	const state = get(projectContext);
	if (state.status !== 'ready') return null;
	const current =
		state.projects.find((project) => project.projectShortName === projectShortName) ?? null;
	if (state.current?.projectIri === current?.projectIri) return current;
	projectContext.set({ ...state, current });
	return current;
}

/** Clear all user-specific project metadata on logout or user change. */
export function clearProjectContext(): void {
	loadGeneration += 1;
	loadedForUser = null;
	loadPromise = null;
	projectContext.set({ status: 'idle', projects: [], current: null, error: null });
}

/** Resolve OLDAP's compact `value@language` labels with predictable fallbacks. */
export function projectDisplayName(project: WorkingProject, locale: string): string {
	const parsed = project.labels.map((label) => {
		const match = /^(.*)@([A-Za-z]{2,3}(?:-[A-Za-z0-9]+)*)$/.exec(label);
		return match
			? { value: match[1], language: match[2].toLowerCase() }
			: { value: label, language: '' };
	});
	const normalizedLocale = locale.toLowerCase();
	return (
		parsed.find(({ language }) => language === normalizedLocale)?.value ??
		parsed.find(({ language }) => language.split('-')[0] === normalizedLocale.split('-')[0])
			?.value ??
		parsed.find(({ language }) => language === 'en')?.value ??
		parsed[0]?.value ??
		project.projectShortName
	);
}

/** Build a canonical, deep-linkable route inside a working project. */
export function projectPath(projectShortName: string, suffix = '', hash = ''): string {
	const normalizedSuffix = suffix && !suffix.startsWith('/') ? `/${suffix}` : suffix;
	return `/p/${encodeURIComponent(projectShortName)}${normalizedSuffix}${hash}`;
}

/** Build the canonical route for an ontology-driven resource QName or IRI. */
export function projectResourcePath(projectShortName: string, resourceIri: string): string {
	return projectPath(projectShortName, `resource/${encodeURIComponent(resourceIri)}`);
}

/** Build the canonical project search route with an optional shareable query. */
export function projectSearchPath(projectShortName: string, query = ''): string {
	const path = projectPath(projectShortName, 'search');
	const normalizedQuery = query.trim();
	return normalizedQuery ? `${path}?q=${encodeURIComponent(normalizedQuery)}` : path;
}

/** Build the canonical read-only archive-tree route for a project. */
export function projectArchivePath(projectShortName: string): string {
	return projectPath(projectShortName, 'archive');
}
