import { describe, expect, it } from 'vitest';
import { withMediaCapability } from './capability';

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
