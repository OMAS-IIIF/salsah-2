import { authenticatedFetch } from '$lib/api/client';
import { getApiBaseUrl } from '$lib/api/baseUrl';
import {
	loadRecentResourceCards,
	loadResource,
	readDataModel,
	readResource,
	searchProjectResourceCards,
	OldapResourceError
} from '$lib/resources/client';
import { assertedClass, hasSuperclass } from '$lib/resources/model';
import type {
	OldapDataModel,
	MediaDelivery,
	OldapResourceRecord,
	OldapResourceSearchHit,
	ResourceCard
} from '$lib/resources/types';
import {
	resourceEditorDefinition,
	resourceUpdateMatches,
	resourceUpdatePayload,
	type ResourceEditorDefinition,
	type ResourceEditorDraft
} from './model';

export interface ResourceEditorContext {
	record: OldapResourceRecord;
	models: OldapDataModel[];
	definition: ResourceEditorDefinition;
	relationOptions: Record<string, OldapResourceSearchHit[]>;
	media: MediaDelivery | null;
}

const STAGING_CLASSES = ['shared:StagingArea', 'shared:StagingFolder', 'shared:StagingMediaObject'];

function isStagingClass(classIri: string, models: OldapDataModel[]): boolean {
	return STAGING_CLASSES.some((stagingClass) => hasSuperclass(classIri, stagingClass, models));
}

async function responseMessage(response: Response): Promise<string | null> {
	try {
		const body = (await response.clone().json()) as { message?: unknown };
		return typeof body.message === 'string' ? body.message : null;
	} catch {
		return null;
	}
}

async function searchClass(project: string, classIri: string): Promise<OldapResourceSearchHit[]> {
	const response = await authenticatedFetch(
		`${getApiBaseUrl()}/data/search/${encodeURIComponent(project)}`,
		{
			method: 'POST',
			headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
			body: JSON.stringify({ resClass: classIri, includeProperties: ['schema:name'], limit: 100 })
		}
	);
	if (!response.ok) {
		throw new OldapResourceError(
			(await responseMessage(response)) ?? `Relation search failed (HTTP ${response.status}).`,
			response.status
		);
	}
	const value = (await response.json()) as unknown;
	if (!Array.isArray(value)) throw new OldapResourceError('Invalid relation-search response.', 500);
	return value.filter(
		(item): item is OldapResourceSearchHit =>
			Boolean(item) &&
			typeof item === 'object' &&
			typeof (item as { iri?: unknown }).iri === 'string' &&
			typeof (item as { resclass?: unknown }).resclass === 'string'
	);
}

async function editableCards(project: string, cards: ResourceCard[]): Promise<ResourceCard[]> {
	const [projectModel, sharedModel] = await Promise.all([
		readDataModel(project),
		readDataModel('shared')
	]);
	const models = [projectModel, sharedModel];
	return cards.filter(
		({ resource }) =>
			!isStagingClass(resource.resclass, models) &&
			resourceEditorDefinition(resource.resclass, models, 'en').fields.length > 0
	);
}

/** List a bounded recent set of readable resources that expose safe editable fields. */
export async function loadEditableResourceCards(project: string): Promise<ResourceCard[]> {
	return editableCards(project, await loadRecentResourceCards(project, 100));
}

/** Search readable resources and retain only records supported by the first editor slice. */
export async function searchEditableResourceCards(
	project: string,
	query: string
): Promise<ResourceCard[]> {
	return editableCards(project, await searchProjectResourceCards(project, query, 100));
}

/** Load one record, its models, and permission-filtered relation choices. */
export async function loadResourceEditorContext(
	project: string,
	iri: string,
	locale: string
): Promise<ResourceEditorContext> {
	const loaded = await loadResource(project, iri);
	const { record, models, media } = loaded;
	// Fail closed before exposing an editor for a protected archive resource.
	if (Number(record.permval ?? 0) < 4)
		throw new OldapResourceError(
			'This resource is read-only. Open its resource detail to view it.',
			403
		);
	const resourceClass = assertedClass(record, models);
	if (!resourceClass) {
		throw new OldapResourceError(`Resource ${iri} has no supported asserted class.`, 400);
	}
	if (isStagingClass(resourceClass.iri, models)) {
		throw new OldapResourceError(`Staging resource ${iri} must use the Staging workflow.`, 400);
	}
	const definition = resourceEditorDefinition(resourceClass.iri, models, locale);
	if (!definition.fields.length) {
		throw new OldapResourceError(
			`Resource ${iri} exposes no fields supported by this editor.`,
			400
		);
	}
	const optionEntries = await Promise.all(
		definition.relations.map(
			async (relation) => [relation.iri, await searchClass(project, relation.toClass)] as const
		)
	);
	return {
		record,
		models,
		definition,
		relationOptions: Object.fromEntries(optionEntries),
		media
	};
}

/** Atomically replace the controlled fields and require exact read-back. */
export async function updateResource(
	project: string,
	iri: string,
	definition: ResourceEditorDefinition,
	draft: ResourceEditorDraft
): Promise<OldapResourceRecord> {
	const payload = resourceUpdatePayload(definition, draft);
	const response = await authenticatedFetch(
		`${getApiBaseUrl()}/data/${encodeURIComponent(project)}/${encodeURIComponent(iri)}`,
		{
			method: 'POST',
			headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		}
	);
	if (!response.ok) {
		throw new OldapResourceError(
			(await responseMessage(response)) ?? `Resource update failed (HTTP ${response.status}).`,
			response.status
		);
	}
	const verified = await readResource(project, iri);
	if (!resourceUpdateMatches(verified, payload)) {
		throw new OldapResourceError(`Resource ${iri} failed read-back verification.`, 500);
	}
	return verified;
}
