import type {
	JsonScalar,
	JsonValue,
	LoadedResource,
	OldapDataModel,
	OldapPropertyDefinition,
	OldapResourceClassDefinition,
	OldapResourceRecord,
	ResourceDisplayField,
	ResourcePresentation
} from './types';

const HIDDEN_PROPERTIES = new Set([
	'rdf:type',
	'virtual:inferredTypes',
	'oldap:createdBy',
	'oldap:creationDate',
	'oldap:lastModifiedBy',
	'oldap:lastModificationDate',
	'oldap:attachedToRole'
]);

// OLDAP stores these ontology classes as qualified value structures and the
// instance API serializes them as scalar display values rather than target IRIs.
const EMBEDDED_VALUE_CLASSES = new Set(['oldap:Dating']);

interface LocalizedText {
	text: string;
	language: string;
}

/** Normalize OLDAP's scalar-or-array JSON convention to a predictable list. */
export function valuesOf(value: JsonValue | undefined): JsonValue[] {
	if (value === undefined || value === null) return [];
	return Array.isArray(value) ? value : [value];
}

/** Parse OLDAP's compact `text@language` representation without splitting ordinary @ signs. */
export function parseLocalizedText(value: string): LocalizedText {
	const match = /^(.*)@([A-Za-z]{2,3}(?:-[A-Za-z0-9]+)*)$/s.exec(value);
	return match
		? { text: match[1], language: match[2].toLowerCase() }
		: { text: value, language: '' };
}

/** Pick the current locale, then its base language, English, or the first available value. */
export function localizedText(values: JsonValue | undefined, locale: string): string | null {
	const candidates = valuesOf(values)
		.filter((value): value is string => typeof value === 'string')
		.map(parseLocalizedText);
	if (!candidates.length) return null;
	const normalizedLocale = locale.toLowerCase();
	return (
		candidates.find(({ language }) => language === normalizedLocale)?.text ??
		candidates.find(({ language }) => language.split('-')[0] === normalizedLocale.split('-')[0])
			?.text ??
		candidates.find(({ language }) => language === 'en')?.text ??
		candidates[0].text
	);
}

/** Turn an unknown QName or IRI fragment into a readable last-resort label. */
export function fallbackLabel(iri: string): string {
	const fragment = iri.includes('#')
		? iri.slice(iri.lastIndexOf('#') + 1)
		: iri.includes('/')
			? iri.slice(iri.lastIndexOf('/') + 1)
			: iri.includes(':')
				? iri.slice(iri.indexOf(':') + 1)
				: iri;
	return fragment
		.replace(/[_-]+/g, ' ')
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/^./, (character) => character.toUpperCase());
}

function classIndex(models: OldapDataModel[]): Map<string, OldapResourceClassDefinition> {
	return new Map(
		models.flatMap(({ resources }) => resources.map((resource) => [resource.iri, resource]))
	);
}

/** Return the asserted project class that is represented in the loaded datamodels. */
export function assertedClass(
	record: OldapResourceRecord,
	models: OldapDataModel[]
): OldapResourceClassDefinition | null {
	const classes = classIndex(models);
	const asserted = valuesOf(record['rdf:type']).filter(
		(value): value is string => typeof value === 'string'
	);
	for (const iri of asserted) {
		const definition = classes.get(iri);
		if (definition) return definition;
	}
	return null;
}

/** Resolve inherited properties in superclass-first display order. */
export function resolvedProperties(
	classIri: string,
	models: OldapDataModel[]
): Map<string, OldapPropertyDefinition> {
	const classes = classIndex(models);
	const resolved = new Map<string, OldapPropertyDefinition>();
	const visited = new Set<string>();

	function visit(iri: string): void {
		if (visited.has(iri)) return;
		visited.add(iri);
		const definition = classes.get(iri);
		if (!definition) return;
		for (const superclass of definition.superclass ?? []) visit(superclass);
		for (const property of definition.properties ?? []) resolved.set(property.iri, property);
	}

	visit(classIri);
	return resolved;
}

/** Identify linked-resource properties so the client can resolve their display titles. */
export function linkedPropertyIris(classIri: string, models: OldapDataModel[]): Set<string> {
	return new Set(
		[...resolvedProperties(classIri, models).values()]
			.filter(({ toClass }) => Boolean(toClass) && !EMBEDDED_VALUE_CLASSES.has(toClass as string))
			.map(({ iri }) => iri)
	);
}

