import { describe, expect, it, vi } from 'vitest';
import type { OldapDataModel, OldapResourceRecord } from '$lib/resources/types';
import type { StagingMediaObjectNode } from './types';
import {
	catalogueStagingMediaObject,
	catalogueTargetsFromModels,
	loadCatalogueRelationOptions,
	loadCatalogueTargets
} from './catalogue';

const sharedModel: OldapDataModel = {
	project: 'shared',
	resources: [
		{
			iri: 'shared:MediaObject',
			properties: [
				{ iri: 'shared:assetId', datatype: 'xsd:string' },
				{ iri: 'shared:originalName', datatype: 'xsd:string' }
			]
		}
	]
};

const projectModel: OldapDataModel = {
	project: 'chama',
	resources: [
		{
			iri: 'chama:CataloguedPhotograph',
			label: ['Erschlossene Fotografie@de', 'Catalogued photograph@en'],
			comment: ['Ein beschriebenes Bild@de'],
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
					iri: 'chama:creationDating',
					toClass: 'oldap:Dating',
					maxCount: 1,
					order: 23
				},
				{
					iri: 'chama:capturePlace',
					name: ['Aufnahmeort@de'],
					toClass: 'chama:Place',
					maxCount: 1,
					order: 24
				},
				{ iri: 'chama:depicts', toClass: 'oldap:Thing', order: 25 },
				{
					iri: 'chama:hasContribution',
					toClass: 'chama:KnowledgeContribution',
					inverseOf: 'chama:describes',
					order: 26
				}
			]
		},
		{
			iri: 'chama:UnsupportedDocument',
			superclass: ['shared:MediaObject'],
			properties: [
				{ iri: 'schema:name', datatype: 'rdf:langString', minCount: 1 },
				{ iri: 'dcterms:creator', toClass: 'chama:Agent', minCount: 1 }
			]
		},
		{ iri: 'chama:Agent', properties: [] },
		{ iri: 'chama:Place', properties: [] }
	]
};

const media: StagingMediaObjectNode = {
	iri: 'chama:StagedImage',
	resclass: 'shared:StagingMediaObject',
	folderIri: 'chama:Incoming',
	areaIri: 'chama:Staging',
	originalName: 'IMG_1001.HEIC',
	mimeType: 'image/heic',
	statusIri: 'shared:StagingStatusNew',
	assetId: 'asset-1001',
	checksum: 'checksum-1001',
	protocol: 'iiif',
	derivativeName: 'master.tif',
	mediaDelivery: null
};

