import { describe, expect, it } from 'vitest';
import {
	fallbackLabel,
	linkedPropertyIris,
	localizedText,
	parseLocalizedText,
	presentResource,
	resolvedProperties
} from './model';
import type { LoadedResource, OldapDataModel } from './types';

const models: OldapDataModel[] = [
	{
		project: 'chama',
		resources: [
			{
				iri: 'chama:CataloguedPhotograph',
				label: ['Erschlossene Fotografie@de', 'Catalogued photograph@en'],
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
						iri: 'chama:publicDisplayPermission',
						name: ['Öffentliche Anzeige erlaubt@de'],
						datatype: 'xsd:boolean',
						order: 27
					}
				]
			},
			{
				iri: 'chama:Person',
				label: ['Person@de'],
				properties: [{ iri: 'schema:name', name: ['Name@de'], datatype: 'rdf:langString' }]
			},
			{ iri: 'chama:Agent', label: ['Akteur@de'], properties: [] }
		]
	},
	{
		project: 'shared',
		resources: [
			{
				iri: 'shared:MediaObject',
				label: ['Medienobjekt@de'],
				properties: [
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
	}
];

describe('resource presentation', () => {
	it('parses compact language strings from the final language suffix', () => {
		expect(parseLocalizedText('contact@example.org')).toEqual({
			text: 'contact@example.org',
			language: ''
		});
		expect(parseLocalizedText('Bahnhof Chama@de')).toEqual({
			text: 'Bahnhof Chama',
			language: 'de'
		});
	});

	it('uses locale, English, and readable QName fallbacks', () => {
		expect(localizedText(['Title@en', 'Titel@de'], 'de')).toBe('Titel');
		expect(localizedText(['Title@en'], 'fr')).toBe('Title');
		expect(fallbackLabel('chama:publicDisplayPermission')).toBe('Public Display Permission');
	});

	it('merges Shared superclass properties before project-class properties', () => {
		expect([...resolvedProperties('chama:CataloguedPhotograph', models).keys()]).toEqual([
			'shared:mediaAccessMode',
			'shared:originalName',
			'schema:name',
			'schema:description',
			'dcterms:creator',
			'chama:creationDating',
			'chama:publicDisplayPermission'
		]);
		expect(linkedPropertyIris('chama:CataloguedPhotograph', models)).toEqual(
			new Set(['dcterms:creator'])
		);
	});

	it('builds localized fields and resolved resource links without Chama-specific rendering', () => {
		const loaded: LoadedResource = {
			record: {
				'rdf:type': ['chama:CataloguedPhotograph'],
				'schema:name': ['K-36 #488 im Panorama@de'],
				'schema:description': ['Eine Dampflokomotive in Chama.@de'],
				'dcterms:creator': ['chama:LukasRosenthaler'],
				'chama:creationDating': ['2018-07-10 - 2018-07-10 (GREGORIAN, DAY)'],
				'shared:mediaAccessMode': ['local'],
				'shared:originalName': ['IMG_1751.HEIC'],
				'chama:publicDisplayPermission': true,
				'oldap:attachedToRole': { 'oldap:Unknown': 'DATA_VIEW' }
			},
			models,
			linkedRecords: new Map([
				[
					'chama:LukasRosenthaler',
					{ 'rdf:type': ['chama:Person'], 'schema:name': ['Lukas Rosenthaler@de'] }
				]
			]),
			media: null
		};
		const presentation = presentResource(loaded, 'chama:IMG_1751', 'de');

		expect(presentation).toMatchObject({
			classLabel: 'Erschlossene Fotografie',
			title: 'K-36 #488 im Panorama',
			description: 'Eine Dampflokomotive in Chama.',
			publiclyReadable: true,
			isMediaObject: true,
			mediaAvailable: false
		});
		expect(presentation.fields.find(({ iri }) => iri === 'dcterms:creator')?.links).toEqual([
			{ iri: 'chama:LukasRosenthaler', title: 'Lukas Rosenthaler', classLabel: 'Person' }
		]);
		expect(presentation.fields.find(({ iri }) => iri === 'shared:originalName')?.values).toEqual([
			'IMG_1751.HEIC'
		]);
		expect(presentation.fields.find(({ iri }) => iri === 'chama:creationDating')).toMatchObject({
			values: ['2018-07-10 - 2018-07-10 (GREGORIAN, DAY)'],
			links: []
		});
	});
});
