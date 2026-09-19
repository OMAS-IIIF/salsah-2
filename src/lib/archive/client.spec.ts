import { expandProjectIri } from './iri';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	archiveRequest,
	ArchiveRequestError,
	validPlan,
	isDefiniteRejection,
	structureCapabilities
} from './client';
const fetchMock = vi.hoisted(() => vi.fn());
vi.mock('$lib/api/client', () => ({ authenticatedFetch: fetchMock }));
vi.mock('$lib/api/baseUrl', () => ({ getApiBaseUrl: () => 'http://api.test' }));
beforeEach(() => fetchMock.mockReset());
describe('archive commands', () => {
	it('resolves search QNames only through the actual project namespace', () => {
		expect(expandProjectIri('museum', 'https://collections.example/ns/', 'museum:Intake')).toBe(
			'https://collections.example/ns/Intake'
		);
		expect(expandProjectIri('museum', undefined, 'urn:example:unit')).toBe('urn:example:unit');
		expect(() => expandProjectIri('museum', undefined, 'museum:Intake')).toThrow();
		expect(() =>
			expandProjectIri('museum', 'https://collections.example/ns/', 'other:Intake')
		).toThrow();
	});

	it('preserves conflict codes and treats only definite rejection as abandonable', async () => {
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ code: 'STALE_REVIEW', message: 'Review again' }), {
				status: 409
			})
		);
		try {
			await archiveRequest('/archive/museum/structure/apply', {});
			throw new Error('Expected rejection');
		} catch (error) {
			expect(isDefiniteRejection(error)).toBe(true);
		}
		expect(
			isDefiniteRejection(new ArchiveRequestError('busy', 503, 'COORDINATION_UNAVAILABLE'))
		).toBe(false);
		expect(isDefiniteRejection(new TypeError('connection lost'))).toBe(false);
	});
	it('fails closed on malformed capabilities', async () => {
		fetchMock.mockResolvedValue(new Response('{}'));
		await expect(structureCapabilities('museum')).rejects.toThrow('Invalid');
	});
	it('accepts generic reviewed plans, rejects unknown levels and damaged recovery', () => {
		const plan = {
			sourceFolderIri: 'urn:folder',
			sourceSnapshot: 'a'.repeat(64),
			newUnits: [
				{
					key: 'u1',
					name: { de: 'Sammlung', fr: 'Collection' },
					archiveLevel: 'shared:Fonds',
					parent: null
				}
			],
			mappings: [{ folderIri: 'urn:folder', action: 'set', target: { key: 'u1' } }]
		};
		expect(validPlan(plan)).toBe(true);
		expect(
			validPlan({ ...plan, newUnits: [{ ...plan.newUnits[0], archiveLevel: 'museum:Invented' }] })
		).toBe(false);
		expect(validPlan(null)).toBe(false);
	});
});
