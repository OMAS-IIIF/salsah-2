import { expect, test, type Page } from '@playwright/test';

interface ProjectFixture {
	iri: string;
	shortName: string;
	label: string;
}

const systemMemberships = [
	{ project: 'oldap:SystemProject', permissions: ['oldap:ADMIN_USERS'] },
	{ project: 'oldap:SharedProject', permissions: [] }
];

/** Provide deterministic OLDAP responses without contacting a real backend. */
async function mockOldap(page: Page, projects: ProjectFixture[]): Promise<string[]> {
	const requestedProjectIris: string[] = [];
	await page.route('http://localhost:8000/**', async (route) => {
		const request = route.request();
		const url = new URL(request.url());
		const headers = {
			'Access-Control-Allow-Credentials': 'true',
			'Access-Control-Allow-Headers': 'Authorization, Content-Type',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Origin': 'http://localhost:4173',
			'Content-Type': 'application/json'
		};

		if (request.method() === 'OPTIONS') {
			await route.fulfill({ status: 204, headers });
			return;
		}
		if (url.pathname === '/admin/auth/refresh') {
			await route.fulfill({ status: 401, headers, json: { message: 'No session.' } });
			return;
		}
		if (url.pathname === '/admin/auth/researcher' && request.method() === 'POST') {
			await route.fulfill({ status: 200, headers, json: { accessToken: 'test-access-token' } });
			return;
		}
		if (url.pathname === '/admin/user/researcher') {
			await route.fulfill({
				status: 200,
				headers,
				json: {
					userIri: 'urn:uuid:researcher',
					userId: 'researcher',
					givenName: 'Ada',
					familyName: 'Archivist',
					email: 'ada@example.org',
					isActive: true,
					inProjects: [
						...systemMemberships,
						...projects.map((project) => ({ project: project.iri, permissions: [] }))
					],
					hasRole: {}
				}
			});
			return;
		}
		if (url.pathname === '/admin/project/get') {
			const iri = url.searchParams.get('iri') ?? '';
			requestedProjectIris.push(iri);
			const project = projects.find((candidate) => candidate.iri === iri);
			if (project) {
				await route.fulfill({
					status: 200,
					headers,
					json: {
						projectIri: project.iri,
						projectShortName: project.shortName,
						label: [`${project.label}@de`]
					}
				});
				return;
			}
		}
		await route.fulfill({ status: 404, headers, json: { message: 'Unexpected test request.' } });
	});
	return requestedProjectIris;
}

async function login(page: Page): Promise<void> {
	await page.goto('/login');
	await page.getByLabel('User-ID').fill('researcher');
	await page.getByLabel('Passwort').fill('test-password');
	await page.getByRole('button', { name: 'Anmelden' }).click();
}

test('offers only domain projects and switches into the selected project', async ({ page }) => {
	const projects = [
		{ iri: 'https://example.org/project/archive-a', shortName: 'archive-a', label: 'Archiv A' },
		{ iri: 'https://example.org/project/archive-b', shortName: 'archive-b', label: 'Archiv B' }
	];
	const requestedProjectIris = await mockOldap(page, projects);

	await login(page);
	await expect(page).toHaveURL(/\/projects$/);
	await expect(page.getByRole('heading', { name: 'Arbeitsprojekt auswählen' })).toBeVisible();
	await expect(page.getByRole('link', { name: /Archiv A/ })).toBeVisible();
	await expect(page.getByRole('link', { name: /Archiv B/ })).toBeVisible();
	expect(requestedProjectIris).toEqual(projects.map((project) => project.iri));

	await page.getByRole('link', { name: /Archiv B/ }).click();
	await expect(page).toHaveURL(/\/p\/archive-b$/);
	await expect(
		page.getByLabel('Arbeitsbereich wechseln').getByText('Archiv B', { exact: true })
	).toBeVisible();
});

test('automatically enters the sole domain project', async ({ page }) => {
	await mockOldap(page, [
		{ iri: 'https://example.org/project/archive', shortName: 'archive', label: 'Einzelarchiv' }
	]);

	await login(page);
	await expect(page).toHaveURL(/\/p\/archive$/);
	await expect(
		page.getByLabel('Arbeitsbereich wechseln').getByText('Einzelarchiv', { exact: true })
	).toBeVisible();
});

test('shows an explicit empty state when no domain project is assigned', async ({ page }) => {
	const requestedProjectIris = await mockOldap(page, []);

	await login(page);
	await expect(page).toHaveURL(/\/projects$/);
	await expect(page.getByText('Kein Arbeitsprojekt zugewiesen', { exact: true })).toBeVisible();
	expect(requestedProjectIris).toEqual([]);
});
