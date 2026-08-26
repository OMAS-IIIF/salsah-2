import { expect, test, type Page } from '@playwright/test';

const headers = {
	'Access-Control-Allow-Credentials': 'true',
	'Access-Control-Allow-Headers': 'Authorization, Content-Type',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Origin': 'http://localhost:4173',
	'Content-Type': 'application/json'
};

const projectModel = {
	project: 'chama',
	resources: [
		{
			iri: 'chama:Agent',
			label: ['Akteur@de'],
			properties: []
		},
		{
			iri: 'chama:Person',
			label: ['Person@de'],
			superclass: ['chama:Agent'],
			properties: [{ iri: 'schema:name', name: ['Name@de'], datatype: 'rdf:langString', order: 1 }]
		},
		{
			iri: 'chama:Place',
			label: ['Ort@de'],
			properties: [{ iri: 'schema:name', name: ['Name@de'], datatype: 'rdf:langString', order: 1 }]
		},
		{
			iri: 'chama:CataloguedPhotograph',
			label: ['Erschlossene Fotografie@de'],
			superclass: ['shared:MediaObject'],
			properties: [
				{ iri: 'schema:name', name: ['Titel@de'], datatype: 'rdf:langString', order: 20 },
				{
					iri: 'schema:description',
					name: ['Beschreibung@de'],
					datatype: 'rdf:langString',
					order: 21
				},
				{ iri: 'dcterms:creator', name: ['Urheber@de'], toClass: 'chama:Agent', order: 22 },
				{
					iri: 'chama:creationDating',
					name: ['Entstehungsdatum des Inhalts@de'],
					toClass: 'oldap:Dating',
					order: 23
				},
				{
					iri: 'chama:capturePlace',
					name: ['Aufnahmeort@de'],
					toClass: 'chama:Place',
					order: 24
				},
				{
					iri: 'chama:publicDisplayPermission',
					name: ['Öffentliche Anzeige erlaubt@de'],
					datatype: 'xsd:boolean',
					order: 27
				},
				{
					iri: 'chama:creditLine',
					name: ['Urheberangabe@de'],
					datatype: 'xsd:string',
					order: 28
				}
			]
		}
	]
};

const sharedModel = {
	project: 'shared',
	resources: [
		{
			iri: 'shared:MediaObject',
			label: ['Medienobjekt@de'],
			properties: [
				{ iri: 'dcterms:type', name: ['Medientyp@de'], order: 1 },
				{
					iri: 'shared:mediaAccessMode',
					name: ['Zugriffsmodus@de'],
					datatype: 'xsd:string',
					order: 2
				},
				{
					iri: 'shared:originalName',
					name: ['Originaler Dateiname@de'],
					datatype: 'xsd:string',
					order: 3
				}
			]
		}
	]
};

