import { expect, test, type Page } from '@playwright/test';

/** A museum fixture exercises Shared semantics without a project-domain import or live writes. */
async function museum(page: Page, manage = true, uncertainMove = false) {
	const headers = {
		'Access-Control-Allow-Origin': 'http://localhost:4173',
		'Access-Control-Allow-Credentials': 'true',
		'Access-Control-Allow-Headers': 'Authorization, Content-Type, Idempotency-Key',
		'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
		'Content-Type': 'application/json'
	};
	const iri = (name: string) => `urn:as07:${name}`;
	const token =
		'e30.' + Buffer.from(JSON.stringify({ sub: 'researcher' })).toString('base64url') + '.fixture';
	const commands: { body: unknown; id: string }[] = [];
	const moves: { body: unknown; id: string }[] = [];
	const mutations: string[] = [];
	let logged = false;
	let catalogued = false;
	let moved = false;
	let editedName = 'Museum collection';
	const folder = (name: string, parent: string | null) => ({
		iri: iri(name),
		resclass: 'shared:StagingFolder',
		'schema:name': [name],
		'shared:inStagingArea': [iri('area')],
		...(parent ? { 'shared:inStagingFolder': [iri(parent)] } : {})
	});
	const folders = [folder('top', null), folder('Incoming', 'top'), folder('Destination', 'top')];
	const record = (name: string) => ({
		'rdf:type': [
			name === 'draft' && !catalogued ? 'shared:StagingMediaObject' : 'museum:Photograph'
		],
		'schema:name': [name + '@de'],
		'shared:originalName': [name + '.jpg'],
		'shared:originalMimeType': ['image/jpeg'],
		'shared:assetId': [name],
		'shared:checksum': ['hash-' + name],
		permval: name === 'draft' && !catalogued ? 4 : 2
	});
	const entry = (name: string) => ({
		kind: name === 'draft' && !catalogued ? 'stagingMedia' : 'archiveReference',
		mediaIri: iri(name),
		title: name + '.jpg',
		canDownloadOriginal: true,
		canEditMetadata: name === 'draft' && !catalogued,
		canMove: true,
		canDeleteMedia: name === 'draft' && !catalogued
	});
	await page.route('http://localhost:8000/**', async (route) => {
		const request = route.request(),
			url = new URL(request.url()),
			path = decodeURIComponent(url.pathname);
		const body = request.postData() ? request.postDataJSON() : null;
		const reply = (json: unknown, status = 200) => route.fulfill({ status, headers, json });
		if (request.method() === 'OPTIONS') return reply({}, 204);
		if (path === '/admin/auth/refresh')
			return logged ? reply({ accessToken: token }) : reply({}, 401);
		if (path === '/admin/auth/researcher') {
			logged = true;
			return reply({ accessToken: token });
		}
		if (path === '/admin/user/researcher')
			return reply({
				userIri: iri('user'),
				userId: 'researcher',
				givenName: 'Ada',
				familyName: 'Curator',
				isActive: true,
				inProjects: [{ project: 'https://museum.example', permissions: [] }],
				hasRole: {}
			});
		if (path === '/admin/project/get')
			return reply({
				projectIri: 'https://museum.example',
				projectShortName: 'museum',
				label: ['Museum@de']
			});
		if (path === '/archive/museum/structure/capabilities')
			return reply({
				enabled: true,
				canManageStructure: manage,
				canCreateUnits: manage,
				maxMutations: 500
			});
		if (path === '/archive/museum/structure/proposal')
			return reply({
				folders: [{ iri: iri('Incoming'), name: 'Incoming', mappingState: 'unmapped' }],
				warnings: [],
				suggestedPlan: {
					sourceFolderIri: iri('Incoming'),
					sourceSnapshot: 'a'.repeat(64),
					newUnits: [
						{
							key: 'u1',
							name: { de: 'Incoming', fr: 'Entrée' },
							archiveLevel: 'shared:Series',
							parent: null
						}
					],
					mappings: [{ folderIri: iri('Incoming'), action: 'set', target: { key: 'u1' } }]
				}
			});
		if (path === '/archive/museum/structure/preflight')
			return reply({
				reviewDigest: 'b'.repeat(64),
				counts: { create: body.plan.newUnits.length, set: 1, clear: 0, skip: 0 },
				warnings: []
			});
		if (path === '/archive/museum/structure/apply') {
			expect(body.confirm).toBe(true);
			commands.push({ body, id: request.headers()['idempotency-key'] });
			if (commands.length === 1) return route.abort();
			return reply({ state: 'committed', operationId: commands[0].id });
		}
		if (path === '/data/museum/staging-folder-inventory') {
			const current = url.searchParams.get('folderIri');
			return reply({
				folderIri: current,
				revision: 'c'.repeat(64),
				entries:
					current === iri('Incoming')
						? [...(moved ? [] : [entry('reference')]), entry('draft')]
						: current === iri('Destination')
							? [entry('reference')]
							: [],
				nextCursor: null,
				warnings: []
			});
		}
		if (path === '/data/museum/staging-reference-move') {
			expect(body.sourceRevision).toBe('c'.repeat(64));
			expect(body.targetRevision).toBe('c'.repeat(64));
			moves.push({ body, id: request.headers()['idempotency-key'] });
			if (uncertainMove && moves.length === 1) {
				moved = true;
				return route.abort();
			}
			moved = true;
			return reply({ state: 'committed', operationId: request.headers()['idempotency-key'] });
		}
		if (path === `/data/museum/${iri('draft')}/transform`) {
			expect(body.linkFrom).toEqual({
				resourceIri: iri('unit'),
				property: 'shared:hasMediaObject'
			});
			expect(body.targetClass).toBe('museum:Photograph');
			catalogued = true;
			return reply({ iri: iri('draft'), resourceClass: 'museum:Photograph' });
		}
		if (path === `/data/museum/${iri('draft')}`)
			return reply({ ...record('draft'), 'schema:name': ['Reviewed museum image@de'] });
		if (path === `/data/museum/${iri('reference')}`) return reply(record('reference'));
		if (path === `/data/museum/${iri('Incoming')}`) {
			if (request.method() === 'POST') {
				if (body['schema:name']) folders[1]['schema:name'] = [body['schema:name']];
				if (body['shared:inStagingFolder'])
					folders[1]['shared:inStagingFolder'] = body['shared:inStagingFolder'];
			}
			return reply({ ...folders[1], 'shared:defaultArchiveUnit': [iri('unit')] });
		}
		if (path === `/data/museum/${iri('unit')}`) {
			if (request.method() === 'POST') {
				mutations.push(path);
				editedName = body['schema:name'][0].replace(/@de$/, '');
			}
			return reply({
				'rdf:type': ['shared:ArchiveUnit'],
				'schema:name': [editedName + '@de'],
				'shared:archiveLevel': ['shared:Fonds'],
				permval: 4
			});
		}
		if (path === '/data/summaries/museum')
			return reply({
				resources: (body.iris ?? []).map((id: string) => ({
					iri: id,
					resclass:
						id === iri('draft') && !catalogued ? 'shared:StagingMediaObject' : 'museum:Photograph',
					data: record(id.split(':').at(-1)!),
					mediaDelivery: null
				}))
			});
		if (path === '/data/search/museum') {
			if (body.resClass === 'shared:StagingArea')
				return reply([
					{
						iri: iri('area'),
						resclass: 'shared:StagingArea',
						'schema:name': ['Private museum workspace@de']
					}
				]);
			if (body.resClass === 'shared:StagingFolder') {
				const filter = body.filter?.find(
					(f: { property: string }) => f.property === 'shared:inStagingFolder'
				);
				return reply(
					filter
						? folders.filter((f) =>
								filter.op === 'NOT_EXISTS'
									? !f['shared:inStagingFolder']
									: f['shared:inStagingFolder']?.[0] === filter.value
							)
						: folders
				);
			}
			if (body.resClass === 'shared:ArchiveUnit')
				return reply([
					{
						iri: iri('unit'),
						resclass: 'shared:ArchiveUnit',
						'schema:name': [editedName + '@de'],
						'shared:archiveLevel': ['shared:Fonds']
					}
				]);
			return reply([]);
		}
		if (path === '/admin/datamodel/museum')
			return reply({
				project: 'museum',
				resources: [
					{
						iri: 'museum:Photograph',
						label: ['Museum photograph@de'],
						superclass: ['shared:MediaObject'],
						properties: [
							{
								iri: 'schema:name',
								name: ['Titel@de'],
								datatype: 'rdf:langString',
								minCount: 1,
								maxCount: 1
							}
						]
					}
				]
			});
		if (path === '/admin/datamodel/shared')
			return reply({
				project: 'shared',
				resources: [
					{
						iri: 'shared:MediaObject',
						properties: [
							{ iri: 'shared:assetId', datatype: 'xsd:string' },
							{ iri: 'shared:checksum', datatype: 'xsd:string' }
						]
					}
				]
			});
		if (path === '/imports') return reply({ items: [] });
		if (path === '/exports/estimate') {
			expect(body.kind).toBe('STAGING_FOLDER');
			return reply({ filesTotal: 2, sourceBytes: 40, warningCount: 0, exceedsLimit: false });
		}
		if (path === '/exports')
			return reply({ exportId: 'fixture-export', state: 'READY', canDownload: true });
		if (path === '/exports/fixture-export/download-capability')
			return reply({ url: 'http://media.test/export/fixture.zip?token=fixture', method: 'GET' });
		if (request.method() !== 'GET') mutations.push(path);
		return reply({ message: 'Unhandled fixture request: ' + path }, 404);
	});
	await page.goto('http://localhost:4173/login?next=/p/museum/admin');
	await page.getByLabel('User-ID').fill('researcher');
	await page.getByLabel('Passwort').fill('secret');
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page).toHaveURL(/\/p\/museum/);
	return { iri, commands, moves, mutations };
}

