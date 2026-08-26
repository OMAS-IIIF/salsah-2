import { afterEach, describe, expect, it, vi } from 'vitest';
import { authenticatedFetch } from '$lib/api/client';
import {
	displayMediaIriOf,
	loadArchiveMedia,
	loadRecentResourceCards,
	mediaDeliveryOf,
	readResourceSummaries,
	searchArchiveUnits,
	searchProjectResourceCards
} from './client';
import type { OldapResourceSummary } from './types';

vi.mock('$lib/api/baseUrl', () => ({ getApiBaseUrl: () => 'https://api.example' }));
vi.mock('$lib/api/client', () => ({ authenticatedFetch: vi.fn() }));

afterEach(() => {
	vi.mocked(authenticatedFetch).mockReset();
});

describe('media delivery mapping', () => {
	it('builds an IIIF info URL and keeps its capability separate', () => {
		expect(
			mediaDeliveryOf({
				'shared:mediaAccessMode': 'local',
				'shared:protocol': 'iiif',
				'shared:serverUrl': 'http://localhost:8088/iiif/3/',
				'shared:assetId': 'IMG 1751',
				token: 'short-lived-capability'
			})
		).toEqual({
			kind: 'iiif-image',
			infoUrl: 'http://localhost:8088/iiif/3/IMG%201751/info.json',
			capability: 'short-lived-capability'
		});
	});

	it('maps an external image without inventing a local delivery URL', () => {
		expect(
			mediaDeliveryOf({
				'shared:mediaAccessMode': ['external'],
				'shared:protocol': ['http'],
				'shared:mediaUrl': ['https://images.example.org/full.jpg'],
				'shared:thumbnailUrl': ['https://images.example.org/thumb.jpg']
			})
		).toEqual({
			kind: 'external-image',
			url: 'https://images.example.org/full.jpg',
			thumbnailUrl: 'https://images.example.org/thumb.jpg'
		});
	});
});

describe('display-media selection', () => {
	it('uses the sole readable linked representation for an archive-first work', () => {
		expect(
			displayMediaIriOf(
				'chama:Work',
				{ 'shared:hasMediaObject': ['chama:Representation'] },
				new Map([
					[
						'chama:Representation',
						{ 'shared:assetId': 'representation', 'shared:mediaAccessMode': 'local' }
					]
				])
			)
		).toBe('chama:Representation');
	});

	it('does not guess when an archive resource has several representations', () => {
		expect(
			displayMediaIriOf(
				'chama:Work',
				{ 'shared:hasMediaObject': ['chama:Front', 'chama:Back'] },
				new Map([
					['chama:Front', {}],
					['chama:Back', {}]
				])
			)
		).toBeNull();
	});
});

describe('recent resource cards', () => {
	it('uses the sole archive representation and live ontology class label', async () => {
		vi.mocked(authenticatedFetch).mockImplementation(async (input, init) => {
			const path = decodeURIComponent(new URL(String(input)).pathname);
			if (path === '/data/search/chama') {
				return Response.json([
					{
						iri: 'chama:Work',
						resclass: 'chama:PhotographicWork',
						'schema:name': ['Lobato Trestle@en']
					}
				]);
			}
			if (path === '/admin/datamodel/chama') {
				return Response.json({
					project: 'chama',
					resources: [
						{
							iri: 'chama:PhotographicWork',
							label: ['Fotografisches Werk@de'],
							properties: []
						}
					]
				});
			}
			if (path === '/data/summaries/chama') {
				const body = JSON.parse(String(init?.body)) as { iris: string[] };
				const resources = body.iris.flatMap<OldapResourceSummary>((iri) =>
					iri === 'chama:Work'
						? [
								{
									iri,
									resclass: 'chama:PhotographicWork',
									data: {
										'rdf:type': ['chama:PhotographicWork'],
										'schema:name': ['Lobato Trestle@en'],
										'shared:hasMediaObject': ['chama:Representation']
									},
									mediaDelivery: null
								}
							]
						: iri === 'chama:Representation'
							? [
									{
										iri,
										resclass: 'chama:DigitalRepresentation',
										data: {
											'rdf:type': ['chama:DigitalRepresentation'],
											'shared:mediaAccessMode': ['local'],
											'shared:assetId': ['PICT0111']
										},
										mediaDelivery: {
											kind: 'iiif-image',
											infoUrl: 'https://media.example/iiif/3/PICT0111/info.json',
											capability: 'preview-token'
										}
									}
								]
							: []
				);
				return Response.json({
					resources
				});
			}
			return Response.json({ message: `Unexpected ${path}` }, { status: 404 });
		});

		await expect(loadRecentResourceCards('chama')).resolves.toEqual([
			{
				resource: {
					iri: 'chama:Work',
					resclass: 'chama:PhotographicWork',
					'schema:name': ['Lobato Trestle@en']
				},
				classLabels: ['Fotografisches Werk@de'],
				media: {
					kind: 'iiif-image',
					infoUrl: 'https://media.example/iiif/3/PICT0111/info.json',
					capability: 'preview-token'
				}
			}
		]);
	});
});

describe('resource summary batches', () => {
	it('deduplicates IRIs and splits requests at the API boundary', async () => {
		const batchSizes: number[] = [];
		vi.mocked(authenticatedFetch).mockImplementation(async (_input, init) => {
			const body = JSON.parse(String(init?.body)) as { iris: string[] };
			batchSizes.push(body.iris.length);
			return Response.json({
				resources: body.iris.map((iri) => ({
					iri,
					resclass: 'oldap:Thing',
					data: { 'rdf:type': ['oldap:Thing'] }
				}))
			});
		});

		const iris = Array.from({ length: 101 }, (_, index) => `chama:Resource${index}`);
		const result = await readResourceSummaries('chama', [...iris, iris[0]]);

		expect(batchSizes).toEqual([100, 1]);
		expect(result.map(({ iri }) => iri)).toEqual(iris);
	});
});