/** Mock the authenticated project, model, resource, and linked-resource reads. */
async function mockOldap(page: Page, mediaAttached = false): Promise<void> {
	if (mediaAttached) {
		await page.route('http://media.test/**', async (route) => {
			const url = new URL(route.request().url());
			if (url.pathname.endsWith('/info.json')) {
				await route.fulfill({
					status: 200,
					headers,
					json: {
						'@context': 'http://iiif.io/api/image/3/context.json',
						id: 'http://media.test/iiif/3/IMG_1751',
						type: 'ImageService3',
						protocol: 'http://iiif.io/api/image',
						profile: 'level2',
						width: 9944,
						height: 3700,
						tiles: [{ width: 256, scaleFactors: [1, 2, 4, 8, 16, 32, 64] }]
					}
				});
				return;
			}
			await route.fulfill({
				status: 200,
				headers: { ...headers, 'Content-Type': 'image/png' },
				body: Buffer.from(
					'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
					'base64'
				)
			});
		});
	}
	await page.route('http://localhost:8000/**', async (route) => {
		const request = route.request();
		const url = new URL(request.url());
		const path = decodeURIComponent(url.pathname);
		if (request.method() === 'OPTIONS') {
			await route.fulfill({ status: 204, headers });
			return;
		}
		if (path === '/admin/auth/refresh') {
			await route.fulfill({ status: 401, headers, json: { message: 'No session.' } });
			return;
		}
		if (path === '/admin/auth/researcher' && request.method() === 'POST') {
			await route.fulfill({ status: 200, headers, json: { accessToken: 'test-access-token' } });
			return;
		}
		if (path === '/admin/user/researcher') {
			await route.fulfill({
				status: 200,
				headers,
				json: {
					userIri: 'urn:uuid:researcher',
					userId: 'researcher',
					givenName: 'Ada',
					familyName: 'Archivist',
					isActive: true,
					inProjects: [{ project: 'https://chama.salsah.org', permissions: [] }],
					hasRole: {}
				}
			});
			return;
		}
		if (path === '/admin/project/get') {
			await route.fulfill({
				status: 200,
				headers,
				json: {
					projectIri: 'https://chama.salsah.org',
					projectShortName: 'chama',
					label: ['SALSAH-2-Chama-Demo@de']
				}
			});
			return;
		}
		if (path === '/admin/datamodel/chama') {
			await route.fulfill({ status: 200, headers, json: projectModel });
			return;
		}
		if (path === '/admin/datamodel/shared') {
			await route.fulfill({ status: 200, headers, json: sharedModel });
			return;
		}
		if (path === '/data/search/chama' && request.method() === 'POST') {
			await route.fulfill({
				status: 200,
				headers,
				json: [
					{
						iri: 'chama:IMG_1751',
						resclass: 'chama:CataloguedPhotograph',
						'schema:name': ['K-36 #488 im Panorama@de']
					}
				]
			});
			return;
		}
		if (path === '/data/text/chama' && request.method() === 'GET') {
			await route.fulfill({
				status: 200,
				headers,
				json:
					url.searchParams.get('q') === 'Panorama'
						? [
								{
									iri: 'chama:IMG_1751',
									resclass: 'chama:CataloguedPhotograph',
									'schema:description': 'Die Panoramaaufnahme zeigt die Lokomotive Nr. 488.@de'
								},
								{
									iri: 'chama:IMG_1751',
									resclass: 'chama:CataloguedPhotograph',
									'schema:name': 'K-36 #488 im Panorama@de'
								}
							]
						: []
			});
			return;
		}
		if (path === '/data/summaries/chama' && request.method() === 'POST') {
			const body = request.postDataJSON() as { iris: string[] };
			const summaryData: Record<string, { resclass: string; data: Record<string, unknown> }> = {
				'chama:IMG_1751': {
					resclass: 'chama:CataloguedPhotograph',
					data: {
						'rdf:type': ['chama:CataloguedPhotograph'],
						'schema:name': ['K-36 #488 im Panorama@de'],
						...(mediaAttached
							? {
									'shared:mediaAccessMode': ['local'],
									'shared:assetId': ['IMG_1751']
								}
							: {})
					}
				},
				'chama:LukasRosenthaler': {
					resclass: 'chama:Person',
					data: {
						'rdf:type': ['chama:Person'],
						'schema:name': ['Lukas Rosenthaler@de']
					}
				},
				'chama:ChamaStation': {
					resclass: 'chama:Place',
					data: {
						'rdf:type': ['chama:Place'],
						'schema:name': ['Bahnhof Chama@de', 'Chama station@en']
					}
				}
			};
			await route.fulfill({
				status: 200,
				headers,
				json: {
					resources: body.iris.flatMap((iri) => {
						const summary = summaryData[iri];
						return summary
							? [
									{
										iri,
										...summary,
										mediaDelivery:
											iri === 'chama:IMG_1751' && mediaAttached
												? {
														kind: 'iiif-image',
														infoUrl: 'http://media.test/iiif/3/IMG_1751/info.json',
														capability: 'test-media-capability'
													}
												: null
									}
								]
							: [];
					})
				}
			});
			return;
		}
		if (path === '/data/chama/chama:IMG_1751') {
			await route.fulfill({
				status: 200,
				headers,
				json: {
					'rdf:type': ['chama:CataloguedPhotograph'],
					'schema:name': ['K-36 #488 im Panorama@de'],
					'schema:description': ['Die Panoramaaufnahme zeigt die Lokomotive Nr. 488.@de'],
					'dcterms:type': ['dcmitype:StillImage'],
					'dcterms:creator': ['chama:LukasRosenthaler'],
					'chama:creationDating': ['2018-07-10 - 2018-07-10 (GREGORIAN, DAY)'],
					'chama:capturePlace': ['chama:ChamaStation'],
					'shared:mediaAccessMode': ['local'],
					'shared:originalName': ['IMG_1751.HEIC'],
					...(mediaAttached
						? {
								'shared:assetId': ['IMG_1751'],
								'shared:protocol': ['iiif'],
								'shared:serverUrl': ['http://media.test/iiif/3/']
							}
						: {}),
					'chama:publicDisplayPermission': true,
					'chama:creditLine': ['Lukas Rosenthaler'],
					'oldap:attachedToRole': { 'oldap:Unknown': 'DATA_VIEW' }
				}
			});
			return;
		}
		if (path === '/data/mediaobject/iri/chama:IMG_1751' && mediaAttached) {
			await route.fulfill({
				status: 200,
				headers,
				json: {
					'shared:mediaAccessMode': 'local',
					'shared:protocol': 'iiif',
					'shared:serverUrl': 'http://media.test/iiif/3/',
					'shared:assetId': 'IMG_1751',
					token: 'test-media-capability'
				}
			});
			return;
		}
		if (path === '/data/chama/chama:LukasRosenthaler') {
			await route.fulfill({
				status: 200,
				headers,
				json: {
					'rdf:type': ['chama:Person'],
					'schema:name': ['Lukas Rosenthaler@de'],
					'oldap:attachedToRole': { 'oldap:Unknown': 'DATA_VIEW' }
				}
			});
			return;
		}
		if (path === '/data/chama/chama:ChamaStation') {
			await route.fulfill({
				status: 200,
				headers,
				json: {
					'rdf:type': ['chama:Place'],
					'schema:name': ['Bahnhof Chama@de', 'Chama station@en'],
					'oldap:attachedToRole': { 'oldap:Unknown': 'DATA_VIEW' }
				}
			});
			return;
		}
		await route.fulfill({ status: 404, headers, json: { message: `Unexpected ${path}` } });
	});
}

