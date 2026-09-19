import { describe, expect, it, vi } from 'vitest';
import {
	catalogueStagingMediaBatch,
	suggestedCatalogueTitle,
	type BatchCatalogueItem
} from './batchCatalogue';
import type { CatalogueTarget } from './catalogue';
import type { StagingMediaObjectNode } from './types';

function media(iri: string, originalName: string): StagingMediaObjectNode {
	return {
		iri,
		resclass: 'shared:StagingMediaObject',
		folderIri: 'chama:Incoming',
		areaIri: 'chama:Staging',
		originalName,
		mimeType: 'image/jpeg',
		statusIri: 'shared:StagingStatusNew',
		assetId: iri,
		checksum: null,
		protocol: 'iiif',
		derivativeName: 'master.tif',
		mediaDelivery: null
	};
}

const target: CatalogueTarget = {
	iri: 'chama:CataloguedPhotograph',
	label: 'Photograph',
	description: null,
	fields: [],
	relations: []
};

describe('Staging batch catalogue', () => {
	it('suggests an editable title without the extension and filename separators', () => {
		expect(suggestedCatalogueTitle(media('chama:One', 'IMG_1001-final.JPG'))).toBe(
			'IMG 1001 final'
		);
	});

	it('stops after the first failed transform and reports untouched items', async () => {
		const items: BatchCatalogueItem[] = [
			{
				media: media('chama:One', 'one.jpg'),
				values: { 'schema:name': 'One' },
				relations: { 'dcterms:creator': ['chama:Creator'] }
			},
			{ media: media('chama:Two', 'two.jpg'), values: { 'schema:name': 'Two' } },
			{ media: media('chama:Three', 'three.jpg'), values: { 'schema:name': 'Three' } }
		];
		const catalogue = vi
			.fn()
			.mockResolvedValueOnce({ iri: 'chama:One', resourceClass: target.iri, record: {} })
			.mockRejectedValueOnce(new Error('Conflict'));
		const progress = vi.fn();

		const report = await catalogueStagingMediaBatch('chama', target, 'de', items, progress, {
			catalogue
		});

		expect(catalogue).toHaveBeenCalledTimes(2);
		expect(catalogue.mock.calls[0][3]).toMatchObject({
			relations: { 'dcterms:creator': ['chama:Creator'] }
		});
		expect(progress).toHaveBeenCalledWith(1, 3);
		expect(report.completed).toBe(1);
		expect(report.failed).toBe(true);
		expect(report.outcomes.map(({ status }) => status)).toEqual([
			'catalogued',
			'failed',
			'not_started'
		]);
	});
});
