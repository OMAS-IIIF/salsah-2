import { describe, expect, it } from 'vitest';
import { insertStoryAsset, isStoryAssetIri, parseStoryMarkdown, storyAssetIris } from './markdown';

describe('Story Markdown', () => {
	it('separates sanitized prose and stable asset directives in document order', () => {
		const nodes = parseStoryMarkdown(`# First section

Text with **emphasis** and <script>alert('unsafe')</script>.

:::asset{iri="chama:IMG_1520" caption="Chama station"}
:::

## Second section

:::asset{iri="https://example.org/archive/item-1"}
:::`);

		expect(nodes).toEqual([
			{
				kind: 'html',
				html: expect.stringContaining('<strong>emphasis</strong>')
			},
			{ kind: 'asset', iri: 'chama:IMG_1520', caption: 'Chama station' },
			{ kind: 'html', html: '<h2>Second section</h2>' },
			{ kind: 'asset', iri: 'https://example.org/archive/item-1', caption: null }
		]);
		expect(nodes[0]).not.toEqual(
			expect.objectContaining({ html: expect.stringContaining('<script>') })
		);
		expect(storyAssetIris(nodes)).toEqual(['chama:IMG_1520', 'https://example.org/archive/item-1']);
	});

	it('marks malformed asset directives without treating their attributes as HTML', () => {
		expect(parseStoryMarkdown(':::asset{iri="not an iri"}\n:::')).toEqual([
			{ kind: 'invalid-asset' }
		]);
	});

	it('accepts QNames, HTTP IRIs, and URNs but rejects unsafe or incomplete values', () => {
		expect(isStoryAssetIri('chama:IMG_1751')).toBe(true);
		expect(isStoryAssetIri('https://example.org/item/1')).toBe(true);
		expect(isStoryAssetIri('urn:uuid:3bbcee75-b500-4e08-b6a2-88a6c217ec1e')).toBe(true);
		expect(isStoryAssetIri('javascript:alert(1)')).toBe(false);
		expect(isStoryAssetIri('chama:')).toBe(false);
	});

	it('inserts a valid directive at a textarea selection with readable spacing', () => {
		const markdown = 'First paragraph.\n\nText to replace\n\nLast paragraph.';
		const start = markdown.indexOf('Text to replace');
		const result = insertStoryAsset(markdown, 'chama:IMG_1751', start, start + 15);
		expect(result.markdown).toBe(
			'First paragraph.\n\n:::asset{iri="chama:IMG_1751"}\n:::\n\nLast paragraph.'
		);
		expect(result.cursor).toBe(result.markdown.indexOf('Last paragraph.'));
		expect(storyAssetIris(parseStoryMarkdown(result.markdown))).toEqual(['chama:IMG_1751']);
	});
});
