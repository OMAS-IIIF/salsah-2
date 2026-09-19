import { describe, expect, it } from 'vitest';
import type { OldapDataModel, OldapResourceRecord } from '$lib/resources/types';
import {
	resourceEditorDefinition,
	resourceEditorDraft,
	resourceUpdateMatches,
	resourceUpdatePayload
} from './model';

const model: OldapDataModel = {
	project: 'chama',
	resources: [
		{
			iri: 'chama:Photo',
			label: ['Fotografie@de'],
			properties: [
				{
					iri: 'schema:name',
					name: ['Titel@de'],
					datatype: 'rdf:langString',
					minCount: 1,
					order: 20
				},
				{ iri: 'schema:description', datatype: 'rdf:langString', order: 21 },
				{ iri: 'dcterms:creator', toClass: 'chama:Agent', order: 22 },
				{ iri: 'chama:capturePlace', toClass: 'chama:Place', maxCount: 1, order: 24 },
				{ iri: 'chama:dating', toClass: 'oldap:Dating' },
				{ iri: 'chama:inverse', toClass: 'chama:Thing', inverseOf: 'chama:forward' }
			]
		}
	]
};

describe('generic resource editor model', () => {
	it('derives controlled text fields and safe forward relations', () => {
		const definition = resourceEditorDefinition('chama:Photo', [model], 'de');
		expect(definition.classLabel).toBe('Fotografie');
		expect(definition.fields.map(({ iri }) => iri)).toEqual(['schema:name', 'schema:description']);
		expect(
			definition.relations.map(({ iri, allowsMultiple }) => ({ iri, allowsMultiple }))
		).toEqual([
			{ iri: 'dcterms:creator', allowsMultiple: true },
			{ iri: 'chama:capturePlace', allowsMultiple: false }
		]);
	});

	it('preserves languages, clears optional values, and verifies exact controlled values', () => {
		const definition = resourceEditorDefinition('chama:Photo', [model], 'de');
		const record: OldapResourceRecord = {
			'rdf:type': ['chama:Photo'],
			'schema:name': ['Bahnhof@de', 'Station@en'],
			'schema:description': ['Abends@de'],
			'dcterms:creator': ['chama:Lukas'],
			'chama:capturePlace': ['chama:Chama']
		};
		const draft = resourceEditorDraft(record, definition, 'de');
		draft.languages.find(({ language }) => language === 'de')!.values['schema:description'] = '';
		draft.relations['dcterms:creator'] = ['chama:Lukas', 'chama:Ruedi'];
		const payload = resourceUpdatePayload(definition, draft);
		expect(payload).toEqual({
			'schema:name': ['Bahnhof@de', 'Station@en'],
			'schema:description': null,
			'dcterms:creator': ['chama:Lukas', 'chama:Ruedi'],
			'chama:capturePlace': ['chama:Chama']
		});
		expect(
			resourceUpdateMatches({ ...record, ...payload, 'shared:assetId': ['asset'] }, payload)
		).toBe(true);
		expect(resourceUpdateMatches(record, payload)).toBe(false);
	});
});