function resourceLinkClass(property: OldapPropertyDefinition | undefined): string | null {
	return property?.toClass && !EMBEDDED_VALUE_CLASSES.has(property.toClass)
		? property.toClass
		: null;
}

function hasSuperclass(
	classIri: string,
	targetIri: string,
	models: OldapDataModel[],
	visited = new Set<string>()
): boolean {
	if (classIri === targetIri) return true;
	if (visited.has(classIri)) return false;
	visited.add(classIri);
	const definition = classIndex(models).get(classIri);
	return (definition?.superclass ?? []).some((iri) =>
		hasSuperclass(iri, targetIri, models, visited)
	);
}

function scalarValues(value: JsonValue | undefined, datatype?: string): JsonScalar[] {
	const raw = valuesOf(value).filter(
		(item): item is JsonScalar =>
			item === null || ['string', 'number', 'boolean'].includes(typeof item)
	);
	if (datatype !== 'rdf:langString') return raw;
	return raw.filter((item): item is string => typeof item === 'string');
}

function classLabel(classIri: string, models: OldapDataModel[], locale: string): string {
	const definition = classIndex(models).get(classIri);
	return localizedText(definition?.label, locale) ?? fallbackLabel(classIri);
}

function resourceTitle(record: OldapResourceRecord, iri: string, locale: string): string {
	return localizedText(record['schema:name'], locale) ?? fallbackLabel(iri);
}

/** Build a UI-ready, ontology-labelled view without project-specific field knowledge. */
export function presentResource(
	loaded: LoadedResource,
	iri: string,
	locale: string
): ResourcePresentation {
	const { record, models, linkedRecords, media } = loaded;
	const definition = assertedClass(record, models);
	const classIri = definition?.iri ?? String(valuesOf(record['rdf:type'])[0] ?? 'oldap:Thing');
	const properties = resolvedProperties(classIri, models);
	const fields: ResourceDisplayField[] = [];

	for (const [propertyIri, rawValue] of Object.entries(record)) {
		if (
			HIDDEN_PROPERTIES.has(propertyIri) ||
			['schema:name', 'schema:description'].includes(propertyIri)
		) {
			continue;
		}
		const property = properties.get(propertyIri);
		const label = localizedText(property?.name, locale) ?? fallbackLabel(propertyIri);
		const linkClass = resourceLinkClass(property);
		const links = linkClass
			? valuesOf(rawValue)
					.filter((value): value is string => typeof value === 'string')
					.map((linkedIri) => {
						const linkedRecord = linkedRecords.get(linkedIri);
						const linkedDefinition = linkedRecord ? assertedClass(linkedRecord, models) : null;
						return {
							iri: linkedIri,
							title: linkedRecord
								? resourceTitle(linkedRecord, linkedIri, locale)
								: fallbackLabel(linkedIri),
							classLabel: linkedDefinition
								? classLabel(linkedDefinition.iri, models, locale)
								: classLabel(linkClass, models, locale)
						};
					})
			: [];
		const values =
			property?.datatype === 'rdf:langString'
				? [localizedText(rawValue, locale)].filter((value): value is string => value !== null)
				: linkClass
					? []
					: scalarValues(rawValue, property?.datatype);
		fields.push({
			iri: propertyIri,
			label,
			datatype: property?.datatype ?? null,
			values,
			links,
			order: property?.order ?? Number.MAX_SAFE_INTEGER
		});
	}

	fields.sort((left, right) => left.order - right.order || left.label.localeCompare(right.label));
	const permissions = record['oldap:attachedToRole'];
	const publiclyReadable =
		permissions !== null &&
		permissions !== undefined &&
		!Array.isArray(permissions) &&
		typeof permissions === 'object' &&
		permissions['oldap:Unknown'] === 'DATA_VIEW';
	const isMediaObject = hasSuperclass(classIri, 'shared:MediaObject', models);
	const mediaAvailable = media !== null;

	return {
		iri,
		classIri,
		classLabel: classLabel(classIri, models, locale),
		title: resourceTitle(record, iri, locale),
		description: localizedText(record['schema:description'], locale),
		fields,
		publiclyReadable,
		isMediaObject,
		mediaAvailable
	};
}
