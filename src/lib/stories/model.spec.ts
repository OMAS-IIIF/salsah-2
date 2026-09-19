import { describe, expect, it } from 'vitest';
import type { OldapDataModel } from '$lib/resources/types';
import {
	hasInvalidStoryAsset,
	mentionedStoryIris,
	serializeStoryLanguageDrafts,
	storyAuthorClass,
	storyClasses,
	storyEditorDrafts,
	storyLanguageDrafts,
	storyUpdateMatches,
	storyUpdatePayload
} from './model';

const model: OldapDataModel = {
	project: 'example',
	resources: [
		{
			iri: 'example:Story',
			label: ['Story@en'],
			properties: [
				{ iri: 'schema:text', datatype: 'rdf:langString' },
				{ iri: 'schema:author', toClass: 'oldap:Thing' }
			]
		},
		{
			iri: 'example:StorySection',
			label: ['Story section@en'],
			properties: [{ iri: 'schema:text', datatype: 'rdf:langString' }]
		}
	]
};

describe('Story administration model', () => {
	it('discovers narrative classes without treating text-only sections as Stories', () => {
		expect(storyClasses(model).map(({ iri }) => iri)).toEqual(['example:Story']);
		expect(storyAuthorClass(model, 'example:Story')).toBe('oldap:Thing');
	});

	it('round-trips language drafts through the OLDAP JSON convention', () => {
		const drafts = storyLanguageDrafts(['Deutscher Text@de', 'English text@en']);
		expect(drafts).toEqual([
			{ language: 'de', markdown: 'Deutscher Text' },
			{ language: 'en', markdown: 'English text' }
		]);
		expect(serializeStoryLanguageDrafts(drafts)).toEqual(['Deutscher Text@de', 'English text@en']);
	});

	it('derives a unique cross-language mention index and blocks malformed directives', () => {
		const drafts = [
			{
				language: 'de',
				title: 'Erste Geschichte',
				summary: 'Kurz erklärt',
				markdown: ':::asset{iri="example:One"}\n:::\n\n:::asset{iri="example:Two"}\n:::'
			},
			{
				language: 'en',
				title: 'First Story',
				summary: '',
				markdown: ':::asset{iri="example:Two"}\n:::'
			}
		];
		expect(mentionedStoryIris(drafts)).toEqual(['example:One', 'example:Two']);
		expect(hasInvalidStoryAsset(drafts)).toBe(false);
		const payload = storyUpdatePayload(drafts, 'example:Ada');
		expect(payload).toEqual({
			'schema:name': ['Erste Geschichte@de', 'First Story@en'],
			'schema:abstract': ['Kurz erklärt@de'],
			'schema:author': 'example:Ada',
			'schema:text': [
				':::asset{iri="example:One"}\n:::\n\n:::asset{iri="example:Two"}\n:::@de',
				':::asset{iri="example:Two"}\n:::@en'
			],
			'schema:mentions': ['example:One', 'example:Two']
		});
		expect(
			storyUpdateMatches(
				{
					'schema:name': ['First Story@en', 'Erste Geschichte@de'],
					'schema:abstract': ['Kurz erklärt@de'],
					'schema:author': ['example:Ada'],
					'schema:text': payload['schema:text'],
					'schema:mentions': payload['schema:mentions']
				},
				payload
			)
		).toBe(true);
		expect(
			hasInvalidStoryAsset([{ language: 'de', markdown: ':::asset{iri="broken iri"}\n:::' }])
		).toBe(true);
	});

	it('combines metadata-only and narrative languages without inventing values', () => {
		expect(
			storyEditorDrafts({
				'schema:name': ['Deutscher Titel@de', 'English title@en'],
				'schema:abstract': ['English summary@en'],
				'schema:text': ['Deutscher Text@de']
			})
		).toEqual([
			{ language: 'de', title: 'Deutscher Titel', summary: '', markdown: 'Deutscher Text' },
			{ language: 'en', title: 'English title', summary: 'English summary', markdown: '' }
		]);
	});
});
