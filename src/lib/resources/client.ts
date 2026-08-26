import { authenticatedFetch } from '$lib/api/client';
import { getApiBaseUrl } from '$lib/api/baseUrl';
import { assertedClass, linkedPropertyIris, valuesOf } from './model';
import type {
	LoadedResource,
	ArchiveTreeMedia,
	ArchiveTreeUnit,
	MediaDelivery,
	OldapDataModel,
	OldapResourceRecord,
	OldapResourceSearchHit,
	OldapResourceSummary,
	OldapResourceSummaryResponse,
	ResourceCard
} from './types';

const MEDIA_SUMMARY_PROPERTIES = [
	'shared:mediaAccessMode',
	'shared:protocol',
	'shared:serverUrl',
	'shared:assetId',
	'shared:mediaUrl',
	'shared:thumbnailUrl'
];
const CARD_SUMMARY_PROPERTIES = [
	'schema:name',
	'shared:hasMediaObject',
	...MEDIA_SUMMARY_PROPERTIES
];
const RESOURCE_SUMMARY_BATCH_SIZE = 100;
const ARCHIVE_SIBLING_LIMIT = 100;

export class OldapResourceError extends Error {
	constructor(
		message: string,
		readonly status: number
	) {
		super(message);
		this.name = 'OldapResourceError';
	}
}

async function responseMessage(response: Response): Promise<string | null> {
	try {
		const body = (await response.clone().json()) as { message?: unknown };
		return typeof body.message === 'string' ? body.message : null;
	} catch {
		return null;
	}
}

async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
	const headers = new Headers(init?.headers);
	if (!headers.has('Accept')) headers.set('Accept', 'application/json');
	const response = await authenticatedFetch(url, { ...init, headers });
	if (!response.ok) {
		throw new OldapResourceError(
			(await responseMessage(response)) ?? `OLDAP request failed (HTTP ${response.status}).`,
			response.status
		);
	}
	return (await response.json()) as T;
}

/**
 * List the most recently modified readable resources in a project.
 *
 * `oldap:Thing` is the project-neutral root class; GraphDB reasoning exposes
 * instances of project subclasses through it while OLDAP still enforces each
 * result's attached-role permission.
 */
export async function searchRecentResources(
	project: string,
	limit = 8
): Promise<OldapResourceSearchHit[]> {
	const result = await readJson<unknown>(
		`${getApiBaseUrl()}/data/search/${encodeURIComponent(project)}`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				resClass: 'oldap:Thing',
				includeProperties: ['schema:name', 'oldap:lastModificationDate'],
				sortBy: [{ property: 'oldap:lastModificationDate', direction: 'desc' }],
				limit
			})
		}
	);
	return searchHits(result);
}

function labelsForClass(model: OldapDataModel | null, classIri: string): string[] {
	return model?.resources.find(({ iri }) => iri === classIri)?.label ?? [];
}

function searchHits(result: unknown): OldapResourceSearchHit[] {
	if (!Array.isArray(result)) {
		throw new OldapResourceError('OLDAP returned an invalid resource-search response.', 500);
	}
	const unique = new Map<string, OldapResourceSearchHit>();
	for (const item of result) {
		if (
			item &&
			typeof item === 'object' &&
			typeof (item as { iri?: unknown }).iri === 'string' &&
			typeof (item as { resclass?: unknown }).resclass === 'string'
		) {
			const hit = item as OldapResourceSearchHit;
			if (!unique.has(hit.iri)) unique.set(hit.iri, hit);
		}
	}
	return [...unique.values()];
}

function firstString(record: OldapResourceRecord, property: string): string | null {
	const value = valuesOf(record[property])[0];
	return typeof value === 'string' && value.length > 0 ? value : null;
}

function firstNumber(record: OldapResourceRecord, property: string): number | null {
	const value = valuesOf(record[property])[0];
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && /^-?\d+$/.test(value)) return Number(value);
	return null;
}

/**
 * Load one visible level of the generic archive tree.
 *
 * Passing `null` selects root units without a parent. Passing an IRI selects
 * only direct children. This keeps initial work bounded independently of the
 * total archive size and leaves permission filtering to OLDAP.
 */
export async function searchArchiveUnits(
	project: string,
	parentIri: string | null
): Promise<ArchiveTreeUnit[]> {
	const filter =
		parentIri === null
			? [{ property: 'shared:parentArchiveUnit', op: 'NOT_EXISTS' }]
			: [
					{
						property: 'shared:parentArchiveUnit',
						op: '==',
						value: parentIri,
						type: 'iri'
					}
				];
	const result = await readJson<unknown>(
		`${getApiBaseUrl()}/data/search/${encodeURIComponent(project)}`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				resClass: 'shared:ArchiveUnit',
				includeProperties: [
					'schema:name',
					'shared:archiveLevel',
					'shared:parentArchiveUnit',
					'shared:hasMediaObject',
					'schema:position'
				],
				filter,
				limit: ARCHIVE_SIBLING_LIMIT
			})
		}
	);
	return searchHits(result)
		.map((record) => ({
			iri: record.iri,
			resclass: record.resclass,
			title: record['schema:name'],
			archiveLevel: firstString(record, 'shared:archiveLevel'),
			parentIri: firstString(record, 'shared:parentArchiveUnit'),
			position: firstNumber(record, 'schema:position'),
			mediaIris: valuesOf(record['shared:hasMediaObject']).filter(
				(value): value is string => typeof value === 'string'
			)
		}))
		.sort(
			(left, right) =>
				(left.position ?? Number.MAX_SAFE_INTEGER) - (right.position ?? Number.MAX_SAFE_INTEGER) ||
				left.iri.localeCompare(right.iri)
		);
}

