import { authenticatedFetch } from '$lib/api/client';
import { getApiBaseUrl } from '$lib/api/baseUrl';
import { assertedClass, linkedPropertyIris, valuesOf } from './model';
import type {
	LoadedResource,
	MediaDelivery,
	OldapDataModel,
	OldapResourceRecord,
	OldapResourceSearchHit
} from './types';

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
	limit = 5
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
	if (!Array.isArray(result)) {
		throw new OldapResourceError('OLDAP returned an invalid resource-search response.', 500);
	}
	return result.filter((item): item is OldapResourceSearchHit =>
		Boolean(
			item &&
			typeof item === 'object' &&
			typeof (item as { iri?: unknown }).iri === 'string' &&
			typeof (item as { resclass?: unknown }).resclass === 'string'
		)
	);
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

function scalarString(record: OldapResourceRecord, property: string): string | null {
	const value = valuesOf(record[property])[0];
	return typeof value === 'string' && value.length > 0 ? value : null;
}

/** Convert OLDAP's authorized media response into a viewer-neutral delivery contract. */
export function mediaDeliveryOf(record: OldapResourceRecord): MediaDelivery | null {
	const accessMode = scalarString(record, 'shared:mediaAccessMode');
	const protocol = scalarString(record, 'shared:protocol');
	if (accessMode === 'external') {
		const url = scalarString(record, 'shared:mediaUrl');
		return url
			? {
					kind: 'external-image',
					url,
					thumbnailUrl: scalarString(record, 'shared:thumbnailUrl')
				}
			: null;
	}
	if (accessMode !== 'local' || protocol !== 'iiif') return null;
	const serverUrl = scalarString(record, 'shared:serverUrl');
	const assetId = scalarString(record, 'shared:assetId');
	if (!serverUrl || !assetId) return null;
	return {
		kind: 'iiif-image',
		infoUrl: `${serverUrl.replace(/\/+$/, '')}/${encodeURIComponent(assetId)}/info.json`,
		capability: scalarString(record, 'token')
	};
}

/** Read the permission-filtered media record and its short-lived delivery capability. */
export async function readMediaDelivery(iri: string): Promise<MediaDelivery | null> {
	const record = await readJson<OldapResourceRecord>(
		`${getApiBaseUrl()}/data/mediaobject/iri/${encodeURIComponent(iri)}`
	);
	return mediaDeliveryOf(record);
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
	const linkedRecords = new Map<string, OldapResourceRecord>();
	const hasDeliveryReference =
		valuesOf(record['shared:assetId']).length > 0 || valuesOf(record['shared:mediaUrl']).length > 0;
	const mediaPromise = hasDeliveryReference ? readMediaDelivery(iri) : Promise.resolve(null);
	await Promise.all(
		linkedIris.map(async (linkedIri) => {
			try {
				linkedRecords.set(linkedIri, await readResource(project, linkedIri));
			} catch (error) {
				if (!(error instanceof OldapResourceError) || ![403, 404].includes(error.status))
					throw error;
			}
		})
	);
	return { record, models, linkedRecords, media: await mediaPromise };
}
