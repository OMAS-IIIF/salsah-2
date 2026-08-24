import { get } from 'svelte/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	clearProjectContext,
	loadWorkingProjects,
	projectContext,
	projectDisplayName,
	projectPath,
	projectResourcePath,
	SYSTEM_PROJECT_IRIS,
	workingProjectMemberships
} from './context';
import type { WorkingProject } from './types';

vi.mock('$lib/api/baseUrl', () => ({ getApiBaseUrl: () => 'https://api.example' }));

const project: WorkingProject = {
	projectIri: 'https://example.org/project/archive',
	projectShortName: 'archive',
	labels: ['Archive@en', 'Archiv@de', 'Archives@fr'],
	permissions: ['ADMIN_CREATE']
};

describe('project context helpers', () => {
	afterEach(() => {
		clearProjectContext();
		vi.unstubAllGlobals();
	});
	it('recognizes the two infrastructure projects', () => {
		expect(SYSTEM_PROJECT_IRIS.has('oldap:SystemProject')).toBe(true);
		expect(SYSTEM_PROJECT_IRIS.has('oldap:SharedProject')).toBe(true);
	});

	it('excludes infrastructure projects and collapses duplicate memberships', () => {
		expect(
			workingProjectMemberships([
				{ project: 'oldap:SystemProject', permissions: ['ADMIN_OLDAP'] },
				{ project: 'oldap:SharedProject', permissions: [] },
				{ project: 'https://example.org/project/archive', permissions: ['ADMIN_CREATE'] },
				{ project: 'https://example.org/project/archive', permissions: ['ADMIN_CREATE'] }
			])
		).toEqual([{ project: 'https://example.org/project/archive', permissions: ['ADMIN_CREATE'] }]);
	});

	it('selects a localized label with an English fallback', () => {
		expect(projectDisplayName(project, 'de')).toBe('Archiv');
		expect(projectDisplayName(project, 'it')).toBe('Archive');
	});

	it('builds encoded project routes', () => {
		expect(projectPath('my project', 'search', '#result')).toBe('/p/my%20project/search#result');
		expect(projectResourcePath('my project', 'archive:Item/1')).toBe(
			'/p/my%20project/resource/archive%3AItem%2F1'
		);
	});

	it('does not let a stale load overwrite a newer session for the same user', async () => {
		let resolveFirstResponse: ((response: Response) => void) | undefined;
		const firstResponse = new Promise<Response>((resolve) => {
			resolveFirstResponse = resolve;
		});
		const response = (label: string) =>
			new Response(
				JSON.stringify({
					projectIri: project.projectIri,
					projectShortName: project.projectShortName,
					label: [`${label}@en`]
				}),
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			);
		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockImplementationOnce(() => firstResponse)
				.mockResolvedValueOnce(response('New'))
		);

		const user = {
			userIri: 'urn:uuid:user',
			userId: 'researcher',
			givenName: 'Research',
			familyName: 'User',
			email: '',
			isActive: true,
			inProjects: [{ project: project.projectIri, permissions: [] }],
			hasRole: {}
		};
		const staleLoad = loadWorkingProjects(user, 'old-token');
		clearProjectContext();
		await loadWorkingProjects(user, 'new-token');
		resolveFirstResponse?.(response('Old'));
		await staleLoad;

		const state = get(projectContext);
		expect(state.status).toBe('ready');
		expect(state.projects[0]?.labels).toEqual(['New@en']);
	});
});