test('review invalidation, exact adoption recovery and protected admin capability', async ({
	page
}) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));
	const { iri, commands } = await museum(page);
	await page.goto('http://localhost:4173/p/museum/admin/archive');
	await page
		.getByText('Struktur ergänzen – aus Arbeitsordnern übernehmen', { exact: true })
		.click();
	await page.getByLabel('Quellordner').selectOption(iri('Incoming'));
	await page.getByRole('button', { name: 'Vorschlag erstellen', exact: true }).click();
	await page.getByRole('button', { name: 'Änderungen prüfen', exact: true }).click();
	await expect(page.getByLabel('Ich bestätige diesen geprüften Vorschlag.')).toBeVisible();
	await page.getByLabel('Name', { exact: true }).fill('Museum intake');
	await expect(page.getByLabel('Ich bestätige diesen geprüften Vorschlag.')).not.toBeVisible();
	await page.getByRole('button', { name: 'Änderungen prüfen', exact: true }).click();
	await page.getByLabel('Ich bestätige diesen geprüften Vorschlag.').check();
	await page.getByRole('button', { name: 'Geprüfte Änderungen übernehmen' }).click();
	await expect(
		page.getByRole('button', { name: 'Ungewissen Vorgang identisch wiederholen' })
	).toBeVisible();
	await page.reload();
	await page.getByRole('button', { name: 'Ungewissen Vorgang identisch wiederholen' }).click();
	await expect(page.getByText('Änderungen übernommen.')).toBeVisible();
	expect(commands).toHaveLength(2);
	expect(commands[0]).toEqual(commands[1]);
	await page.getByRole('button', { name: 'Museum collection', exact: true }).click();
	await page.getByLabel('Name', { exact: true }).fill('Curated collection');
	await page
		.getByRole('combobox', { name: 'Archivstufe', exact: true })
		.selectOption('shared:Series');
	await page.getByRole('button', { name: 'Speichern', exact: true }).click();
	await expect(page.getByText('Auswahl: Curated collection')).toBeVisible();
	await page.evaluate(() => window.scrollTo(0, 0));
	await page.screenshot({ path: 'test-results/as07-admin.png', fullPage: true });
	expect(errors).toEqual([]);
});