describe('Staging catalogue transition', () => {
	it('derives only project media classes whose required fields the minimal form supports', () => {
		const targets = catalogueTargetsFromModels(projectModel, sharedModel, 'de');
		expect(targets).toEqual([
			{
				iri: 'chama:CataloguedPhotograph',
				label: 'Erschlossene Fotografie',
				description: 'Ein beschriebenes Bild',
				fields: [
					{
						iri: 'schema:name',
						label: 'Titel',
						description: null,
						datatype: 'rdf:langString',
						required: true,
						order: 20
					},
					{
						iri: 'schema:description',
						label: 'Beschreibung',
						description: null,
						datatype: 'rdf:langString',
						required: false,
						order: 21
					}
				],
				relations: [
					{
						iri: 'dcterms:creator',
						label: 'Urheber',
						description: null,
						toClass: 'chama:Agent',
						allowsMultiple: true,
						order: 22
					},
					{
						iri: 'chama:capturePlace',
						label: 'Aufnahmeort',
						description: null,
						toClass: 'chama:Place',
						allowsMultiple: false,
						order: 24
					}
				]
			}
		]);
	});

	it('loads project and Shared models through the injected read boundary', async () => {
		const readDataModel = vi.fn(async (project: string) =>
			project === 'shared' ? sharedModel : projectModel
		);
		const targets = await loadCatalogueTargets('chama', 'de', {
			fetch: vi.fn(),
			apiBaseUrl: () => 'http://api.test',
			readDataModel,
			readResource: vi.fn()
		});
		expect(readDataModel.mock.calls.map(([project]) => project)).toEqual(['chama', 'shared']);
		expect(targets[0].iri).toBe('chama:CataloguedPhotograph');
	});

	it('loads readable candidates for a model-derived relation class', async () => {
		const fetch = vi
			.fn()
			.mockResolvedValue(
				new Response(
					JSON.stringify([
						{ iri: 'chama:LukasRosenthaler', resclass: 'chama:Person', 'schema:name': ['Lukas@de'] }
					]),
					{ status: 200, headers: { 'Content-Type': 'application/json' } }
				)
			);
		const options = await loadCatalogueRelationOptions('chama', 'chama:Agent', {
			fetch,
			apiBaseUrl: () => 'http://api.test'
		});
		expect(options.map(({ iri }) => iri)).toEqual(['chama:LukasRosenthaler']);
		expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({
			resClass: 'chama:Agent',
			includeProperties: ['schema:name'],
			limit: 100
		});
	});

	it('transforms one identity in place and verifies metadata, media, and Staging removal', async () => {
		const target = catalogueTargetsFromModels(projectModel, sharedModel, 'de')[0];
		const fetch = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					iri: 'https://chama.salsah.org/ns/StagedImage',
					resourceClass: 'https://chama.salsah.org/ns/CataloguedPhotograph'
				}),
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			)
		);
		const record: OldapResourceRecord = {
			'rdf:type': ['chama:CataloguedPhotograph'],
			'schema:name': ['Abend im Lokschuppen@de'],
			'schema:description': ['Die Lokomotiven ruhen.@de'],
			'dcterms:creator': ['chama:LukasRosenthaler'],
			'chama:capturePlace': ['chama:ChamaStation'],
			'shared:assetId': ['asset-1001'],
			'shared:checksum': ['checksum-1001']
		};
		const result = await catalogueStagingMediaObject(
			'chama',
			media,
			target,
			{
				targetClass: target.iri,
				language: 'DE',
				values: {
					'schema:name': ' Abend im Lokschuppen ',
					'schema:description': 'Die Lokomotiven ruhen.'
				},
				relations: {
					'dcterms:creator': ['chama:LukasRosenthaler'],
					'chama:capturePlace': ['chama:ChamaStation']
				}
			},
			{
				fetch,
				apiBaseUrl: () => 'http://api.test',
				readDataModel: vi.fn(),
				readResource: vi.fn().mockResolvedValue(record)
			}
		);

		expect(fetch).toHaveBeenCalledOnce();
		expect(fetch.mock.calls[0][0]).toBe('http://api.test/data/chama/chama%3AStagedImage/transform');
		expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({
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
		expect(result).toEqual({
			iri: media.iri,
			resourceClass: 'chama:CataloguedPhotograph',
			record
		});
	});

	it('links the chosen generic archive unit atomically and detects changed originals', async () => {
		const target = catalogueTargetsFromModels(projectModel, sharedModel, 'de')[0];
		const fetch = vi
			.fn()
			.mockImplementation(() =>
				Promise.resolve(new Response(JSON.stringify({ iri: media.iri, resourceClass: target.iri })))
			);
		const readResource = vi.fn().mockResolvedValue({
			'rdf:type': [target.iri],
			'schema:name': ['Image@de'],
			'shared:assetId': [media.assetId],
			'shared:checksum': ['changed']
		});
		await expect(
			catalogueStagingMediaObject(
				'chama',
				media,
				target,
				{
					targetClass: target.iri,
					language: 'de',
					values: { 'schema:name': 'Image' },
					archiveUnitIri: 'urn:example:unit'
				},
				{ fetch, apiBaseUrl: () => 'http://api.test', readDataModel: vi.fn(), readResource }
			)
		).rejects.toThrow('read-back');
		expect(JSON.parse(fetch.mock.calls[0][1].body).linkFrom).toEqual({
			resourceIri: 'urn:example:unit',
			property: 'shared:hasMediaObject'
		});
	});
	it('rejects recataloguing a retained archive reference before HTTP', async () => {
		const target = catalogueTargetsFromModels(projectModel, sharedModel, 'de')[0];
		const fetch = vi.fn();
		await expect(
			catalogueStagingMediaObject(
				'chama',
				{
					...media,
					repositoryEntry: {
						kind: 'archiveReference',
						mediaIri: media.iri,
						title: 'Image',
						canDownloadOriginal: true,
						canMove: true,
						canEditMetadata: false,
						canDeleteMedia: false
					}
				},
				target,
				{ targetClass: target.iri, language: 'de', values: { 'schema:name': 'Image' } },
				{
					fetch,
					apiBaseUrl: () => 'http://api.test',
					readDataModel: vi.fn(),
					readResource: vi.fn()
				}
			)
		).rejects.toThrow('cannot be catalogued');
		expect(fetch).not.toHaveBeenCalled();
	});

	it('rejects a required empty value before sending a mutation', async () => {
		const target = catalogueTargetsFromModels(projectModel, sharedModel, 'de')[0];
		const fetch = vi.fn();
		await expect(
			catalogueStagingMediaObject(
				'chama',
				media,
				target,
				{ targetClass: target.iri, language: 'de', values: {} },
				{
					fetch,
					apiBaseUrl: () => 'http://api.test',
					readDataModel: vi.fn(),
					readResource: vi.fn()
				}
			)
		).rejects.toThrow('Titel is required.');
		expect(fetch).not.toHaveBeenCalled();
	});
});
