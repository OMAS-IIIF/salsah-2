import { expect, test, type Page } from '@playwright/test';

const headers = {
	'Access-Control-Allow-Credentials': 'true',
	'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Upload-Request-Id',
	'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
	'Access-Control-Allow-Origin': 'http://localhost:4173',
	'Content-Type': 'application/json'
};

async function mockOldap(page: Page): Promise<void> {
	let uploaded = false;
	let catalogued = false;
	let zipJob: Record<string, unknown> | null = null;
	let zipState = 'UPLOADING';
	let zipVersion = 0;
	const zipImportId = 'cb97109d-e7c7-4bf2-8f3c-0e68681049df';
	await page.route('http://media.test/**', (route) => {
		const request = route.request();
		const url = new URL(request.url());
		if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
		if (request.method() === 'PUT' && url.pathname === `/imports/${zipImportId}/sip`) {
			expect(request.headers().authorization).toBe('Bearer zip-capability');
			expect(request.headers()['content-type']).toContain('application/zip');
			expect(request.headers()['x-upload-request-id']).toBeTruthy();
			return route.fulfill({
				status: 201,
				headers,
				json: {
					importId: zipImportId,
					uploadRequestId: request.headers()['x-upload-request-id'],
					storedAt: '2026-08-30T12:00:01Z',
					sizeBytes: request.postDataBuffer()?.byteLength ?? 0,
					sha256: 'a'.repeat(64),
					stateNotification: 'DELIVERED'
				}
			});
		}
		if (request.method() === 'POST' && url.pathname === '/upload') {
			const multipart = request.postDataBuffer()?.toString('utf8') ?? '';
			expect(multipart).toContain('shared:StagingMediaObject');
			expect(multipart).toContain('chama:PrivateStaging');
			expect(multipart).toContain('chama:IncomingFolder');
			expect(multipart).not.toContain('attachedToRole');
			expect(multipart).not.toContain('name="path"');
			uploaded = true;
			return route.fulfill({
				status: 200,
				headers,
				json: {
					iri: 'chama:NewStagedImage',
					assetId: 'staging-new',
					originalName: 'NEW_IMAGE.JPG',
					originalMimeType: 'image/jpeg',
					stagingAreaIri: 'chama:PrivateStaging',
					stagingFolderIri: 'chama:IncomingFolder'
				}
			});
		}
		if (request.method() === 'DELETE' && url.pathname === '/upload/staging-new') {
			expect(url.searchParams.get('expectedResourceIri')).toBe('chama:NewStagedImage');
			expect(url.searchParams.get('stagingOnly')).toBe('true');
			uploaded = false;
			return route.fulfill({
				status: 200,
				headers,
				json: {
					iri: 'chama:NewStagedImage',
					assetId: 'staging-new',
					cleanupPending: false
				}
			});
		}
		return route.fulfill({
			status: 200,
			headers: { ...headers, 'Content-Type': 'image/png' },
			body: Buffer.from(
				'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
				'base64'
			)
		});
	});
	await page.route('http://localhost:8000/**', async (route) => {
		const request = route.request();
		const path = decodeURIComponent(new URL(request.url()).pathname);
		if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
		if (path === '/archive/chama/structure/capabilities')
			return route.fulfill({
				status: 200,
				headers,
				json: {
					enabled: false,
					canManageStructure: false,
					canCreateUnits: false,
					maxMutations: 500
				}
			});
		if (path === '/admin/auth/refresh') return route.fulfill({ status: 401, headers, json: {} });
		if (path === '/admin/auth/researcher')
			return route.fulfill({ status: 200, headers, json: { accessToken: 'test-token' } });
		if (path === '/admin/user/researcher')
			return route.fulfill({
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
		if (path === '/admin/project/get')
			return route.fulfill({
				status: 200,
				headers,
				json: {
					projectIri: 'https://chama.salsah.org',
					projectShortName: 'chama',
					label: ['SALSAH-2-Chama-Demo@de']
				}
			});
		if (path === '/admin/datamodel/chama')
			return route.fulfill({
				status: 200,
				headers,
				json: {
					project: 'chama',
					resources: [
						{
							iri: 'chama:CataloguedPhotograph',
							label: ['Erschlossene Fotografie@de'],
							comment: ['Eine erschlossene born-digitale Fotografie@de'],
							superclass: ['shared:MediaObject'],
							properties: [
								{
									iri: 'schema:name',
									name: ['Titel@de'],
									datatype: 'rdf:langString',
									minCount: 1,
									maxCount: 1,
									order: 20
								},
								{
									iri: 'schema:description',
									name: ['Beschreibung@de'],
									datatype: 'rdf:langString',
									maxCount: 1,
									order: 21
								},
								{
									iri: 'dcterms:creator',
									name: ['Urheber@de'],
									toClass: 'chama:Agent',
									order: 22
								},
								{
									iri: 'chama:capturePlace',
									name: ['Aufnahmeort@de'],
									toClass: 'chama:Place',
									maxCount: 1,
									order: 24
								}
							]
						}
					]
				}
			});
		if (path === '/admin/datamodel/shared')
			return route.fulfill({
				status: 200,
				headers,
				json: {
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
				}
			});
		if (path === '/imports' && request.method() === 'GET')
			return route.fulfill({
				status: 200,
				headers,
				json: {
					items: zipJob
						? [
								{
									...zipJob,
									state: zipState,
									stateVersion: zipVersion,
									reportAvailable: zipState !== 'UPLOADING',
									canConfirm: zipState === 'READY'
								}
							]
						: []
				}
			});
		if (path === '/imports' && request.method() === 'POST') {
			const body = request.postDataJSON() as {
				projectShortName: string;
				stagingAreaIri: string;
				targetRootFolderIri: string;
				originalFileName: string;
				compressedSizeBytes: number;
			};
			expect(body).toMatchObject({
				projectShortName: 'chama',
				stagingAreaIri: 'chama:PrivateStaging',
				targetRootFolderIri: 'chama:IncomingFolder',
				originalFileName: 'chama-batch.zip'
			});
			zipJob = {
				importId: zipImportId,
				state: 'UPLOADING',
				stateVersion: 0,
				createdAt: '2026-08-30T12:00:00Z',
				updatedAt: '2026-08-30T12:00:00Z',
				target: {
					projectShortName: 'chama',
					stagingAreaIri: 'https://chama.salsah.org/ns/PrivateStaging',
					stagingAreaName: 'Eigener Arbeitsbereich',
					targetRootFolderIri: 'https://chama.salsah.org/ns/IncomingFolder',
					targetRootFolderName: 'Eingang'
				},
				originalFileName: body.originalFileName,
				declaredCompressedSizeBytes: body.compressedSizeBytes,
				reportAvailable: false,
				canConfirm: false,
				cleanupPending: false
			};
			zipState = 'UPLOADING';
			zipVersion = 0;
			return route.fulfill({
				status: 201,
				headers,
				json: {
					job: zipJob,
					upload: {
						url: `http://media.test/imports/${zipImportId}/sip`,
						method: 'PUT',
						contentType: 'application/zip',
						bearerToken: 'zip-capability',
						expiresAt: '2026-08-30T12:15:00Z',
						maxBytes: 500_000_000
					}
				}
			});
		}
		if (path === `/imports/${zipImportId}` && request.method() === 'GET') {
			expect(zipJob).not.toBeNull();
			if (zipState === 'UPLOADING') {
				zipState = 'READY';
				zipVersion = 2;
			} else if (zipState === 'IMPORTING') {
				zipState = 'IMPORTED';
				zipVersion = 4;
			}
			return route.fulfill({
				status: 200,
				headers,
				json: {
					...zipJob,
					state: zipState,
					stateVersion: zipVersion,
					updatedAt: '2026-08-30T12:00:03Z',
					reportAvailable: true,
					canConfirm: zipState === 'READY'
				}
			});
		}
		if (path === `/imports/${zipImportId}/report` && request.method() === 'GET') {
			return route.fulfill({
				status: 200,
				headers,
				json: {
					documentType: 'oldap.zip-import.report',
					schemaVersion: '1.0.0',
					importId: zipImportId,
					generatedAt: '2026-08-30T12:00:03Z',
					status: 'READY',
					canConfirm: true,
					expiresAt: '2099-08-31T12:00:03Z',
					target: zipJob?.target,
					sip: {
						originalFileName: 'chama-batch.zip',
						sizeBytes: 9,
						sha256: 'b'.repeat(64)
					},
					summary: {
						entriesObserved: 2,
						entriesDeclared: 2,
						inventoryComplete: true,
						files: 1,
						directories: 1,
						importableFiles: 1,
						importableDirectories: 1,
						ignoredEntries: 0,
						rejectedEntries: 0,
						warningCount: 0,
						errorCount: 0,
						compressedBytes: 9,
						extractedBytes: 12,
						maxDepth: 2
					},
					issues: [],
					entries: [
						{
							entryIndex: 0,
							sourcePath: 'Chama 2026/',
							normalizedPath: 'Chama 2026/',
							entryType: 'directory',
							disposition: 'IMPORT',
							sizeBytes: 0,
							issues: []
						},
						{
							entryIndex: 1,
							sourcePath: 'Chama 2026/IMG_2001.JPG',
							normalizedPath: 'Chama 2026/IMG_2001.JPG',
							entryType: 'file',
							disposition: 'IMPORT',
							sizeBytes: 12,
							detectedCategory: 'image',
							detectedMimeType: 'image/jpeg',
							issues: []
						}
					],
					manifestSha256: 'c'.repeat(64),
					manifestCanonicalization: 'RFC8785'
				}
			});
		}
		if (path === `/imports/${zipImportId}/confirm` && request.method() === 'POST') {
			expect(request.postDataJSON()).toEqual({ expectedStateVersion: 2 });
			zipState = 'IMPORTING';
			zipVersion = 3;
			return route.fulfill({
				status: 202,
				headers,
				json: {
					...zipJob,
					state: zipState,
					stateVersion: zipVersion,
					updatedAt: '2026-08-30T12:00:04Z',
					reportAvailable: true,
					canConfirm: false
				}
			});
		}
		if (path === '/data/chama/chama:StagedImage/transform' && request.method() === 'POST') {
			expect(request.postDataJSON()).toEqual({
				expectedSourceClass: 'shared:StagingMediaObject',
				preserveClass: 'shared:MediaObject',
				targetClass: 'chama:CataloguedPhotograph',
				properties: {
					'schema:name': ['Abend im Lokschuppen@de'],
					'schema:description': ['Die Lokomotiven ruhen.@de'],
					'dcterms:creator': ['chama:LukasRosenthaler'],
					'chama:capturePlace': ['chama:ChamaStation']
				}
			});
			catalogued = true;
			return route.fulfill({
				status: 200,
				headers,
				json: {
					iri: 'chama:StagedImage',
					resourceClass: 'chama:CataloguedPhotograph'
				}
			});
		}
		if (path === '/data/chama/chama:StagedImage' && request.method() === 'GET')
			return route.fulfill({
				status: 200,
				headers,
				json: {
					'rdf:type': ['chama:CataloguedPhotograph'],
					'schema:name': ['Abend im Lokschuppen@de'],
					'schema:description': ['Die Lokomotiven ruhen.@de'],
					'dcterms:creator': ['chama:LukasRosenthaler'],
					'chama:capturePlace': ['chama:ChamaStation'],
					'shared:assetId': ['asset-1001'],
					'shared:checksum': ['checksum-1001']
				}
			});
		if (path === '/data/summaries/chama' && request.method() === 'POST') {
			const body = request.postDataJSON() as { iris?: string[]; includeMediaDelivery?: boolean };
			expect(body.includeMediaDelivery).toBe(true);
			return route.fulfill({
				status: 200,
				headers,
				json: {
					resources: (body.iris ?? []).flatMap((iri) =>
						(!catalogued && iri === 'chama:StagedImage') ||
						(uploaded && iri === 'chama:NewStagedImage')
							? [
									{
										iri,
										resclass: 'shared:StagingMediaObject',
										data: {
											'shared:originalName': [
												iri === 'chama:StagedImage' ? 'IMG_1001.HEIC' : 'NEW_IMAGE.JPG'
											]
										},
										mediaDelivery: {
											kind: 'iiif-image',
											infoUrl: `http://media.test/iiif/3/${iri === 'chama:StagedImage' ? 'asset-1001' : 'staging-new'}/info.json`,
											capability: 'thumbnail-token'
										}
									}
								]
							: []
					)
				}
			});
		}
		if (path === '/data/search/chama' && request.method() === 'POST') {
			const body = request.postDataJSON() as {
				resClass?: string;
				filter?: Array<{ property: string; value?: string; op: string } | 'AND'>;
			};
			if (body.resClass === 'shared:StagingArea')
				return route.fulfill({
					status: 200,
					headers,
					json: [
						{
							iri: 'chama:PrivateStaging',
							resclass: 'shared:StagingArea',
							'schema:name': ['Eigener Arbeitsbereich'],
							'shared:mediaPath': ['private'],
							'shared:stagingQuotaBytes': [1073741824]
						},
						{
							iri: 'chama:TeamStaging',
							resclass: 'shared:StagingArea',
							'schema:name': ['Team-Arbeitsbereich']
						}
					]
				});
			if (body.resClass === 'chama:Agent')
				return route.fulfill({
					status: 200,
					headers,
					json: [
						{
							iri: 'chama:LukasRosenthaler',
							resclass: 'chama:Person',
							'schema:name': ['Lukas Rosenthaler@de']
						}
					]
				});
			if (body.resClass === 'chama:Place')
				return route.fulfill({
					status: 200,
					headers,
					json: [
						{
							iri: 'chama:ChamaStation',
							resclass: 'chama:Place',
							'schema:name': ['Bahnhof Chama@de']
						}
					]
				});
			expect(body.filter?.[1]).toBe('AND');
			const propertyFilters = body.filter?.filter(
				(filter): filter is { property: string; value?: string; op: string } => filter !== 'AND'
			);
			const parent = propertyFilters?.find(
				(filter) => filter.property === 'shared:inStagingFolder'
			);
			const area = propertyFilters?.find(
				(filter) => filter.property === 'shared:inStagingArea'
			)?.value;
			if (body.resClass === 'shared:StagingMediaObject') {
				const json =
					parent?.value === 'chama:IncomingFolder'
						? [
								...(!catalogued
									? [
											{
												iri: 'chama:StagedImage',
												resclass: 'shared:StagingMediaObject',
												'shared:inStagingArea': ['chama:PrivateStaging'],
												'shared:inStagingFolder': ['chama:IncomingFolder'],
												'shared:originalName': ['IMG_1001.HEIC'],
												'shared:originalMimeType': ['image/heic'],
												'shared:stagingStatus': ['shared:StagingStatusNew'],
												'shared:assetId': ['asset-1001'],
												'shared:checksum': ['checksum-1001'],
												'shared:protocol': ['iiif'],
												'shared:derivativeName': ['master.tif']
											}
										]
									: []),
								...(uploaded
									? [
											{
												iri: 'chama:NewStagedImage',
												resclass: 'shared:StagingMediaObject',
												'shared:inStagingArea': ['chama:PrivateStaging'],
												'shared:inStagingFolder': ['chama:IncomingFolder'],
												'shared:originalName': ['NEW_IMAGE.JPG'],
												'shared:originalMimeType': ['image/jpeg'],
												'shared:stagingStatus': ['shared:StagingStatusNew'],
												'shared:assetId': ['staging-new'],
												'shared:checksum': ['checksum-new'],
												'shared:protocol': ['iiif'],
												'shared:derivativeName': ['master.tif']
											}
										]
									: [])
							]
						: [];
				return route.fulfill({ status: 200, headers, json });
			}
			const json =
				area === 'chama:TeamStaging'
					? [
							{
								iri: 'chama:TeamIncoming',
								resclass: 'shared:StagingFolder',
								'schema:name': ['Team-Eingang'],
								'shared:inStagingArea': ['chama:TeamStaging']
							}
						]
					: parent?.value === 'chama:IncomingFolder' && zipState === 'IMPORTED'
						? [
								{
									iri: 'chama:ImportedBatchFolder',
									resclass: 'shared:StagingFolder',
									'schema:name': ['Chama 2026'],
									'shared:inStagingArea': ['chama:PrivateStaging'],
									'shared:inStagingFolder': ['chama:IncomingFolder']
								}
							]
						: parent?.value === 'chama:TopFolder'
							? [
									{
										iri: 'chama:IncomingFolder',
										resclass: 'shared:StagingFolder',
										'schema:name': ['Eingang'],
										'shared:inStagingArea': ['chama:PrivateStaging'],
										'shared:inStagingFolder': ['chama:TopFolder']
									}
								]
							: [
									{
										iri: 'chama:TopFolder',
										resclass: 'shared:StagingFolder',
										'schema:name': ['Meine Ablage'],
										'shared:inStagingArea': ['chama:PrivateStaging']
									}
								];
			return route.fulfill({ status: 200, headers, json });
		}
		return route.fulfill({ status: 404, headers, json: { message: `Unexpected ${path}` } });
	});
}

test('explores visible staging folders and uploads one image to an explicit folder', async ({
	page
}) => {
	const mutationRequests: string[] = [];
	const thumbnailRequests: string[] = [];
	page.on('request', (request) => {
		if (request.url().includes('/data/') && !['GET', 'POST'].includes(request.method()))
			mutationRequests.push(request.method());
		if (request.url().startsWith('http://media.test/')) thumbnailRequests.push(request.url());
	});
	await mockOldap(page);
	await page.goto('/login?next=/p/chama/admin');
	await page.getByLabel('User-ID').fill('researcher');
	await page.getByLabel('Passwort').fill('test-password');
	await page.getByRole('button', { name: 'Anmelden' }).click();
	await page.getByRole('link', { name: /Arbeitsbereiche/ }).click();

	await expect(page.getByRole('heading', { name: 'Arbeitsbereiche' })).toBeVisible();
	await expect(page.getByText('Meine Ablage')).toBeVisible();
	await expect(page.getByText('Eingang', { exact: true })).not.toBeVisible();
	await page.getByRole('button', { name: 'Meine Ablage aufklappen' }).click();
	await expect(page.getByText('Eingang', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Eingang aufklappen' }).click();
	await expect(page.getByText('IMG_1001.HEIC', { exact: true })).toBeVisible();
	await expect(page.getByText(/image\/heic/)).toBeVisible();
	await page.getByLabel('IMG_1001.HEIC auswählen').check();
	await expect(page.getByText('1 Medien ausgewählt')).toBeVisible();
	await page.getByRole('button', { name: 'Auswahl bearbeiten' }).click();
	const review = page.getByRole('dialog', { name: 'Bereitgestelltes Medium' });
	await expect(review).toContainText('checksum-1001');
	await expect(review).toContainText('1 von 1 in der Auswahl');
	await expect(review.getByRole('link', { name: /Datensatz öffnen/ })).toHaveAttribute(
		'href',
		'/p/chama/resource/chama%3AStagedImage'
	);
	await review.getByRole('button', { name: 'Schliessen' }).last().click();
	await page.getByRole('button', { name: 'Auswahl katalogisieren' }).click();
	const batch = page.getByRole('dialog', { name: 'Auswahl katalogisieren' });
	await expect(batch.getByLabel('Zielklasse')).toHaveValue('chama:CataloguedPhotograph');
	await batch.getByRole('button', { name: 'IMG_1001.HEIC grösser anzeigen' }).click();
	const enlargedPreview = page.getByRole('dialog', {
		name: 'Vergrösserte Vorschau von IMG_1001.HEIC'
	});
	await expect(enlargedPreview.getByRole('img', { name: 'IMG_1001.HEIC' })).toBeVisible();
	await enlargedPreview.getByRole('button', { name: 'Vergrösserte Vorschau schliessen' }).click();
	await expect(batch.getByLabel('Individueller Titel *')).toHaveValue('IMG 1001');
	await batch.getByLabel('Individueller Titel *').fill('Abend im Lokschuppen');
	await batch.getByLabel('Gemeinsame Beschreibung').fill('Die Lokomotiven ruhen.');
	await batch.getByLabel('Urheber').selectOption('chama:LukasRosenthaler');
	await batch.getByLabel('Aufnahmeort').selectOption('chama:ChamaStation');
	await batch.getByRole('button', { name: 'Vorschau prüfen' }).click();
	await expect(batch).toContainText('Abend im Lokschuppen');
	await expect(batch).toContainText('Lukas Rosenthaler');
	await expect(batch).toContainText('Bahnhof Chama');
	await batch.getByRole('button', { name: 'Stapel katalogisieren' }).click();
	await expect(
		batch.getByRole('heading', { name: 'Stapel vollständig katalogisiert' })
	).toBeVisible();
	await batch.getByRole('button', { name: 'Schliessen' }).last().click();
	await expect(
		page.getByText(
			'1 Medien wurden als Erschlossene Fotografie katalogisiert und aus dem Arbeitsbereich entfernt.'
		)
	).toBeVisible();
	await expect(page.getByRole('button', { name: 'IMG_1001.HEIC prüfen' })).not.toBeVisible();
	await expect(page.getByText('1 Medien ausgewählt')).not.toBeVisible();
	await expect
		.poll(() => thumbnailRequests)
		.toContain(
			'http://media.test/iiif/3/asset-1001/full/!160,160/0/default.jpg?token=thumbnail-token'
		);
	const incomingRow = page.getByRole('treeitem').filter({ hasText: 'Eingang' });
	await incomingRow.getByRole('button', { name: 'Bild hochladen' }).click();
	await page.getByLabel('Bilddatei').setInputFiles({
		name: 'NEW_IMAGE.JPG',
		mimeType: 'image/jpeg',
		buffer: Buffer.from('image bytes')
	});
	await page.getByRole('button', { name: 'Hochladen', exact: true }).click();
	await expect(
		page.getByText('NEW_IMAGE.JPG wurde hochgeladen und in OLDAP geprüft.')
	).toBeVisible();
	await expect(page.getByRole('link', { name: /NEW_IMAGE.JPG/ })).toBeVisible();
	await page.getByRole('button', { name: 'NEW_IMAGE.JPG prüfen' }).click();
	page.once('dialog', (dialog) => dialog.accept());
	await page.getByRole('button', { name: 'Aus Arbeitsbereich entfernen' }).click();
	await expect(
		page.getByText('NEW_IMAGE.JPG wurde aus dem Arbeitsbereich entfernt.')
	).toBeVisible();
	await expect(page.getByRole('button', { name: 'NEW_IMAGE.JPG prüfen' })).not.toBeVisible();
	await incomingRow.getByRole('button', { name: 'ZIP hochladen' }).click();
	await page.getByLabel('ZIP-Datei').setInputFiles({
		name: 'chama-batch.zip',
		mimeType: 'application/zip',
		buffer: Buffer.from('zip bytes')
	});
	await page.getByRole('button', { name: 'Hochladen und prüfen' }).click();
	await expect(page.getByText('Bereit zur Übernahme').first()).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Inhalt und Prüfergebnis' })).toBeVisible();
	await expect(page.getByText('IMG_2001.JPG')).toBeVisible();
	await page.getByRole('button', { name: 'Schliessen' }).last().click();
	await expect(page.getByRole('heading', { name: 'Letzte ZIP-Importe' })).toBeVisible();
	await expect(page.getByText('chama-batch.zip')).toBeVisible();
	await page.getByRole('button', { name: 'Öffnen' }).click();
	await expect(page.getByRole('heading', { name: 'Inhalt und Prüfergebnis' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'In den Arbeitsbereich übernehmen' })).toHaveCount(
		2
	);
	await page.getByRole('button', { name: 'In den Arbeitsbereich übernehmen' }).last().click();
	await expect(page.getByText('Übernahme verbindlich bestätigen')).toBeVisible();
	await page.getByRole('button', { name: 'Jetzt übernehmen' }).click();
	await expect(page.getByText('Übernommen', { exact: true }).last()).toBeVisible();
	await expect(page.getByText(/vollständig unter Eingang übernommen/)).toBeVisible();
	await expect(page.getByText('Chama 2026', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: /Team-Arbeitsbereich/ }).click();
	await expect(page.getByText('Team-Eingang')).toBeVisible();
	await expect(page.getByText('Meine Ablage')).not.toBeVisible();
	await expect(page.getByRole('link', { name: /Team-Eingang/ })).toHaveAttribute(
		'href',
		'/p/chama/resource/chama%3ATeamIncoming'
	);
	expect(mutationRequests).toEqual([]);
});