test('museum catalogue retains a protected reference, recovers its private move and exports mixed originals', async ({
	page
}) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));
	const { moves } = await museum(page, true, true);
	await page.goto('http://localhost:4173/p/museum/admin/staging');
	await page.getByRole('button', { name: 'top aufklappen' }).click();
	await page.getByRole('button', { name: 'Incoming aufklappen' }).click();
	await expect(page.getByLabel('reference.jpg auswählen')).toBeDisabled();
	await expect(page.getByLabel('draft.jpg auswählen')).toBeEnabled();
	await page.getByRole('button', { name: 'Destination aufklappen' }).click();
	await expect(page.getByLabel('reference.jpg auswählen')).toHaveCount(2);
	await page.getByRole('button', { name: 'Destination zuklappen' }).click();
	const incoming = page
		.getByRole('treeitem')
		.filter({ has: page.getByRole('link', { name: /Incoming/ }) })
		.first();
	await incoming.getByText('ZIP herunterladen', { exact: true }).click();
	await incoming.getByRole('button', { name: 'Änderungen prüfen' }).click();
	await expect(incoming.getByText(/2\s+Dateien/)).toBeVisible();
	await incoming.getByRole('button', { name: 'ZIP erstellen' }).click();
	await incoming.getByRole('button', { name: 'ZIP herunterladen' }).click();
	await expect(incoming.getByRole('link', { name: 'Download öffnen' })).toHaveAttribute(
		'href',
		/fixture.zip\?token=fixture/
	);
	await page.getByRole('button', { name: 'draft.jpg prüfen' }).click();
	await page.getByRole('button', { name: 'Katalogisieren', exact: true }).click();
	await expect(page.getByText('Auswahl: Museum collection')).toBeVisible();
	await page.getByLabel('Titel *').fill('Reviewed museum image');
	await page.getByRole('button', { name: 'Katalogisierung abschliessen', exact: true }).click();
	await expect(
		page.getByText('Katalogisiert; der geschützte Verweis bleibt im privaten Ordner.')
	).toBeVisible();
	await expect(page.getByLabel('draft.jpg auswählen')).toBeDisabled();
	await page.getByRole('button', { name: 'reference.jpg prüfen' }).click();
	await expect(page.getByRole('button', { name: 'Aus Arbeitsbereich entfernen' })).toBeDisabled();
	await page.getByRole('button', { name: 'Privaten Verweis verschieben' }).click();
	await page.getByRole('button', { name: 'Untergeordnete Einheiten: top' }).click();
	await page.getByRole('button', { name: 'Destination', exact: true }).click();
	await page.getByRole('button', { name: 'Verschieben', exact: true }).click();
	await expect(
		page.getByRole('button', { name: 'Ungewissen Vorgang identisch wiederholen' })
	).toBeVisible();
	await page.reload();
	await page.getByRole('button', { name: 'Ungewissen Vorgang identisch wiederholen' }).click();
	await expect.poll(() => moves.length).toBe(2);
	expect(moves[0]).toEqual(moves[1]);
	await expect(
		page.getByRole('button', { name: 'Ungewissen Vorgang identisch wiederholen' })
	).not.toBeVisible();
	await page.getByRole('button', { name: 'top aufklappen' }).click();
	await page.getByRole('button', { name: 'Incoming aufklappen' }).click();
	await expect(page.getByLabel('reference.jpg auswählen')).toHaveCount(0);
	await page.getByRole('button', { name: 'Destination aufklappen' }).click();
	await expect(page.getByLabel('reference.jpg auswählen')).toHaveCount(1);
	await page.evaluate(() => window.scrollTo(0, 0));
	await page.screenshot({ path: 'test-results/as07-staging.png', fullPage: true });
	await page.setViewportSize({ width: 390, height: 844 });
	await expect
		.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
		.toBe(true);
	await page.evaluate(() => window.scrollTo(0, 0));
	await page.screenshot({ path: 'test-results/as07-mobile.png', fullPage: true });
	expect(errors).toEqual([]);
});

