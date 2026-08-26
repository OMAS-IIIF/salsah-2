import { expect, test, type Page } from '@playwright/test';

const archiveUnits = [
	{
		iri: 'chama:ChamaRailwayHeritageDemo',
		resclass: 'shared:ArchiveUnit',
		'schema:name': ['Chama Railway Heritage Demo@en'],
		'shared:archiveLevel': ['shared:ArchiveGroup'],
		'schema:position': [1]
	},
	{
		iri: 'chama:LukasRosenthalerRailwayPhotographs',
		resclass: 'shared:ArchiveUnit',
		'schema:name': ['Eisenbahnfotografien Lukas Rosenthaler@de'],
		'shared:archiveLevel': ['shared:Series'],
		'shared:parentArchiveUnit': ['chama:ChamaRailwayHeritageDemo'],
		'schema:position': [1]
	},
	{
		iri: 'chama:RuediSingerRailwayPhotographs1981',
		resclass: 'shared:ArchiveUnit',
		'schema:name': ['Eisenbahnfotografien Ruedi Singer 1981@de'],
		'shared:archiveLevel': ['shared:Series'],
		'shared:parentArchiveUnit': ['chama:ChamaRailwayHeritageDemo'],
		'schema:position': [2]
	},
	{
		iri: 'chama:LukasRosenthalerChama2023',
		resclass: 'shared:ArchiveUnit',
		'schema:name': ['Chama 2023@de'],
		'shared:archiveLevel': ['shared:File'],
		'shared:parentArchiveUnit': ['chama:LukasRosenthalerRailwayPhotographs'],
		'shared:hasMediaObject': ['chama:IMG_0171'],
		'schema:position': [2]
	},
	{
		iri: 'chama:LobatoTrestlePhotograph1981',
		resclass: 'chama:PhotographicWork',
		'schema:name': ['Lobato Trestle auf der Cumbres & Toltec Scenic Railroad@de'],
		'shared:archiveLevel': ['shared:Item'],
		'shared:parentArchiveUnit': ['chama:RuediSingerRailwayPhotographs1981'],
		'schema:position': [1]
	}
];

/** Provide authenticated project and archive-search fixtures. */
async function mockOldap(
	page: Page
): Promise<{ requestedParents: string[]; requestedMedia: string[] }> {
	const requestedParents: string[] = [];
	const requestedMedia: string[] = [];
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
			await route.fulfill({ status: 200, headers, json: { accessToken: 'test-token' } });
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
					inProjects: [{ project: 'https://chama.salsah.org', permissions: [] }],
					hasRole: {}
				}
			});
			return;
		}
		if (url.pathname === '/admin/project/get') {
			await route.fulfill({
				status: 200,
				headers,
				json: {
					projectIri: 'https://chama.salsah.org',
					projectShortName: 'chama',
					label: ['SALSAH 2 Chama Demo@de']
				}
			});
			return;
		}
		if (url.pathname === '/data/search/chama') {
			const body = request.postDataJSON() as {
				resClass?: string;
				filter?: Array<{ op?: string; value?: string }>;
			};
			if (body.resClass === 'oldap:Thing') {
				await route.fulfill({ status: 200, headers, json: [] });
				return;
			}
			const parent = body.filter?.[0]?.value ?? '';
			requestedParents.push(parent || '<root>');
			await route.fulfill({
				status: 200,
				headers,
				json: archiveUnits.filter((unit) =>
					parent
						? unit['shared:parentArchiveUnit']?.includes(parent)
						: !unit['shared:parentArchiveUnit']
				)
			});
			return;
		}
		if (url.pathname === '/data/summaries/chama') {
			const body = request.postDataJSON() as { iris?: string[] };
			requestedMedia.push(...(body.iris ?? []));
			await route.fulfill({
				status: 200,
				headers,
				json: {
					resources: (body.iris ?? []).map((iri) => ({
						iri,
						resclass: 'chama:CataloguedPhotograph',
						data: {
							'rdf:type': ['chama:CataloguedPhotograph'],
							'schema:name': ["Foster's Hotel and Saloon@en"]
						},
						mediaDelivery: {
							kind: 'external-image',
							url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="60"%3E%3Crect width="80" height="60" fill="%23b96a43"/%3E%3C/svg%3E',
							thumbnailUrl: null
						}
					}))
				}
			});
			return;
		}
		await route.fulfill({ status: 404, headers, json: { message: 'Unexpected test request.' } });
	});
	return { requestedParents, requestedMedia };
}

test('loads the archive incrementally and links units to generic details', async ({ page }) => {
	const { requestedParents, requestedMedia } = await mockOldap(page);
	await page.goto('/login');
	await page.getByLabel('User-ID').fill('researcher');
	await page.getByLabel('Passwort').fill('test-password');
	await page.getByRole('button', { name: 'Anmelden' }).click();
	await page.getByRole('link', { name: 'Archiv', exact: true }).click();

	await expect(page).toHaveURL(/\/p\/chama\/archive$/);
	await expect(page.getByRole('heading', { name: 'Archiv erkunden' })).toBeVisible();
	await expect(page.getByText('Chama Railway Heritage Demo', { exact: true })).toBeVisible();
	await expect(page.getByText('Eisenbahnfotografien Ruedi Singer 1981')).toHaveCount(0);

	await page.getByRole('button', { name: 'Chama Railway Heritage Demo aufklappen' }).click();
	await expect(page.getByText('Eisenbahnfotografien Ruedi Singer 1981')).toBeVisible();
	await page
		.getByRole('button', { name: 'Eisenbahnfotografien Lukas Rosenthaler aufklappen' })
		.click();
	await page.getByRole('button', { name: 'Chama 2023 aufklappen' }).click();
	const media = page.getByRole('link', { name: /Foster's Hotel and Saloon/ });
	await expect(media).toBeVisible();
	await expect(media).toHaveAttribute('href', '/p/chama/resource/chama%3AIMG_0171');
	await expect(media.locator('img')).toBeVisible();

	await page
		.getByRole('button', { name: 'Eisenbahnfotografien Ruedi Singer 1981 aufklappen' })
		.click();

	const item = page.getByRole('link', {
		name: /Lobato Trestle auf der Cumbres & Toltec Scenic Railroad/
	});
	await expect(item).toBeVisible();
	await expect(item).toHaveAttribute(
		'href',
		'/p/chama/resource/chama%3ALobatoTrestlePhotograph1981'
	);
	await expect
		.poll(() => requestedParents)
		.toEqual([
			'<root>',
			'chama:ChamaRailwayHeritageDemo',
			'chama:LukasRosenthalerRailwayPhotographs',
			'chama:LukasRosenthalerChama2023',
			'chama:RuediSingerRailwayPhotographs1981'
		]);
	await expect.poll(() => requestedMedia).toEqual(['chama:IMG_0171']);
});