describe('incremental archive tree', () => {
	it('loads roots and direct children through bounded structured searches', async () => {
		const requestBodies: Record<string, unknown>[] = [];
		vi.mocked(authenticatedFetch).mockImplementation(async (_input, init) => {
			const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
			requestBodies.push(body);
			const childRequest = JSON.stringify(body.filter).includes('chama:Root');
			return Response.json(
				childRequest
					? [
							{
								iri: 'chama:Series',
								resclass: 'shared:ArchiveUnit',
								'schema:name': ['Series@en'],
								'shared:archiveLevel': ['shared:Series'],
								'shared:parentArchiveUnit': ['chama:Root'],
								'schema:position': [2]
							}
						]
					: [
							{
								iri: 'chama:Root',
								resclass: 'shared:ArchiveUnit',
								'schema:name': ['Archive@en'],
								'shared:archiveLevel': ['shared:ArchiveGroup'],
								'schema:position': ['1']
							}
						]
			);
		});

		await expect(searchArchiveUnits('chama', null)).resolves.toMatchObject([
			{
				iri: 'chama:Root',
				archiveLevel: 'shared:ArchiveGroup',
				parentIri: null,
				position: 1,
				mediaIris: []
			}
		]);
		await expect(searchArchiveUnits('chama', 'chama:Root')).resolves.toMatchObject([
			{ iri: 'chama:Series', parentIri: 'chama:Root', position: 2 }
		]);

		expect(requestBodies[0]).toMatchObject({
			resClass: 'shared:ArchiveUnit',
			filter: [{ property: 'shared:parentArchiveUnit', op: 'NOT_EXISTS' }],
			limit: 100
		});
		expect(requestBodies[1]).toMatchObject({
			filter: [
				{
					property: 'shared:parentArchiveUnit',
					op: '==',
					value: 'chama:Root',
					type: 'iri'
				}
			]
		});
	});

	it('resolves linked media summaries and their preview delivery', async () => {
		vi.mocked(authenticatedFetch).mockResolvedValue(
			Response.json({
				resources: [
					{
						iri: 'chama:IMG_1751',
						resclass: 'chama:CataloguedPhotograph',
						data: { 'schema:name': ['K-36 #488 im Panorama@de'] },
						mediaDelivery: {
							kind: 'iiif-image',
							infoUrl: 'https://media.example/iiif/3/IMG_1751/info.json',
							capability: 'preview-token'
						}
					}
				]
			})
		);

		await expect(loadArchiveMedia('chama', ['chama:IMG_1751'])).resolves.toEqual([
			{
				iri: 'chama:IMG_1751',
				resclass: 'chama:CataloguedPhotograph',
				title: ['K-36 #488 im Panorama@de'],
				media: {
					kind: 'iiif-image',
					infoUrl: 'https://media.example/iiif/3/IMG_1751/info.json',
					capability: 'preview-token'
				}
			}
		]);
	});
});

describe('project resource search', () => {
	it('deduplicates broad text matches and enriches the card from the readable resource', async () => {
		let requestedQuery: string | null = null;
		let requestedLimit: string | null = null;
		let summaryReads = 0;
		vi.mocked(authenticatedFetch).mockImplementation(async (input) => {
			const url = new URL(String(input));
			const path = decodeURIComponent(url.pathname);
			if (path === '/data/text/chama') {
				requestedQuery = url.searchParams.get('q');
				requestedLimit = url.searchParams.get('limit');
				return Response.json([
					{
						iri: 'chama:IMG_1751',
						resclass: 'chama:CataloguedPhotograph',
						'schema:description': 'Die Panoramaaufnahme zeigt die Lokomotive Nr. 488.@de'
					},
					{
						iri: 'chama:IMG_1751',
						resclass: 'chama:CataloguedPhotograph',
						'chama:creditLine': 'Lukas Rosenthaler'
					}
				]);
			}
			if (path === '/admin/datamodel/chama') {
				return Response.json({
					project: 'chama',
					resources: [
						{
							iri: 'chama:CataloguedPhotograph',
							label: ['Erschlossene Fotografie@de'],
							properties: []
						}
					]
				});
			}
			if (path === '/data/summaries/chama') {
				summaryReads += 1;
				return Response.json({
					resources: [
						{
							iri: 'chama:IMG_1751',
							resclass: 'chama:CataloguedPhotograph',
							data: {
								'rdf:type': ['chama:CataloguedPhotograph'],
								'schema:name': ['K-36 #488 im Panorama@de']
							},
							mediaDelivery: null
						}
					]
				});
			}
			return Response.json({ message: `Unexpected ${path}` }, { status: 404 });
		});

		await expect(searchProjectResourceCards('chama', '  Dampf & Rauch  ', 12)).resolves.toEqual([
			{
				resource: {
					iri: 'chama:IMG_1751',
					resclass: 'chama:CataloguedPhotograph',
					'schema:description': 'Die Panoramaaufnahme zeigt die Lokomotive Nr. 488.@de',
					'schema:name': ['K-36 #488 im Panorama@de']
				},
				classLabels: ['Erschlossene Fotografie@de'],
				media: null
			}
		]);
		expect(requestedQuery).toBe('Dampf & Rauch');
		expect(requestedLimit).toBe('12');
		expect(summaryReads).toBe(1);
	});
});
