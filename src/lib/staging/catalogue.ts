import { writableDraft } from './repository';
import { authenticatedFetch } from '$lib/api/client';
import { getApiBaseUrl } from '$lib/api/baseUrl';
import { OldapResourceError, readDataModel, readResource } from '$lib/resources/client';
import {
	fallbackLabel,
	hasSuperclass,
	localizedText,
	resolvedProperties,
	valuesOf
} from '$lib/resources/model';
import type {
	OldapDataModel,
	OldapPropertyDefinition,
	OldapResourceRecord,
	OldapResourceSearchHit
} from '$lib/resources/types';
import type { StagingMediaObjectNode } from './types';

const SOURCE_CLASS = 'shared:StagingMediaObject';
const PRESERVE_CLASS = 'shared:MediaObject';
const MINIMAL_FIELD_IRIS = new Set(['schema:name', 'schema:description']);
const SUPPORTED_DATATYPES = new Set(['rdf:langString', 'xsd:string']);
const SIMPLE_RELATION_EXCLUSIONS = new Set(['oldap:Dating', 'oldap:Thing']);
const STAGING_PROPERTIES = [
	'shared:inStagingArea',
	'shared:inStagingFolder',
	'shared:stagingStatus'
];

export interface CatalogueField {
	iri: string;
	label: string;
	description: string | null;
	datatype: 'rdf:langString' | 'xsd:string';
	required: boolean;
	order: number;
}

export interface CatalogueTarget {
	iri: string;
	label: string;
	description: string | null;
	fields: CatalogueField[];
	relations: CatalogueRelation[];
}

/** Optional ontology-defined relation supported by the first common-value picker. */
export interface CatalogueRelation {
	iri: string;
	label: string;
	description: string | null;
	toClass: string;
	allowsMultiple: boolean;
	order: number;
}

export interface CatalogueInput {
	archiveUnitIri?: string;
	targetClass: string;
	language: string;
	values: Record<string, string>;
	relations?: Record<string, string[]>;
}

export interface CatalogueResult {
	iri: string;
	resourceClass: string;
	record: OldapResourceRecord;
}

interface CatalogueDependencies {
	fetch: typeof authenticatedFetch;
	apiBaseUrl: () => string;
	readDataModel: typeof readDataModel;
	readResource: typeof readResource;
}

const defaultDependencies: CatalogueDependencies = {
	fetch: authenticatedFetch,
	apiBaseUrl: getApiBaseUrl,
	readDataModel,
	readResource
};

function normalizedLanguage(language: string): string {
	const value = language.trim().toLowerCase();
	if (!/^[a-z]{2,3}(?:-[a-z0-9]+)*$/.test(value)) {
		throw new OldapResourceError(`Invalid catalogue language ${language}.`, 400);
	}
	return value;
}

function isMinimalField(property: OldapPropertyDefinition): property is OldapPropertyDefinition & {
	datatype: 'rdf:langString' | 'xsd:string';
} {
	return (
		MINIMAL_FIELD_IRIS.has(property.iri) &&
		SUPPORTED_DATATYPES.has(property.datatype ?? '') &&
		(property.maxCount ?? 1) <= 1
	);
}

function isSimpleRelation(
	property: OldapPropertyDefinition
): property is OldapPropertyDefinition & {
	toClass: string;
} {
	return Boolean(
		property.toClass &&
		(property.minCount ?? 0) === 0 &&
		!property.inverseOf &&
		!SIMPLE_RELATION_EXCLUSIONS.has(property.toClass)
	);
}

/**
 * Derive project media classes that the deliberately small catalogue form can satisfy.
 *
 * A class is offered only when it extends the Shared media base and every new
 * required property can be entered by the current title/description form.
 */
export function catalogueTargetsFromModels(
	projectModel: OldapDataModel,
	sharedModel: OldapDataModel,
	locale: string
): CatalogueTarget[] {
	const models = [projectModel, sharedModel];
	const preserved = resolvedProperties(PRESERVE_CLASS, models);
	return projectModel.resources
		.filter(({ iri }) => hasSuperclass(iri, PRESERVE_CLASS, models))
		.flatMap((resourceClass) => {
			const targetSpecific = [...resolvedProperties(resourceClass.iri, models).values()].filter(
				(property) => !preserved.has(property.iri)
			);
			if (
				targetSpecific.some((property) => (property.minCount ?? 0) > 0 && !isMinimalField(property))
			) {
				return [];
			}
			const fields = targetSpecific
				.filter(isMinimalField)
				.map((property) => ({
					iri: property.iri,
					label: localizedText(property.name, locale) ?? fallbackLabel(property.iri),
					description: localizedText(property.description, locale),
					datatype: property.datatype,
					required: (property.minCount ?? 0) > 0,
					order: property.order ?? Number.MAX_SAFE_INTEGER
				}))
				.sort((left, right) => left.order - right.order || left.label.localeCompare(right.label));
			const relations = targetSpecific
				.filter(isSimpleRelation)
				.map((property) => ({
					iri: property.iri,
					label: localizedText(property.name, locale) ?? fallbackLabel(property.iri),
					description: localizedText(property.description, locale),
					toClass: property.toClass,
					allowsMultiple: property.maxCount !== 1,
					order: property.order ?? Number.MAX_SAFE_INTEGER
				}))
				.sort((left, right) => left.order - right.order || left.label.localeCompare(right.label));
			if (!fields.some(({ iri }) => iri === 'schema:name')) return [];
			return [
				{
					iri: resourceClass.iri,
					label: localizedText(resourceClass.label, locale) ?? fallbackLabel(resourceClass.iri),
					description: localizedText(resourceClass.comment, locale),
					fields,
					relations
				}
			];
		})
		.sort((left, right) => left.label.localeCompare(right.label, locale));
}

