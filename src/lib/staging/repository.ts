/** Signed mixed inventories and private reference commands; no project-specific vocabulary. */
import { absoluteProjectIri } from '$lib/archive/iri';
import { archiveRequest } from '$lib/archive/client';
import { readResourceSummaries, readResource } from '$lib/resources/client';
import { valuesOf } from '$lib/resources/model';
import type { StagingMediaObjectNode } from './types';
export interface RepositoryEntry {
	kind: 'stagingMedia' | 'archiveReference';
	mediaIri: string;
	title: string;
	canDownloadOriginal: boolean;
	canEditMetadata: boolean;
	canMove: boolean;
	canDeleteMedia: boolean;
}
export interface FolderInventory {
	folderIri: string;
	revision: string;
	entries: RepositoryEntry[];
	nextCursor: string | null;
	warnings: { code: string; message: string }[];
}
export interface ReferenceMove {
	mediaIri: string;
	sourceFolderIri: string;
	targetFolderIri: string;
	sourceRevision: string;
	targetRevision: string;
}
export function validInventory(value: unknown): value is FolderInventory {
	const v = value as FolderInventory;
	return Boolean(
		v &&
		typeof v.folderIri === 'string' &&
		/^[a-f0-9]{64}$/.test(v.revision) &&
		(v.nextCursor === null || typeof v.nextCursor === 'string') &&
		Array.isArray(v.entries) &&
		v.entries.length <= 100 &&
		Array.isArray(v.warnings) &&
		v.entries.every(
			(e) =>
				e &&
				typeof e === 'object' &&
				['stagingMedia', 'archiveReference'].includes(e.kind) &&
				typeof e.mediaIri === 'string' &&
				typeof e.title === 'string' &&
				[e.canDownloadOriginal, e.canEditMetadata, e.canMove, e.canDeleteMedia].every(
					(c) => typeof c === 'boolean'
				) &&
				(e.kind !== 'archiveReference' || (!e.canEditMetadata && !e.canDeleteMedia))
		)
	);
}
/** Complete one stable revision before presenting any page; cursors cannot loop. */
export async function readFolderInventory(
	project: string,
	folderIri: string
): Promise<FolderInventory> {
	const canonicalFolderIri = absoluteProjectIri(project, folderIri);
	let cursor: string | null = null;
	let result: FolderInventory | null = null;
	const seen = new Set<string>();
	do {
		const query: URLSearchParams = new URLSearchParams({
			folderIri: canonicalFolderIri,
			limit: '100',
			...(cursor ? { cursor } : {})
		});
		const page: unknown = await archiveRequest<unknown>(
			`/data/${encodeURIComponent(project)}/staging-folder-inventory?${query}`
		);
		if (
			!validInventory(page) ||
			page.folderIri !== canonicalFolderIri ||
			(result && (result.revision !== page.revision || result.folderIri !== page.folderIri))
		)
			throw new Error('Invalid or changed folder inventory. Reload the folder.');
		if (!result) result = { ...page, entries: [], warnings: [] };
		result.entries.push(...page.entries);
		result.warnings.push(...page.warnings);
		cursor = page.nextCursor;
		if (cursor && seen.has(cursor)) throw new Error('Repeated inventory cursor.');
		if (cursor) seen.add(cursor);
	} while (cursor);
	return { ...result!, nextCursor: null };
}
/** Resolve records in bounded summary batches, retaining private placement as UI context only. */
export async function loadRepositoryMedia(
	project: string,
	areaIri: string,
	folderIri: string
): Promise<StagingMediaObjectNode[]> {
	const inventory = await readFolderInventory(project, folderIri);
	const summaries = await readResourceSummaries(
		project,
		inventory.entries.map((e) => e.mediaIri),
		[
			'shared:originalName',
			'shared:originalMimeType',
			'shared:assetId',
			'shared:checksum',
			'shared:stagingStatus',
			'shared:protocol',
			'shared:derivativeName'
		],
		true
	);
	const records = new Map(summaries.map((s) => [absoluteProjectIri(project, s.iri), s]));
	return inventory.entries.flatMap((entry) => {
		const summary = records.get(entry.mediaIri);
		if (!summary) return [];
		const text = (key: string) => {
			const v = valuesOf(summary.data[key])[0];
			return typeof v === 'string' ? v : null;
		};
		return [
			{
				iri: entry.mediaIri,
				resclass: summary.resclass,
				folderIri,
				areaIri,
				originalName: text('shared:originalName') ?? entry.title,
				mimeType: text('shared:originalMimeType'),
				statusIri: text('shared:stagingStatus'),
				assetId: text('shared:assetId'),
				checksum: text('shared:checksum'),
				protocol: text('shared:protocol'),
				derivativeName: text('shared:derivativeName'),
				mediaDelivery: summary.mediaDelivery ?? null,
				repositoryEntry: entry,
				folderRevision: inventory.revision
			}
		];
	});
}
export function writableDraft(media: StagingMediaObjectNode): boolean {
	return (
		!media.repositoryEntry ||
		(media.repositoryEntry.kind === 'stagingMedia' && media.repositoryEntry.canEditMetadata)
	);
}
/** One explicit folder mapping, never ancestor inheritance or a last-used cross-folder choice. */
export async function folderArchiveDefault(project: string, folderIri: string): Promise<string> {
	const folder = await readResource(project, folderIri);
	const target = valuesOf(folder['shared:defaultArchiveUnit'])[0];
	if (typeof target !== 'string') return '';
	await readResource(project, target);
	return target;
}
export function commonSourceFolder(media: StagingMediaObjectNode[]): string | null {
	return media.length && media.every((m) => m.folderIri === media[0].folderIri)
		? media[0].folderIri
		: null;
}
export function moveReference(project: string, request: ReferenceMove, id: string) {
	return archiveRequest<{ state: string; operationId: string }>(
		`/data/${encodeURIComponent(project)}/staging-reference-move`,
		request,
		'POST',
		id
	);
}
