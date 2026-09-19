import { authenticatedFetch } from '$lib/api/client';
import { getApiBaseUrl } from '$lib/api/baseUrl';
import { OldapResourceError, readResourceSummaries } from '$lib/resources/client';
import { valuesOf } from '$lib/resources/model';
import type { OldapResourceRecord, OldapResourceSearchHit } from '$lib/resources/types';
import type { StagingAreaSummary, StagingFolderNode, StagingMediaObjectNode } from './types';

const STAGING_RESULT_LIMIT = 100;
const AREA_PROPERTIES = [
	'schema:name',
	'shared:mediaPath',
	'shared:stagingDefaultRole',
	'shared:stagingQuotaBytes'
];
const FOLDER_PROPERTIES = ['schema:name', 'shared:inStagingArea', 'shared:inStagingFolder'];
const MEDIA_PROPERTIES = [
	'shared:inStagingArea',
	'shared:inStagingFolder',
	'shared:originalName',
	'shared:originalMimeType',
	'shared:stagingStatus',
	'shared:assetId',
	'shared:checksum',
	'shared:protocol',
	'shared:derivativeName'
];

interface SearchFilter {
	property: string;
	op: '==' | 'NOT_EXISTS';
	value?: string;
	type?: 'iri';
}

type SearchFilterExpression = SearchFilter | 'AND';

function firstString(record: OldapResourceRecord, property: string): string | null {
	const value = valuesOf(record[property])[0];
	return typeof value === 'string' && value ? value : null;
}

function firstNumber(record: OldapResourceRecord, property: string): number | null {
	const value = valuesOf(record[property])[0];
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
	return null;
}

function searchHits(result: unknown): OldapResourceSearchHit[] {
	if (!Array.isArray(result)) {
		throw new OldapResourceError('OLDAP returned an invalid staging-search response.', 500);
	}
	return result.filter(
		(item): item is OldapResourceSearchHit =>
			Boolean(item) &&
			typeof item === 'object' &&
			typeof (item as { iri?: unknown }).iri === 'string' &&
			typeof (item as { resclass?: unknown }).resclass === 'string'
	);
}

async function searchStagingClass(
	project: string,
	resClass: 'shared:StagingArea' | 'shared:StagingFolder' | 'shared:StagingMediaObject',
	includeProperties: string[],
	filter: SearchFilterExpression[] = []
): Promise<OldapResourceSearchHit[]> {
	const rows: OldapResourceSearchHit[] = [];
	const seen = new Set<string>();
	for (let offset = 0; ; offset += STAGING_RESULT_LIMIT) {
		const response = await authenticatedFetch(
			`${getApiBaseUrl()}/data/search/${encodeURIComponent(project)}`,
			{
				method: 'POST',
				headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
				body: JSON.stringify({
					resClass,
					includeProperties,
					filter,
					limit: STAGING_RESULT_LIMIT,
					offset
				})
			}
		);
		if (!response.ok) {
			throw new OldapResourceError(
				`Staging search failed for ${resClass} (HTTP ${response.status}).`,
				response.status
			);
		}
		const page = searchHits((await response.json()) as unknown);
		if (page.some((row) => seen.has(row.iri)))
			throw new OldapResourceError(
				'Staging hierarchy changed during pagination. Reload the view.',
				409
			);
		page.forEach((row) => seen.add(row.iri));
		rows.push(...page);
		if (page.length < STAGING_RESULT_LIMIT) return rows;
	}
}

/** Load readable media objects placed directly inside one selected folder. */
export async function searchStagingMediaObjects(
	project: string,
	areaIri: string,
	folderIri: string
): Promise<StagingMediaObjectNode[]> {
	const records = await searchStagingClass(project, 'shared:StagingMediaObject', MEDIA_PROPERTIES, [
		{
			property: 'shared:inStagingArea',
			op: '==',
			value: areaIri,
			type: 'iri'
		},
		'AND',
		{
			property: 'shared:inStagingFolder',
			op: '==',
			value: folderIri,
			type: 'iri'
		}
	]);
	const mediaObjects = records
		.map((record) => ({
			iri: record.iri,
			resclass: record.resclass,
			areaIri: firstString(record, 'shared:inStagingArea') ?? '',
			folderIri: firstString(record, 'shared:inStagingFolder') ?? '',
			originalName: firstString(record, 'shared:originalName'),
			mimeType: firstString(record, 'shared:originalMimeType'),
			statusIri: firstString(record, 'shared:stagingStatus'),
			assetId: firstString(record, 'shared:assetId'),
			checksum: firstString(record, 'shared:checksum'),
			protocol: firstString(record, 'shared:protocol'),
			derivativeName: firstString(record, 'shared:derivativeName'),
			mediaDelivery: null
		}))
		.filter((media) => media.areaIri === areaIri && media.folderIri === folderIri)
		.sort((left, right) =>
			(left.originalName ?? left.iri).localeCompare(right.originalName ?? right.iri)
		);
	const imageIris = mediaObjects
		.filter((media) => media.mimeType?.startsWith('image/'))
		.map((media) => media.iri);
	const summaries = await readResourceSummaries(project, imageIris, ['shared:originalName'], true);
	const deliveries = new Map(
		summaries.map((summary) => [summary.iri, summary.mediaDelivery ?? null])
	);
	return mediaObjects.map((media) => ({
		...media,
		mediaDelivery: deliveries.get(media.iri) ?? null
	}));
}

/** List readable StagingAreas in bounded pages; do not silently truncate destination choices. */
export async function searchStagingAreas(project: string): Promise<StagingAreaSummary[]> {
	const records = await searchStagingClass(project, 'shared:StagingArea', AREA_PROPERTIES);
	return records.map((record) => ({
		iri: record.iri,
		resclass: record.resclass,
		title: record['schema:name'],
		mediaPath: firstString(record, 'shared:mediaPath'),
		defaultRoleIri: firstString(record, 'shared:stagingDefaultRole'),
		quotaBytes: firstNumber(record, 'shared:stagingQuotaBytes')
	}));
}

/** Load one visible level of folders while enforcing the selected StagingArea boundary. */
export async function searchStagingFolders(
	project: string,
	areaIri: string,
	parentIri: string | null
): Promise<StagingFolderNode[]> {
	const filter: SearchFilterExpression[] = [
		{
			property: 'shared:inStagingArea',
			op: '==',
			value: areaIri,
			type: 'iri'
		},
		'AND',
		...(parentIri
			? [
					{
						property: 'shared:inStagingFolder',
						op: '==' as const,
						value: parentIri,
						type: 'iri' as const
					}
				]
			: [{ property: 'shared:inStagingFolder', op: 'NOT_EXISTS' as const }])
	];
	const records = await searchStagingClass(
		project,
		'shared:StagingFolder',
		FOLDER_PROPERTIES,
		filter
	);
	return records
		.map((record) => ({
			iri: record.iri,
			resclass: record.resclass,
			title: record['schema:name'],
			areaIri: firstString(record, 'shared:inStagingArea') ?? '',
			parentIri: firstString(record, 'shared:inStagingFolder')
		}))
		.filter((folder) => folder.areaIri === areaIri && folder.parentIri === parentIri)
		.sort((left, right) => left.iri.localeCompare(right.iri));
}
