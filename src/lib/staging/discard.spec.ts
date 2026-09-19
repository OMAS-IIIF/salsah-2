import { describe, expect, it, vi } from 'vitest';
import type { StagingMediaObjectNode } from './types';
import { discardStagingMediaObject } from './discard';

const media: StagingMediaObjectNode = {
	iri: 'chama:StagedImage',
	resclass: 'shared:StagingMediaObject',
	areaIri: 'chama:Area',
	folderIri: 'chama:Photos',
	originalName: 'IMG_1001.HEIC',
	mimeType: 'image/heic',
	statusIri: 'shared:StagingStatusNew',
	assetId: 'asset 1001',
	checksum: 'abc123',
	protocol: 'iiif',
	derivativeName: 'master.tif',
	mediaDelivery: null
};

describe('Staging media discard', () => {
	it('binds the delete to the exact resource and Staging-only policy', async () => {
		const fetch = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
			async () =>
				new Response(
					JSON.stringify({
						iri: media.iri,
						assetId: media.assetId,
						cleanupPending: false
					}),
					{ status: 200, headers: { 'Content-Type': 'application/json' } }
				)
		);

		const result = await discardStagingMediaObject(media, {
			fetch,
			mediaBaseUrl: () => 'https://media.example'
		});

		expect(result.cleanupPending).toBe(false);
		const [url, init] = fetch.mock.calls[0];
		expect(String(url)).toBe(
			'https://media.example/upload/asset%201001?expectedResourceIri=chama%3AStagedImage&stagingOnly=true'
		);
		expect(init?.method).toBe('DELETE');
	});

	it('retains the actionable server rejection', async () => {
		await expect(
			discardStagingMediaObject(media, {
				fetch: async () =>
					new Response(JSON.stringify({ error: 'Resource is still referenced.' }), {
						status: 409,
						headers: { 'Content-Type': 'application/json' }
					}),
				mediaBaseUrl: () => 'https://media.example'
			})
		).rejects.toThrow('Resource is still referenced.');
	});
});
