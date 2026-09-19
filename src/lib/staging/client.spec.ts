import { afterEach, describe, expect, it, vi } from 'vitest';
import { authenticatedFetch } from '$lib/api/client';
import { searchStagingAreas, searchStagingFolders, searchStagingMediaObjects } from './client';

vi.mock('$lib/api/baseUrl', () => ({ getApiBaseUrl: () => 'https://api.example' }));
vi.mock('$lib/api/client', () => ({ authenticatedFetch: vi.fn() }));

afterEach(() => vi.mocked(authenticatedFetch).mockReset());

describe('Staging administration client', () => {
	it('pages wide folder lists and rejects a non-advancing page', async () => {
		const rows = Array.from({ length: 100 }, (_, i) => ({
			iri: `urn:folder:${i}`,
			resclass: 'shared:StagingFolder',
			'schema:name': [`Folder ${i}`],
			'shared:inStagingArea': ['urn:area']
		}));
		vi.mocked(authenticatedFetch)
			.mockResolvedValueOnce(Response.json(rows))
			.mockResolvedValueOnce(Response.json([{ ...rows[0], iri: 'urn:folder:100' }]));
		expect(await searchStagingFolders('museum', 'urn:area', null)).toHaveLength(101);
		expect(JSON.parse(String(vi.mocked(authenticatedFetch).mock.calls[1][1]?.body)).offset).toBe(
			100
		);
		vi.mocked(authenticatedFetch).mockImplementation(() => Promise.resolve(Response.json(rows)));
		await expect(searchStagingFolders('museum', 'urn:area', null)).rejects.toThrow('pagination');
	});

	it('maps readable StagingAreas without exposing raw records to the component', async () => {
		vi.mocked(authenticatedFetch).mockResolvedValue(
			Response.json([
				{
					iri: 'chama:PrivateStaging',
					resclass: 'shared:StagingArea',
					'schema:name': ['Private working area'],
					'shared:mediaPath': ['private'],
					'shared:stagingDefaultRole': ['chama:Curator'],
					'shared:stagingQuotaBytes': ['1073741824']
				}
			])
		);

		await expect(searchStagingAreas('chama')).resolves.toEqual([
			{
				iri: 'chama:PrivateStaging',
				resclass: 'shared:StagingArea',
				title: ['Private working area'],
				mediaPath: 'private',
				defaultRoleIri: 'chama:Curator',
				quotaBytes: 1073741824
			}
		]);
		const [, init] = vi.mocked(authenticatedFetch).mock.calls[0];
		expect(JSON.parse(String(init?.body))).toMatchObject({
			resClass: 'shared:StagingArea',
			filter: [],
			limit: 100
		});
	});

	it('loads roots and children inside the selected area boundary', async () => {
		vi.mocked(authenticatedFetch)
			.mockResolvedValueOnce(
				Response.json([
					{
						iri: 'chama:TopFolder',
						resclass: 'shared:StagingFolder',
						'schema:name': ['top'],
						'shared:inStagingArea': ['chama:PrivateStaging']
					}
				])
			)
			.mockResolvedValueOnce(
				Response.json([
					{
						iri: 'chama:IncomingFolder',
						resclass: 'shared:StagingFolder',
						'schema:name': ['Incoming'],
						'shared:inStagingArea': ['chama:PrivateStaging'],
						'shared:inStagingFolder': ['chama:TopFolder']
					}
				])
			);

		await expect(searchStagingFolders('chama', 'chama:PrivateStaging', null)).resolves.toEqual([
			expect.objectContaining({ iri: 'chama:TopFolder', parentIri: null })
		]);
		await expect(
			searchStagingFolders('chama', 'chama:PrivateStaging', 'chama:TopFolder')
		).resolves.toEqual([
			expect.objectContaining({ iri: 'chama:IncomingFolder', parentIri: 'chama:TopFolder' })
		]);

		const rootBody = JSON.parse(
			String(vi.mocked(authenticatedFetch).mock.calls[0][1]?.body)
		) as Record<string, unknown>;
		const childBody = JSON.parse(
			String(vi.mocked(authenticatedFetch).mock.calls[1][1]?.body)
		) as Record<string, unknown>;
		expect(rootBody.filter).toEqual([
			{
				property: 'shared:inStagingArea',
				op: '==',
				value: 'chama:PrivateStaging',
				type: 'iri'
			},
			'AND',
			{ property: 'shared:inStagingFolder', op: 'NOT_EXISTS' }
		]);
		expect(childBody.filter).toEqual([
			{
				property: 'shared:inStagingArea',
				op: '==',
				value: 'chama:PrivateStaging',
				type: 'iri'
			},
			'AND',
			{
				property: 'shared:inStagingFolder',
				op: '==',
				value: 'chama:TopFolder',
				type: 'iri'
			}
		]);
	});

	it('loads only media objects placed directly in the selected folder', async () => {
		vi.mocked(authenticatedFetch)
			.mockResolvedValueOnce(
				Response.json([
					{
						iri: 'chama:StagedImage',
						resclass: 'shared:StagingMediaObject',
						'shared:inStagingArea': ['chama:PrivateStaging'],
						'shared:inStagingFolder': ['chama:IncomingFolder'],
						'shared:originalName': ['IMG_1001.HEIC'],
						'shared:originalMimeType': ['image/heic'],
						'shared:stagingStatus': ['shared:StagingStatusNew'],
						'shared:assetId': ['asset-1001'],
						'shared:checksum': ['abc123'],
						'shared:protocol': ['iiif'],
						'shared:derivativeName': ['master.tif']
					}
				])
			)
			.mockResolvedValueOnce(
				Response.json({
					resources: [
						{
							iri: 'chama:StagedImage',
							resclass: 'shared:StagingMediaObject',
							data: { 'shared:originalName': ['IMG_1001.HEIC'] },
							mediaDelivery: {
								kind: 'iiif-image',
								infoUrl: 'https://media.example/iiif/3/asset-1001/info.json',
								capability: 'thumbnail-token'
							}
						}
					]
				})
			);

		await expect(
			searchStagingMediaObjects('chama', 'chama:PrivateStaging', 'chama:IncomingFolder')
		).resolves.toEqual([
			{
				iri: 'chama:StagedImage',
				resclass: 'shared:StagingMediaObject',
				areaIri: 'chama:PrivateStaging',
				folderIri: 'chama:IncomingFolder',
				originalName: 'IMG_1001.HEIC',
				mimeType: 'image/heic',
				statusIri: 'shared:StagingStatusNew',
				assetId: 'asset-1001',
				checksum: 'abc123',
				protocol: 'iiif',
				derivativeName: 'master.tif',
				mediaDelivery: {
					kind: 'iiif-image',
					infoUrl: 'https://media.example/iiif/3/asset-1001/info.json',
					capability: 'thumbnail-token'
				}
			}
		]);
		const body = JSON.parse(String(vi.mocked(authenticatedFetch).mock.calls[0][1]?.body)) as Record<
			string,
			unknown
		>;
		expect(body).toMatchObject({
			resClass: 'shared:StagingMediaObject',
			filter: [
				{
					property: 'shared:inStagingArea',
					op: '==',
					value: 'chama:PrivateStaging',
					type: 'iri'
				},
				'AND',
				{
					property: 'shared:inStagingFolder',
					op: '==',
					value: 'chama:IncomingFolder',
					type: 'iri'
				}
			]
		});
		const summaryBody = JSON.parse(
			String(vi.mocked(authenticatedFetch).mock.calls[1][1]?.body)
		) as Record<string, unknown>;
		expect(summaryBody).toEqual({
			iris: ['chama:StagedImage'],
			includeProperties: ['shared:originalName'],
			includeMediaDelivery: true
		});
	});

	it('does not request delivery capabilities for non-image files', async () => {
		vi.mocked(authenticatedFetch).mockResolvedValue(
			Response.json([
				{
					iri: 'chama:StagedText',
					resclass: 'shared:StagingMediaObject',
					'shared:inStagingArea': ['chama:PrivateStaging'],
					'shared:inStagingFolder': ['chama:IncomingFolder'],
					'shared:originalName': ['notes.txt'],
					'shared:originalMimeType': ['text/plain']
				}
			])
		);

		await expect(
			searchStagingMediaObjects('chama', 'chama:PrivateStaging', 'chama:IncomingFolder')
		).resolves.toEqual([
			expect.objectContaining({
				iri: 'chama:StagedText',
				mimeType: 'text/plain',
				mediaDelivery: null
			})
		]);
		expect(authenticatedFetch).toHaveBeenCalledTimes(1);
	});
});