test('structure denial and public archive remain read-only', async ({ page }) => {
	await museum(page, false);
	await page.goto('http://localhost:4173/p/museum/admin/archive');
	await expect(
		page.getByText('Keine Berechtigung zur Strukturverwaltung oder Funktion nicht aktiviert.')
	).toBeVisible();
	await expect(page.getByRole('button', { name: 'Vorschlag erstellen' })).not.toBeVisible();
	await page.goto('http://localhost:4173/p/museum/admin/resources/urn%3Aas07%3Areference');
	await expect(page.getByText(/This resource is read-only/)).toBeVisible();
	await expect(page.getByRole('button', { name: 'Speichern', exact: true })).not.toBeVisible();
	await page.goto('http://localhost:4173/p/museum/archive');
	await expect(page.getByText('Museum collection', { exact: true })).toBeVisible();
	await expect(page.getByText(/Private museum workspace/)).not.toBeVisible();
});

test('private folder rename and relocation preserve media identity', async ({ page }) => {
	const { iri } = await museum(page);
	await page.goto('http://localhost:4173/p/museum/admin/staging');
	await page.getByRole('button', { name: 'top aufklappen' }).click();
	const incoming = page
		.getByRole('treeitem')
		.filter({ has: page.getByRole('link', { name: /Incoming/ }) })
		.first();
	await incoming.getByRole('button', { name: 'Ordner verwalten' }).click();
	await page.getByLabel('Name', { exact: true }).fill('Renamed intake');
	await page.getByRole('button', { name: 'Speichern', exact: true }).click();
	await page.getByRole('button', { name: 'top aufklappen' }).click();
	const renamed = page
		.getByRole('treeitem')
		.filter({ has: page.getByRole('link', { name: /Renamed intake/ }) })
		.first();
	await expect(renamed.getByRole('link')).toHaveAttribute(
		'href',
		'/p/museum/resource/' + encodeURIComponent(iri('Incoming'))
	);
	await renamed.getByRole('button', { name: 'Ordner verwalten' }).click();
	await page.getByRole('button', { name: 'Untergeordnete Einheiten: top' }).click();
	await page.getByRole('button', { name: 'Destination', exact: true }).click();
	await page.getByRole('button', { name: 'Verschieben', exact: true }).click();
	await page.getByRole('button', { name: 'top aufklappen' }).click();
	await expect(page.getByRole('button', { name: 'Renamed intake aufklappen' })).not.toBeVisible();
	await page.getByRole('button', { name: 'Destination aufklappen' }).click();
	await page.getByRole('button', { name: 'Renamed intake aufklappen' }).click();
	await expect(page.getByLabel('reference.jpg auswählen')).toHaveCount(2);
});
