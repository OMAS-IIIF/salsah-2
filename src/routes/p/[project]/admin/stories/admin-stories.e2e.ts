import { expect, test, type Page } from '@playwright/test';

const headers = {
	'Access-Control-Allow-Credentials': 'true',
	'Access-Control-Allow-Headers': 'Authorization, Content-Type',
	'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
	'Access-Control-Allow-Origin': 'http://localhost:4173',
	'Content-Type': 'application/json'
};

const storyIri = 'chama:ChamaFromPlatToLivingRailway';
let storyText: string[];
let storyName: string[];
let storyAbstract: string[];
let storyAuthor: string[];
let storyMentions: string[];
let lastUpdate: Record<string, unknown> | null;
let lastCreate: Record<string, unknown> | null;

async function mockOldap(page: Page): Promise<void> {
	storyText = [
		'## Die Eisenbahn fährt weiter\n\nVor der Abfahrt steht Lokomotive 488 in Chama.\n\n:::asset{iri="chama:IMG_1751"}\n:::@de',
		'## The railway keeps moving\n\nLocomotive 488 is ready to depart.\n\n:::asset{iri="chama:IMG_1751"}\n:::@en'
	];
	storyName = [
		'Chama: vom Vermessungsplan zur lebendigen Eisenbahn@de',
		'Chama: from survey plat to living railway@en'
	];
	storyAbstract = [
		'Drei Quellen verbinden Vergangenheit und Gegenwart.@de',
		'Three sources connect past and present.@en'
	];
	storyAuthor = ['chama:LukasRosenthaler'];
	storyMentions = ['chama:IMG_1751'];
	lastUpdate = null;
	lastCreate = null;
	await page.route('https://images.test/**', (route) =>
		route.fulfill({
			status: 200,
			headers: { ...headers, 'Content-Type': 'image/png' },
			body: Buffer.from(
				'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
				'base64'
			)
		})
	);
	await page.route('http://localhost:8000/**', async (route) => {
		const request = route.request();
		const path = decodeURIComponent(new URL(request.url()).pathname);
		if (request.method() === 'OPTIONS') {
			await route.fulfill({ status: 204, headers });
			return;
		}
		if (path === '/admin/auth/refresh') {
			await route.fulfill({ status: 401, headers, json: { message: 'No session.' } });
			return;
		}
		if (path === '/admin/auth/researcher' && request.method() === 'POST') {
			await route.fulfill({ status: 200, headers, json: { accessToken: 'test-token' } });
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
					hasRole: { 'chama:Curator': 'DATA_PERMISSIONS' }
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
			await route.fulfill({
				status: 200,
				headers,
				json: {
					project: 'chama',
					resources: [
						{
							iri: 'chama:Story',
							label: ['Geschichte@de'],
							properties: [
								{ iri: 'schema:name', datatype: 'rdf:langString' },
								{ iri: 'schema:text', datatype: 'rdf:langString' },
								{ iri: 'schema:author', toClass: 'chama:Person' }
							]
						},
						{
							iri: 'chama:StorySection',
							label: ['Geschichtenabschnitt@de'],
							properties: [{ iri: 'schema:text', datatype: 'rdf:langString' }]
						},
						{
							iri: 'chama:CataloguedPhotograph',
							label: ['Katalogisierte Fotografie@de'],
							properties: [{ iri: 'schema:name', datatype: 'rdf:langString' }]
						}
					]
				}
			});
			return;
		}
		if (path === '/admin/role/search' && request.method() === 'GET') {
			await route.fulfill({ status: 200, headers, json: ['chama:Curator'] });
			return;
		}
		if (path === '/data/search/chama' && request.method() === 'POST') {
			const body = request.postDataJSON() as { resClass?: string };
			await route.fulfill({
				status: 200,
				headers,
				json:
					body.resClass === 'chama:Story'
						? [
								{
									iri: storyIri,
									resclass: 'chama:Story',
									'schema:name': ['Chama: vom Vermessungsplan zur lebendigen Eisenbahn@de'],
									'schema:abstract': ['Drei Quellen verbinden Vergangenheit und Gegenwart.@de']
								}
							]
						: body.resClass === 'chama:Person'
							? [
									{
										iri: 'chama:AdaArchivist',
										resclass: 'chama:Person',
										'schema:name': ['Ada Archivist@de']
									},
									{
										iri: 'chama:LukasRosenthaler',
										resclass: 'chama:Person',
										'schema:name': ['Lukas Rosenthaler@de']
									}
								]
							: [
									{
										iri: 'chama:IMG_1520',
										resclass: 'chama:CataloguedPhotograph',
										'schema:name': ['Stationsgebäude in Chama@de']
									}
								]
			});
			return;
		}
		if (path === '/data/chama/Story' && request.method() === 'PUT') {
			lastCreate = request.postDataJSON() as Record<string, unknown>;
			await route.fulfill({
				status: 200,
				headers,
				json: { message: 'OK', iri: 'urn:uuid:new-story' }
			});
			return;
		}
		if (path === '/data/chama/urn:uuid:new-story' && request.method() === 'GET') {
			await route.fulfill({
				status: 200,
				headers,
				json: {
					'rdf:type': ['chama:Story'],
					'schema:name': ['Eine neue Chama-Geschichte@de'],
					'schema:author': ['chama:AdaArchivist'],
					'oldap:attachedToRole': { 'chama:Curator': 'DATA_PERMISSIONS' }
				}
			});
			return;
		}
		if (path === '/data/text/chama' && request.method() === 'GET') {
			const query = new URL(request.url()).searchParams.get('q');
			await route.fulfill({
				status: 200,
				headers,
				json:
					query === 'Station'
						? [
								{
									iri: 'chama:IMG_1520',
									resclass: 'chama:CataloguedPhotograph',
									'schema:name': ['Stationsgebäude in Chama@de']
								}
							]
						: []
			});
			return;
		}
		if (path === `/data/chama/${storyIri}` && request.method() === 'GET') {
			await route.fulfill({
				status: 200,
				headers,
				json: {
					'rdf:type': ['chama:Story'],
					'schema:name': storyName,
					'schema:abstract': storyAbstract,
					'schema:author': storyAuthor,
					'schema:text': storyText,
					'schema:mentions': storyMentions,
					'oldap:attachedToRole': { 'chama:Curator': 'DATA_PERMISSIONS' }
				}
			});
			return;
		}
		if (path === `/data/chama/${storyIri}` && request.method() === 'POST') {
			lastUpdate = request.postDataJSON() as Record<string, unknown>;
			storyName = lastUpdate['schema:name'] as string[];
			storyAbstract = (lastUpdate['schema:abstract'] as string[] | null) ?? [];
			storyAuthor = [lastUpdate['schema:author'] as string];
			storyText = lastUpdate['schema:text'] as string[];
			storyMentions = (lastUpdate['schema:mentions'] as string[] | null) ?? [];
			await route.fulfill({ status: 200, headers, json: { message: 'updated' } });
			return;
		}
		if (path === '/data/summaries/chama') {
			const body = request.postDataJSON() as { iris?: string[] };
			const summaries = {
				'chama:IMG_1751': {
					iri: 'chama:IMG_1751',
					resclass: 'chama:CataloguedPhotograph',
					data: { 'schema:name': ['K-36 #488 im Panorama@de'] },
					mediaDelivery: {
						kind: 'external-image',
						url: 'https://images.test/IMG_1751.png',
						thumbnailUrl: null
					}
				},
				'chama:IMG_1520': {
					iri: 'chama:IMG_1520',
					resclass: 'chama:CataloguedPhotograph',
					data: { 'schema:name': ['Stationsgebäude in Chama@de'] },
					mediaDelivery: {
						kind: 'external-image',
						url: 'https://images.test/IMG_1520.png',
						thumbnailUrl: null
					}
				}
			} as const;
			await route.fulfill({
				status: 200,
				headers,
				json: {
					resources: (body.iris ?? []).flatMap((iri) =>
						iri in summaries ? [summaries[iri as keyof typeof summaries]] : []
					)
				}
			});
			return;
		}
		await route.fulfill({ status: 404, headers, json: { message: `Unexpected ${path}` } });
	});
}