/** Resolve the readable media contents of one archive unit with preview delivery. */
export async function loadArchiveMedia(
	project: string,
	mediaIris: string[]
): Promise<ArchiveTreeMedia[]> {
	if (!mediaIris.length) return [];
	const summaries = await readResourceSummaries(project, mediaIris, CARD_SUMMARY_PROPERTIES, true);
	return summaries.map((summary) => ({
		iri: summary.iri,
		resclass: summary.resclass,
		title: summary.data['schema:name'],
		media: summary.mediaDelivery ?? null
	}));
}

/**
 * Read permission-aware summaries, transparently splitting API-sized batches.
 *
 * The API intentionally omits both hidden and missing resources. This client
 * preserves the first occurrence of every requested IRI and never attempts a
 * follow-up existence probe for omitted entries.
 */
export async function readResourceSummaries(
	project: string,
	iris: string[],
	includeProperties: string[] = ['schema:name'],
	includeMediaDelivery = false
): Promise<OldapResourceSummary[]> {
	if (!iris.length) return [];
	const uniqueIris = [...new Set(iris)];
	const batches: string[][] = [];
	for (let index = 0; index < uniqueIris.length; index += RESOURCE_SUMMARY_BATCH_SIZE) {
		batches.push(uniqueIris.slice(index, index + RESOURCE_SUMMARY_BATCH_SIZE));
	}
	const responses = await Promise.all(
		batches.map((batch) =>
			readJson<OldapResourceSummaryResponse>(
				`${getApiBaseUrl()}/data/summaries/${encodeURIComponent(project)}`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ iris: batch, includeProperties, includeMediaDelivery })
				}
			)
		)
	);
	return responses.flatMap((result) => {
		if (!result || !Array.isArray(result.resources)) {
			throw new OldapResourceError('OLDAP returned an invalid resource-summary response.', 500);
		}
		return result.resources.filter(
			(summary): summary is OldapResourceSummary =>
				Boolean(summary) &&
				typeof summary.iri === 'string' &&
				typeof summary.resclass === 'string' &&
				Boolean(summary.data) &&
				typeof summary.data === 'object' &&
				!Array.isArray(summary.data)
		);
	});
}

async function loadResourceCards(
	project: string,
	resources: OldapResourceSearchHit[]
): Promise<ResourceCard[]> {
	const [model, summaries] = await Promise.all([
		readDataModel(project).catch(() => null),
		readResourceSummaries(
			project,
			resources.map(({ iri }) => iri),
			CARD_SUMMARY_PROPERTIES,
			true
		).catch(() => [])
	]);
	const summariesByIri = new Map(summaries.map((summary) => [summary.iri, summary]));
	const representationIris = [
		...new Set(
			summaries.flatMap((summary) => {
				if (summary.mediaDelivery || hasDeliveryReference(summary.data)) return [];
				const representations = valuesOf(summary.data['shared:hasMediaObject']).filter(
					(value): value is string => typeof value === 'string'
				);
				return representations.length === 1 ? representations : [];
			})
		)
	];
	const representations = await readResourceSummaries(
		project,
		representationIris,
		CARD_SUMMARY_PROPERTIES,
		true
	).catch(() => []);
	for (const representation of representations)
		summariesByIri.set(representation.iri, representation);

	return resources.map((resource) => {
		const summary = summariesByIri.get(resource.iri);
		const representationIris = summary
			? valuesOf(summary.data['shared:hasMediaObject']).filter(
					(value): value is string => typeof value === 'string'
				)
			: [];
		const representation =
			representationIris.length === 1 ? summariesByIri.get(representationIris[0]) : null;
		return {
			resource:
				summary?.data['schema:name'] === undefined
					? resource
					: { ...resource, 'schema:name': summary.data['schema:name'] },
			classLabels: labelsForClass(model, resource.resclass),
			media: summary?.mediaDelivery ?? representation?.mediaDelivery ?? null
		};
	});
}

/**
 * Load a bounded, permission-aware project overview.
 *
 * Class labels come from the live project model when available. Media previews
 * support both direct media resources and an archive resource's sole readable
 * representation. A model-label failure falls back to the class IRI in the UI
 * and does not hide otherwise readable resources.
 */
export async function loadRecentResourceCards(project: string, limit = 8): Promise<ResourceCard[]> {
	return loadResourceCards(project, await searchRecentResources(project, limit));
}

