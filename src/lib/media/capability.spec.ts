import { describe, expect, it } from 'vitest';
import { mediaPreviewUrl, withMediaCapability } from './capability';

describe('media capability URLs', () => {
	it('adds the capability to IIIF metadata and tile requests', () => {
		expect(
			withMediaCapability('https://media.example.org/iiif/3/image/full/max/0/default.jpg', 'a+b')
		).toBe('https://media.example.org/iiif/3/image/full/max/0/default.jpg?token=a%2Bb');
	});

	it('preserves existing parameters and leaves public requests unchanged', () => {
		expect(withMediaCapability('https://media.example.org/info.json?format=json', 'secret')).toBe(
			'https://media.example.org/info.json?format=json&token=secret'
		);
		expect(withMediaCapability('https://media.example.org/info.json', null)).toBe(
			'https://media.example.org/info.json'
		);
	});
});

describe('media preview URLs', () => {
	it('creates an authorized bounded IIIF image request', () => {
		expect(
			mediaPreviewUrl({
				kind: 'iiif-image',
				infoUrl: 'https://media.example.org/iiif/3/IMG%201751/info.json',
				capability: 'short lived'
			})
		).toBe(
			'https://media.example.org/iiif/3/IMG%201751/full/!720,480/0/default.jpg?token=short+lived'
		);
	});

	it('prefers an external thumbnail and otherwise uses the original URL', () => {
		expect(
			mediaPreviewUrl({
				kind: 'external-image',
				url: 'https://images.example.org/full.jpg',
				thumbnailUrl: 'https://images.example.org/thumb.jpg'
			})
		).toBe('https://images.example.org/thumb.jpg');
		expect(
			mediaPreviewUrl({
				kind: 'external-image',
				url: 'https://images.example.org/full.jpg',
				thumbnailUrl: null
			})
		).toBe('https://images.example.org/full.jpg');
	});
});
