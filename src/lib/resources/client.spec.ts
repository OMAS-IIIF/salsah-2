import { describe, expect, it } from 'vitest';
import { mediaDeliveryOf } from './client';

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