test('opens administration and safely edits an existing multilingual Story', async ({ page }) => {
	await mockOldap(page);
	await page.goto('/login?next=/p/chama/admin');
	await page.getByLabel('User-ID').fill('researcher');
	await page.getByLabel('Passwort').fill('test-password');
	await page.getByRole('button', { name: 'Anmelden' }).click();

	await expect(page.getByRole('heading', { name: 'Verwaltung' })).toBeVisible();
	await page.getByRole('link', { name: /Geschichten/ }).click();
	await expect(page.getByRole('heading', { name: 'Geschichten' })).toBeVisible();
	await page
		.getByRole('link', { name: /Chama: vom Vermessungsplan zur lebendigen Eisenbahn/ })
		.click();

	const editor = page.getByRole('textbox', { name: 'Markdown' });
	const title = page.getByLabel('Titel', { exact: true });
	const summary = page.getByLabel('Zusammenfassung', { exact: true });
	const author = page.getByRole('combobox', { name: 'Autor oder Autorin', exact: true });
	await expect(title).toHaveValue('Chama: vom Vermessungsplan zur lebendigen Eisenbahn');
	await expect(summary).toHaveValue('Drei Quellen verbinden Vergangenheit und Gegenwart.');
	await expect(author).toHaveValue('chama:LukasRosenthaler');
	await title.fill('Chama: Plan und lebendige Eisenbahn');
	await summary.fill('Ein knapper neuer Überblick.');
	await author.selectOption('chama:AdaArchivist');
	await expect(editor).toHaveValue(/Vor der Abfahrt steht Lokomotive 488 in Chama\./);
	await editor.fill(`${await editor.inputValue()}\n\nEin zusätzlicher Testsatz.`);
	await expect(page.getByText('Ein zusätzlicher Testsatz.')).toBeVisible();

	await page.getByRole('button', { name: 'Asset einfügen' }).click();
	const picker = page.getByRole('dialog', { name: 'Asset auswählen' });
	await expect(picker).toBeVisible();
	await picker.getByRole('searchbox').fill('Station');
	await picker.getByRole('button', { name: 'Suchen' }).click();
	await picker.getByRole('button', { name: /Stationsgebäude in Chama/ }).click();
	await expect(editor).toHaveValue(/:::asset\{iri="chama:IMG_1520"\}/);
	await expect(page.getByText('Stationsgebäude in Chama')).toBeVisible();

	await page.getByRole('button', { name: 'Speichern' }).click();
	await expect(page.getByText('Gespeichert und geprüft')).toBeVisible();

	expect(lastUpdate).not.toBeNull();
	expect(lastUpdate?.['schema:name']).toEqual([
		'Chama: Plan und lebendige Eisenbahn@de',
		'Chama: from survey plat to living railway@en'
	]);
	expect(lastUpdate?.['schema:abstract']).toEqual([
		'Ein knapper neuer Überblick.@de',
		'Three sources connect past and present.@en'
	]);
	expect(lastUpdate?.['schema:author']).toBe('chama:AdaArchivist');
	expect(lastUpdate?.['schema:mentions']).toEqual(['chama:IMG_1751', 'chama:IMG_1520']);
	expect(lastUpdate?.['schema:text']).toEqual(
		expect.arrayContaining([
			expect.stringContaining('Ein zusätzlicher Testsatz.'),
			expect.stringContaining(':::asset{iri="chama:IMG_1520"}')
		])
	);
});

