import { afterEach, describe, expect, it, vi } from 'vitest';
import { authenticatedFetch } from '$lib/api/client';
import { createStory, loadStoryAdministration, updateStory } from './client';

vi.mock('$lib/api/baseUrl', () => ({ getApiBaseUrl: () => 'https://api.example' }));
vi.mock('$lib/api/client', () => ({ authenticatedFetch: vi.fn() }));

afterEach(() => vi.mocked(authenticatedFetch).mockReset());

describe('Story administration client', () => {
	it('discovers the project Story class before issuing the bounded search', async () => {
		vi.mocked(authenticatedFetch).mockImplementation(async (input, init) => {
			const path = new URL(String(input)).pathname;
			if (path === '/admin/datamodel/chama') {
				return Response.json({
					project: 'chama',
					resources: [
						{
							iri: 'chama:Story',
							properties: [
								{ iri: 'schema:text', datatype: 'rdf:langString' },
								{ iri: 'schema:author', toClass: 'chama:Person' }
							]
						},
						{
							iri: 'chama:StorySection',
							properties: [{ iri: 'schema:text', datatype: 'rdf:langString' }]
						}
					]
				});
			}
			const body = JSON.parse(String(init?.body)) as { resClass: string; limit: number };
			expect(body).toMatchObject({ resClass: 'chama:Story', limit: 100 });
			return Response.json([
				{
					iri: 'chama:Story1',
					resclass: 'chama:Story',
					'schema:name': ['First Story@en']
				}
			]);
		});

		await expect(loadStoryAdministration('chama')).resolves.toMatchObject({
			classIris: ['chama:Story'],
			stories: [{ iri: 'chama:Story1', resclass: 'chama:Story' }]
		});
	});

	it('replaces editable metadata and narratives and verifies the result', async () => {
		vi.mocked(authenticatedFetch)
			.mockResolvedValueOnce(Response.json({ message: 'updated' }))
			.mockResolvedValueOnce(
				Response.json({
					'schema:name': ['Titel@de'],
					'schema:abstract': null,
					'schema:author': ['chama:AdaArchivist'],
					'schema:text': ['Text\n\n:::asset{iri="chama:Image1"}\n:::@de'],
					'schema:mentions': ['chama:Image1']
				})
			);

		await updateStory(
			'chama',
			'chama:Story1',
			[
				{
					language: 'de',
					title: 'Titel',
					summary: '',
					markdown: 'Text\n\n:::asset{iri="chama:Image1"}\n:::'
				}
			],
			'chama:AdaArchivist'
		);

		const [, init] = vi.mocked(authenticatedFetch).mock.calls[0];
		expect(init?.method).toBe('POST');
		expect(JSON.parse(String(init?.body))).toEqual({
			'schema:name': ['Titel@de'],
			'schema:abstract': null,
			'schema:author': 'chama:AdaArchivist',
			'schema:text': ['Text\n\n:::asset{iri="chama:Image1"}\n:::@de'],
			'schema:mentions': ['chama:Image1']
		});
	});

	it('creates with an OLDAP-generated identity and verifies the private record', async () => {
		vi.mocked(authenticatedFetch)
			.mockResolvedValueOnce(Response.json({ message: 'OK', iri: 'urn:uuid:new-story' }))
			.mockResolvedValueOnce(
				Response.json({
					'rdf:type': ['chama:Story'],
					'schema:name': ['Neue Geschichte@de'],
					'schema:author': ['chama:AdaArchivist'],
					'oldap:attachedToRole': { 'chama:Curator': 'DATA_PERMISSIONS' }
				})
			);

		await expect(
			createStory('chama', {
				classIri: 'chama:Story',
				title: ' Neue Geschichte ',
				language: 'DE',
				authorIri: 'chama:AdaArchivist',
				roleIri: 'chama:Curator'
			})
		).resolves.toMatchObject({ iri: 'urn:uuid:new-story' });

		const [url, init] = vi.mocked(authenticatedFetch).mock.calls[0];
		expect(url).toBe('https://api.example/data/chama/Story');
		expect(init?.method).toBe('PUT');
		expect(JSON.parse(String(init?.body))).toEqual({
			'schema:name': ['Neue Geschichte@de'],
			'schema:author': 'chama:AdaArchivist',
			'oldap:attachedToRole': { 'chama:Curator': 'DATA_PERMISSIONS' }
		});
		expect(JSON.parse(String(init?.body))).not.toHaveProperty('iri');
		expect(JSON.parse(String(init?.body))).not.toHaveProperty('schema:text');
	});
});
