import { beforeEach, describe, it, expect, vi } from 'vitest';
import {
	validInventory,
	readFolderInventory,
	loadRepositoryMedia,
	commonSourceFolder,
	writableDraft,
	moveReference
} from './repository';
import { discardStagingMediaObject } from './discard';
import type { StagingMediaObjectNode } from './types';
const mocks = vi.hoisted(() => ({ request: vi.fn(), summaries: vi.fn() }));
vi.mock('$lib/archive/client', () => ({ archiveRequest: mocks.request }));
vi.mock('$lib/resources/client', () => ({
	readResourceSummaries: mocks.summaries,
	readResource: vi.fn()
}));
const reference = {
	kind: 'archiveReference' as const,
	mediaIri: 'urn:ref',
	title: 'Original',
	canDownloadOriginal: true,
	canEditMetadata: false,
	canMove: true,
	canDeleteMedia: false
};
const page = {
	folderIri: 'urn:folder',
	revision: 'a'.repeat(64),
	entries: [reference],
	nextCursor: null,
	warnings: []
};
const medium = {
	iri: 'urn:ref',
	folderIri: 'urn:folder',
	repositoryEntry: reference
} as StagingMediaObjectNode;
beforeEach(() => vi.clearAllMocks());
describe('generic permanent private repository', () => {
	it('rejects reference write capabilities and malformed inventories', () => {
		expect(validInventory(page)).toBe(true);
		expect(validInventory({ ...page, entries: [{ ...reference, canDeleteMedia: true }] })).toBe(
			false
		);
		expect(validInventory({ ...page, revision: 'invalid' })).toBe(false);
	});
	it('reads all pages of one revision and rejects stale or looping cursors', async () => {
		mocks.request
			.mockResolvedValueOnce({ ...page, nextCursor: 'next' })
			.mockResolvedValueOnce({ ...page, entries: [] });
		expect((await readFolderInventory('museum', 'urn:folder')).entries).toHaveLength(1);
		mocks.request
			.mockResolvedValueOnce({ ...page, nextCursor: 'next' })
			.mockResolvedValueOnce({ ...page, revision: 'b'.repeat(64) });
		await expect(readFolderInventory('museum', 'urn:folder')).rejects.toThrow('changed');
		mocks.request.mockResolvedValue({ ...page, nextCursor: 'next' });
		await expect(readFolderInventory('museum', 'urn:folder')).rejects.toThrow('Repeated');
	});
	it('resolves protected contents without project-specific fields', async () => {
		mocks.request.mockResolvedValue(page);
		mocks.summaries.mockResolvedValue([
			{
				iri: 'urn:ref',
				resclass: 'museum:Photograph',
				data: { 'shared:originalName': ['photo.tif'] },
				mediaDelivery: null
			}
		]);
		const result = await loadRepositoryMedia('museum', 'urn:area', 'urn:folder');
		expect(result[0]).toMatchObject({
			iri: 'urn:ref',
			resclass: 'museum:Photograph',
			originalName: 'photo.tif',
			repositoryEntry: reference
		});
		expect(writableDraft(result[0])).toBe(false);
	});
	it('never sends a binary DELETE for a reference', async () => {
		const fetch = vi.fn();
		await expect(
			discardStagingMediaObject(medium, { fetch, mediaBaseUrl: () => 'http://media.test' })
		).rejects.toThrow('cannot delete');
		expect(fetch).not.toHaveBeenCalled();
	});
	it('uses a default only for one common source folder', () => {
		expect(commonSourceFolder([])).toBe(null);
		expect(commonSourceFolder([medium, medium])).toBe('urn:folder');
		expect(commonSourceFolder([medium, { ...medium, folderIri: 'urn:other' }])).toBe(null);
	});
	it('replays the exact private move command and UUID', async () => {
		const command = {
			mediaIri: 'urn:ref',
			sourceFolderIri: 'urn:folder',
			targetFolderIri: 'urn:target',
			sourceRevision: page.revision,
			targetRevision: 'b'.repeat(64)
		};
		const id = '1632e6ae-136b-4aab-8670-d939f3361240';
		await moveReference('museum', command, id);
		await moveReference('museum', command, id);
		expect(mocks.request.mock.calls[0]).toEqual(mocks.request.mock.calls[1]);
		expect(mocks.request).toHaveBeenCalledWith(
			'/data/museum/staging-reference-move',
			command,
			'POST',
			id
		);
	});
});
