import { describe, expect, it } from 'vitest';
import { safeReturnPath } from './navigation';

describe('safeReturnPath', () => {
	it.each([
		null,
		'',
		'archive',
		'//evil.example',
		'/\\evil.example',
		'/archive\nmalformed',
		'https://evil.example'
	])('rejects %s', (value) => {
		expect(safeReturnPath(value)).toBe('/');
	});

	it.each(['/archive', '/?view=recent', '/imports/123'])('accepts local path %s', (value) => {
		expect(safeReturnPath(value)).toBe(value);
	});
});
