import type { Root, RootContent } from 'mdast';
import type { ContainerDirective } from 'mdast-util-directive';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkDirective from 'remark-directive';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

/** A safe, presentation-neutral block produced from persisted Story Markdown. */
export type StoryMarkdownNode =
	| { kind: 'html'; html: string }
	| { kind: 'asset'; iri: string; caption: string | null }
	| { kind: 'invalid-asset' };

function isContainerDirective(node: RootContent): node is ContainerDirective {
	return node.type === 'containerDirective';
}

/** Accept a compact QName or an absolute HTTP(S)/URN resource identifier. */
export function isStoryAssetIri(value: string): boolean {
	try {
		const url = new URL(value);
		if (['http:', 'https:', 'urn:'].includes(url.protocol)) return true;
	} catch {
		// A QName is intentionally not required to be an absolute URL.
	}
	return /^[A-Za-z_][\w.-]*:[A-Za-z0-9_][\w.-]*$/.test(value);
}

function renderMarkdownBlocks(children: RootContent[]): string {
	if (!children.length) return '';
	const mdast: Root = { type: 'root', children };
	const hast = unified().use(remarkRehype).use(rehypeSanitize).runSync(mdast);
	return String(unified().use(rehypeStringify).stringify(hast));
}

/**
 * Parse persisted Story Markdown into sanitized prose and explicit asset blocks.
 *
 * Raw HTML is never passed through. Only a top-level
 * `:::asset{iri="project:Resource" caption="Optional caption"}` directive has
 * SALSAH semantics; every other block is handled as ordinary Markdown.
 */
export function parseStoryMarkdown(markdown: string): StoryMarkdownNode[] {
	const tree = unified().use(remarkParse).use(remarkDirective).parse(markdown) as Root;
	const result: StoryMarkdownNode[] = [];
	let prose: RootContent[] = [];

	function flushProse(): void {
		const html = renderMarkdownBlocks(prose).trim();
		if (html) result.push({ kind: 'html', html });
		prose = [];
	}

	for (const child of tree.children) {
		if (!isContainerDirective(child) || child.name.toLowerCase() !== 'asset') {
			prose.push(child);
			continue;
		}
		flushProse();
		const iri = typeof child.attributes?.iri === 'string' ? child.attributes.iri.trim() : '';
		if (!isStoryAssetIri(iri)) {
			result.push({ kind: 'invalid-asset' });
			continue;
		}
		const rawCaption = child.attributes?.caption;
		const caption = typeof rawCaption === 'string' && rawCaption.trim() ? rawCaption.trim() : null;
		result.push({ kind: 'asset', iri, caption });
	}
	flushProse();
	return result;
}

/** Return first-occurrence asset IRIs in document order. */
export function storyAssetIris(nodes: StoryMarkdownNode[]): string[] {
	return [...new Set(nodes.flatMap((node) => (node.kind === 'asset' ? [node.iri] : [])))];
}

export interface StoryAssetInsertion {
	markdown: string;
	cursor: number;
}

/**
 * Insert one stable asset directive at a textarea selection.
 *
 * The selected range is replaced, surrounding prose receives one blank line,
 * and the returned cursor sits after the complete inserted block. Delivery
 * URLs and captions are intentionally absent; the renderer derives the live
 * resource title and authorized media representation from OLDAP.
 */
export function insertStoryAsset(
	markdown: string,
	iri: string,
	selectionStart: number,
	selectionEnd = selectionStart
): StoryAssetInsertion {
	if (!isStoryAssetIri(iri)) throw new Error(`Invalid Story asset IRI: ${iri}`);
	const start = Math.max(0, Math.min(selectionStart, markdown.length));
	const end = Math.max(start, Math.min(selectionEnd, markdown.length));
	const before = markdown.slice(0, start);
	const after = markdown.slice(end);
	const leading = !before || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
	const trailing = !after || after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
	const existingTrailingSpacing = after.startsWith('\n\n') ? 2 : after.startsWith('\n') ? 1 : 0;
	const inserted = `${leading}:::asset{iri="${iri}"}\n:::${trailing}`;
	return {
		markdown: `${before}${inserted}${after}`,
		cursor: before.length + inserted.length + existingTrailingSpacing
	};
}