/** Search every readable textual field and enrich unique hits for card display. */
export async function searchProjectResourceCards(
	project: string,
	query: string,
	limit = 24
): Promise<ResourceCard[]> {
	const normalizedQuery = query.trim();
	if (!normalizedQuery) return [];
	const url = new URL(`${getApiBaseUrl()}/data/text/${encodeURIComponent(project)}`);
	url.searchParams.set('q', normalizedQuery);
	url.searchParams.set('limit', String(limit));
	const result = await readJson<unknown>(url.toString());
	return loadResourceCards(project, searchHits(result));
}

/** Read one ontology-driven project instance by QName or absolute IRI. */
export function readResource(project: string, iri: string): Promise<OldapResourceRecord> {
	return readJson<OldapResourceRecord>(
		`${getApiBaseUrl()}/data/${encodeURIComponent(project)}/${encodeURIComponent(iri)}`
	);
}

/** Read a project datamodel used for class and property labels. */
export function readDataModel(project: string): Promise<OldapDataModel> {
	return readJson<OldapDataModel>(
		`${getApiBaseUrl()}/admin/datamodel/${encodeURIComponent(project)}`
	);
}

/** Convert OLDAP's authorized media response into a viewer-neutral delivery contract. */
export function mediaDeliveryOf(record: OldapResourceRecord): MediaDelivery | null {
	const accessMode = firstString(record, 'shared:mediaAccessMode');
	const protocol = firstString(record, 'shared:protocol');
	if (accessMode === 'external') {
		const url = firstString(record, 'shared:mediaUrl');
		return url
			? {
					kind: 'external-image',
					url,
					thumbnailUrl: firstString(record, 'shared:thumbnailUrl')
				}
			: null;
	}
	if (accessMode !== 'local' || protocol !== 'iiif') return null;
	const serverUrl = firstString(record, 'shared:serverUrl');
	const assetId = firstString(record, 'shared:assetId');
	if (!serverUrl || !assetId) return null;
	return {
		kind: 'iiif-image',
		infoUrl: `${serverUrl.replace(/\/+$/, '')}/${encodeURIComponent(assetId)}/info.json`,
		capability: firstString(record, 'token')
	};
}

/** Read the permission-filtered media record and its short-lived delivery capability. */
export async function readMediaDelivery(iri: string): Promise<MediaDelivery | null> {
	const record = await readJson<OldapResourceRecord>(
		`${getApiBaseUrl()}/data/mediaobject/iri/${encodeURIComponent(iri)}`
	);
	return mediaDeliveryOf(record);
}

function hasDeliveryReference(record: OldapResourceRecord): boolean {
	return (
		valuesOf(record['shared:assetId']).some((value) => typeof value === 'string') ||
		valuesOf(record['shared:mediaUrl']).some((value) => typeof value === 'string')
	);
}

/**
 * Select display media without guessing among several representations.
 *
 * A media resource displays itself. A non-media archive resource may use its
 * sole readable `shared:hasMediaObject` target. Projects with several media
 * representations need an explicit primary-media rule in a later increment.
 */
export function displayMediaIriOf(
	iri: string,
	record: OldapResourceRecord,
	linkedRecords: Map<string, OldapResourceRecord>
): string | null {
	if (hasDeliveryReference(record)) return iri;
	const candidates = valuesOf(record['shared:hasMediaObject']).filter(
		(value): value is string => typeof value === 'string' && linkedRecords.has(value)
	);
	return candidates.length === 1 ? candidates[0] : null;
}

/**
 * Load an instance, project and Shared models, then resolve its direct
 * ontology-declared object-property targets for a read-only detail view.
 */
export async function loadResource(project: string, iri: string): Promise<LoadedResource> {
	const [record, projectModel, sharedModel] = await Promise.all([
		readResource(project, iri),
		readDataModel(project),
		readDataModel('shared')
	]);
	const models = [projectModel, sharedModel];
	const definition = assertedClass(record, models);
	const linkedProperties = definition
		? linkedPropertyIris(definition.iri, models)
		: new Set<string>();
	const linkedIris = [
		...new Set(
			[...linkedProperties].flatMap((propertyIri) =>
				valuesOf(record[propertyIri]).filter(
					(value): value is string => typeof value === 'string' && value !== iri
				)
			)
		)
	];
	const summaries = await readResourceSummaries(
		project,
		[iri, ...linkedIris],
		['schema:name', ...MEDIA_SUMMARY_PROPERTIES],
		true
	);
	const summariesByIri = new Map(summaries.map((summary) => [summary.iri, summary]));
	const linkedRecords = new Map<string, OldapResourceRecord>();
	for (const linkedIri of linkedIris) {
		const summary = summariesByIri.get(linkedIri);
		if (!summary) continue;
		linkedRecords.set(linkedIri, summary.data);
	}
	const displayMediaIri = displayMediaIriOf(iri, record, linkedRecords);
	const media = displayMediaIri
		? (summariesByIri.get(displayMediaIri)?.mediaDelivery ?? null)
		: null;
	return { record, models, linkedRecords, displayMediaIri, media };
}