/** Load readable candidates for one ontology-declared relation target class. */
export async function loadCatalogueRelationOptions(
	project: string,
	classIri: string,
	dependencies: Pick<CatalogueDependencies, 'fetch' | 'apiBaseUrl'> = defaultDependencies
): Promise<OldapResourceSearchHit[]> {
	const response = await dependencies.fetch(
		`${dependencies.apiBaseUrl()}/data/search/${encodeURIComponent(project)}`,
		{
			method: 'POST',
			headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
			body: JSON.stringify({
				resClass: classIri,
				includeProperties: ['schema:name'],
				limit: 100
			})
		}
	);
	if (!response.ok) {
		throw new OldapResourceError(
			(await responseMessage(response)) ??
				`Catalogue relation search failed (HTTP ${response.status}).`,
			response.status
		);
	}
	const value = (await response.json()) as unknown;
	if (!Array.isArray(value)) {
		throw new OldapResourceError('OLDAP returned invalid catalogue relation options.', 500);
	}
	return value.filter(
		(item): item is OldapResourceSearchHit =>
			Boolean(item) &&
			typeof item === 'object' &&
			typeof (item as { iri?: unknown }).iri === 'string' &&
			typeof (item as { resclass?: unknown }).resclass === 'string'
	);
}

/** Load the live project and Shared models and derive safe minimal catalogue targets. */
export async function loadCatalogueTargets(
	project: string,
	locale: string,
	dependencies: CatalogueDependencies = defaultDependencies
): Promise<CatalogueTarget[]> {
	const [projectModel, sharedModel] = await Promise.all([
		dependencies.readDataModel(project),
		dependencies.readDataModel('shared')
	]);
	return catalogueTargetsFromModels(projectModel, sharedModel, locale);
}

async function responseMessage(response: Response): Promise<string | null> {
	try {
		const body = (await response.clone().json()) as { message?: unknown; error?: unknown };
		if (typeof body.message === 'string') return body.message;
		if (typeof body.error === 'string') return body.error;
	} catch {
		// Use the stable HTTP fallback below.
	}
	return null;
}

/**
 * Atomically turn one Staging media object into a project catalogue resource.
 *
 * The OLDAP transform retains the IRI, permissions, and Shared media metadata.
 * A read-back verifies the target class, supplied values, removal of Staging
 * placement, and preservation of the media asset identity.
 */
export async function catalogueStagingMediaObject(
	project: string,
	media: StagingMediaObjectNode,
	target: CatalogueTarget,
	input: CatalogueInput,
	dependencies: CatalogueDependencies = defaultDependencies
): Promise<CatalogueResult> {
	if (!writableDraft(media))
		throw new OldapResourceError('Archived references cannot be catalogued again.', 403);
	if (input.targetClass !== target.iri) {
		throw new OldapResourceError('The selected catalogue class is no longer available.', 400);
	}
	const language = normalizedLanguage(input.language);
	const properties: Record<string, string[]> = {};
	for (const field of target.fields) {
		const value = (input.values[field.iri] ?? '').trim();
		if (field.required && !value) {
			throw new OldapResourceError(`${field.label} is required.`, 400);
		}
		if (!value) continue;
		properties[field.iri] = [field.datatype === 'rdf:langString' ? `${value}@${language}` : value];
	}
	for (const relation of target.relations) {
		const selected = [...new Set(input.relations?.[relation.iri] ?? [])].filter(Boolean);
		if (!selected.length) continue;
		if (!relation.allowsMultiple && selected.length > 1) {
			throw new OldapResourceError(`${relation.label} accepts only one resource.`, 400);
		}
		properties[relation.iri] = selected;
	}

	const response = await dependencies.fetch(
		`${dependencies.apiBaseUrl()}/data/${encodeURIComponent(project)}/${encodeURIComponent(media.iri)}/transform`,
		{
			method: 'POST',
			headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
			body: JSON.stringify({
				expectedSourceClass: SOURCE_CLASS,
				preserveClass: PRESERVE_CLASS,
				targetClass: target.iri,
				...(input.archiveUnitIri
					? { linkFrom: { resourceIri: input.archiveUnitIri, property: 'shared:hasMediaObject' } }
					: {}),
				properties
			})
		}
	);
	if (!response.ok) {
		throw new OldapResourceError(
			(await responseMessage(response)) ?? `Catalogue transition failed (HTTP ${response.status}).`,
			response.status
		);
	}
	const result = (await response.json()) as { iri?: unknown; resourceClass?: unknown };
	if (
		typeof result.iri !== 'string' ||
		!result.iri ||
		typeof result.resourceClass !== 'string' ||
		!result.resourceClass
	) {
		throw new OldapResourceError('OLDAP returned an invalid catalogue transition response.', 500);
	}

	const record = await dependencies.readResource(project, media.iri);
	const types = valuesOf(record['rdf:type']);
	const valuesMatch = Object.entries(properties).every(([iri, expected]) => {
		const actual = valuesOf(record[iri]);
		return expected.length === actual.length && expected.every((value) => actual.includes(value));
	});
	const stagingRemoved = STAGING_PROPERTIES.every((iri) => valuesOf(record[iri]).length === 0);
	const assetPreserved =
		!media.assetId || valuesOf(record['shared:assetId']).includes(media.assetId);
	if (
		!types.includes(target.iri) ||
		types.includes(SOURCE_CLASS) ||
		!valuesMatch ||
		!stagingRemoved ||
		!assetPreserved ||
		(media.checksum && !valuesOf(record['shared:checksum']).includes(media.checksum))
	) {
		throw new OldapResourceError(
			`Resource ${media.iri} was transformed but failed read-back verification.`,
			500
		);
	}
	return { iri: media.iri, resourceClass: target.iri, record };
}