test('renders a live ontology-driven resource and navigates to a linked resource', async ({
	page
}) => {
	await mockOldap(page);
	await page.goto('/login?next=/p/chama/resource/chama%3AIMG_1751');
	await page.getByLabel('User-ID').fill('researcher');
	await page.getByLabel('Passwort').fill('test-password');
	await page.getByRole('button', { name: 'Anmelden' }).click();

	await expect(page).toHaveURL('http://localhost:4173/p/chama/resource/chama:IMG_1751');
	await expect(page.getByRole('heading', { name: 'K-36 #488 im Panorama' })).toBeVisible();
	await expect(page.getByText('Öffentlich lesbar', { exact: true })).toBeVisible();
	await expect(page.getByText('Mediendatei noch nicht importiert', { exact: true })).toBeVisible();
	await expect(page.getByRole('link', { name: /Lukas Rosenthaler/ })).toBeVisible();
	await expect(page.getByRole('link', { name: /Bahnhof Chama/ })).toBeVisible();
	await expect(page.getByText('Originaler Dateiname')).toBeVisible();
	await expect(page.getByText('IMG_1751.HEIC', { exact: true })).toBeVisible();
	await expect(page.getByText('Entstehungsdatum des Inhalts')).toBeVisible();
	await expect(
		page.getByText('2018-07-10 - 2018-07-10 (GREGORIAN, DAY)', { exact: true })
	).toBeVisible();

	await page.getByRole('link', { name: /Lukas Rosenthaler/ }).click();
	await expect(page).toHaveURL('http://localhost:4173/p/chama/resource/chama%3ALukasRosenthaler');
	await expect(page.getByRole('heading', { name: 'Lukas Rosenthaler' })).toBeVisible();
	await expect(page.getByText('Person', { exact: true })).toBeVisible();

	await page.getByRole('link', { name: 'Zurück zum Arbeitsbereich' }).click();
	await expect(page.getByRole('heading', { name: 'Zuletzt erfasst' })).toBeVisible();
	const liveResource = page.getByRole('link', { name: /K-36 #488 im Panorama/ });
	await expect(liveResource).toBeVisible();
	await liveResource.click();
	await expect(page).toHaveURL('http://localhost:4173/p/chama/resource/chama%3AIMG_1751');
	await expect(page.getByRole('heading', { name: 'K-36 #488 im Panorama' })).toBeVisible();
});

test('opens an attached local image in the generic IIIF viewer', async ({ page }) => {
	await mockOldap(page, true);
	await page.goto('/login?next=/p/chama/resource/chama%3AIMG_1751');
	await page.getByLabel('User-ID').fill('researcher');
	await page.getByLabel('Passwort').fill('test-password');
	await page.getByRole('button', { name: 'Anmelden' }).click();

	const viewer = page.getByRole('region', { name: 'IIIF-Bildansicht: K-36 #488 im Panorama' });
	await expect(viewer).toBeVisible();
	await expect(viewer.getByRole('button', { name: 'Vergrössern' })).toBeVisible();
	await expect(page.getByText('Mediendatei noch nicht importiert', { exact: true })).toHaveCount(0);
	await expect(page.getByText('Hochauflösendes Bild wird geladen …')).toHaveCount(0);
});

test('shows real project resources with an authorized image preview', async ({ page }) => {
	await mockOldap(page, true);
	await page.goto('/login?next=/p/chama/resource/chama%3AIMG_1751');
	await page.getByLabel('User-ID').fill('researcher');
	await page.getByLabel('Passwort').fill('test-password');
	await page.getByRole('button', { name: 'Anmelden' }).click();
	await page.getByRole('link', { name: 'Zurück zum Arbeitsbereich' }).click();

	await expect(page).toHaveURL('http://localhost:4173/p/chama');
	await expect(page.getByRole('heading', { name: 'Zuletzt erfasst' })).toBeVisible();
	const card = page.getByRole('link', { name: /K-36 #488 im Panorama/ });
	await expect(card).toBeVisible();
	await expect(card.getByText('Erschlossene Fotografie', { exact: true })).toBeVisible();
	await expect(card.locator('img')).toHaveAttribute(
		'src',
		'http://media.test/iiif/3/IMG_1751/full/!720,480/0/default.jpg?token=test-media-capability'
	);
	await expect(page.getByText('Nachlass Jacob Burckhardt')).toHaveCount(0);
	await expect(page.getByText('14’286')).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Daten importieren' })).toHaveCount(0);
});

test('searches the current project from the header and shows a unique live result', async ({
	page
}) => {
	await mockOldap(page, true);
	await page.goto('/login?next=/p/chama/resource/chama%3AIMG_1751');
	await page.getByLabel('User-ID').fill('researcher');
	await page.getByLabel('Passwort').fill('test-password');
	await page.getByRole('button', { name: 'Anmelden' }).click();

	const headerSearch = page.getByLabel('Globale Suche');
	await headerSearch.fill('Panorama');
	await headerSearch.press('Enter');

	await expect(page).toHaveURL('http://localhost:4173/p/chama/search?q=Panorama');
	await expect(page.getByRole('heading', { name: 'Treffer für „Panorama“' })).toBeVisible();
	await expect(page.getByText('1 Treffer angezeigt', { exact: true })).toBeVisible();
	const result = page.getByRole('link', { name: /K-36 #488 im Panorama/ });
	await expect(result).toHaveCount(1);
	await expect(result.getByText('Erschlossene Fotografie', { exact: true })).toBeVisible();
	await expect(result.locator('img')).toHaveAttribute(
		'src',
		'http://media.test/iiif/3/IMG_1751/full/!720,480/0/default.jpg?token=test-media-capability'
	);
});