test('creates a private Story with a generated IRI and opens the empty editor', async ({
	page
}) => {
	await mockOldap(page);
	await page.goto('/login?next=/p/chama/admin/stories');
	await page.getByLabel('User-ID').fill('researcher');
	await page.getByLabel('Passwort').fill('test-password');
	await page.getByRole('button', { name: 'Anmelden' }).click();

	await page.getByRole('link', { name: /Neue Geschichte/ }).click();
	await expect(page.getByRole('heading', { name: 'Neue Geschichte' })).toBeVisible();
	await page.getByLabel('Titel').fill('Eine neue Chama-Geschichte');
	await expect(page.getByLabel('Autor oder Autorin')).toHaveValue('chama:AdaArchivist');
	await expect(page.getByLabel('Verantwortliche Projektrolle')).toHaveValue('chama:Curator');
	await page.getByRole('button', { name: 'Geschichte anlegen' }).click();

	await expect(page).toHaveURL(/\/admin\/stories\/urn%3Auuid%3Anew-story\?language=de$/);
	await expect(page.getByRole('heading', { name: 'Eine neue Chama-Geschichte' })).toBeVisible();
	await expect(page.getByRole('textbox', { name: 'Markdown' })).toHaveValue('');
	await expect(page.getByRole('combobox', { name: 'Sprache', exact: true })).toHaveValue('de');
	expect(lastCreate).toEqual({
		'schema:name': ['Eine neue Chama-Geschichte@de'],
		'schema:author': 'chama:AdaArchivist',
		'oldap:attachedToRole': { 'chama:Curator': 'DATA_PERMISSIONS' }
	});
	expect(lastCreate).not.toHaveProperty('iri');
	expect(lastCreate).not.toHaveProperty('schema:text');
});
