import {
	fallbackLabel,
	localizedText,
	parseLocalizedText,
	resolvedProperties,
	valuesOf
} from '$lib/resources/model';
import type {
	JsonValue,
	OldapDataModel,
	OldapPropertyDefinition,
	OldapResourceRecord
} from '$lib/resources/types';

const EDITABLE_TEXT_PROPERTIES = new Set(['schema:name', 'schema:description']);
const EDITABLE_TEXT_DATATYPES = new Set(['rdf:langString', 'xsd:string']);
const RELATION_TARGET_EXCLUSIONS = new Set(['oldap:Dating', 'oldap:Thing', 'shared:ArchiveLevel']);

export interface ResourceEditorField {
	iri: string;
	label: string;
	description: string | null;
	datatype: 'rdf:langString' | 'xsd:string';
	required: boolean;
	order: number;
}

export interface ResourceEditorRelation {
	iri: string;
	label: string;
	description: string | null;
	toClass: string;
	allowsMultiple: boolean;
	order: number;
}

export interface ResourceEditorDefinition {
	classIri: string;
	classLabel: string;
	fields: ResourceEditorField[];
	relations: ResourceEditorRelation[];
}

export interface ResourceLanguageDraft {
	language: string;
	values: Record<string, string>;
}

export interface ResourceEditorDraft {
	languages: ResourceLanguageDraft[];
	plainValues: Record<string, string>;
	relations: Record<string, string[]>;
}

function isEditableTextField(
	property: OldapPropertyDefinition
): property is OldapPropertyDefinition & { datatype: 'rdf:langString' | 'xsd:string' } {
	return Boolean(
		EDITABLE_TEXT_PROPERTIES.has(property.iri) &&
		EDITABLE_TEXT_DATATYPES.has(property.datatype ?? '') &&
		(property.maxCount ?? 1) <= 1
	);
}

function isEditableRelation(
	property: OldapPropertyDefinition
): property is OldapPropertyDefinition & { toClass: string } {
	return Boolean(
		property.toClass &&
		(property.minCount ?? 0) === 0 &&
		!property.inverseOf &&
		!RELATION_TARGET_EXCLUSIONS.has(property.toClass)
	);
}

/** Derive the deliberately small, safe editing surface for one asserted class. */
export function resourceEditorDefinition(
	classIri: string,
	models: OldapDataModel[],
	locale: string
): ResourceEditorDefinition {
	const resourceClass = models
		.flatMap(({ resources }) => resources)
		.find(({ iri }) => iri === classIri);
	const properties = [...resolvedProperties(classIri, models).values()];
	const fields = properties
		.filter(isEditableTextField)
		.map((property) => ({
			iri: property.iri,
			label: localizedText(property.name, locale) ?? fallbackLabel(property.iri),
			description: localizedText(property.description, locale),
			datatype: property.datatype,
			required: (property.minCount ?? 0) > 0,
			order: property.order ?? Number.MAX_SAFE_INTEGER
		}))
		.sort((left, right) => left.order - right.order || left.label.localeCompare(right.label));
	const relations = properties
		.filter(isEditableRelation)
		.map((property) => ({
			iri: property.iri,
			label: localizedText(property.name, locale) ?? fallbackLabel(property.iri),
			description: localizedText(property.description, locale),
			toClass: property.toClass,
			allowsMultiple: property.maxCount !== 1,
			order: property.order ?? Number.MAX_SAFE_INTEGER
		}))
		.sort((left, right) => left.order - right.order || left.label.localeCompare(right.label));
	return {
		classIri,
		classLabel: localizedText(resourceClass?.label, locale) ?? fallbackLabel(classIri),
		fields,
		relations
	};
}

/** Convert persisted values to an editor draft without losing other language variants. */
export function resourceEditorDraft(
	record: OldapResourceRecord,
	definition: ResourceEditorDefinition,
	fallbackLanguage: string
): ResourceEditorDraft {
	const localizedFields = definition.fields.filter(({ datatype }) => datatype === 'rdf:langString');
	const languages = new Set<string>();
	const localizedByProperty = new Map<string, Map<string, string>>();
	for (const field of localizedFields) {
		const values = new Map<string, string>();
		for (const raw of valuesOf(record[field.iri])) {
			if (typeof raw !== 'string') continue;
			const parsed = parseLocalizedText(raw);
			if (!parsed.language) continue;
			languages.add(parsed.language);
			values.set(parsed.language, parsed.text);
		}
		localizedByProperty.set(field.iri, values);
	}
	const normalizedFallback = fallbackLanguage.trim().toLowerCase();
	if (!languages.size && normalizedFallback) languages.add(normalizedFallback);
	return {
		languages: [...languages].map((language) => ({
			language,
			values: Object.fromEntries(
				localizedFields.map(({ iri }) => [iri, localizedByProperty.get(iri)?.get(language) ?? ''])
			)
		})),
		plainValues: Object.fromEntries(
			definition.fields
				.filter(({ datatype }) => datatype === 'xsd:string')
				.map(({ iri }) => [
					iri,
					valuesOf(record[iri]).find((value): value is string => typeof value === 'string') ?? ''
				])
		),
		relations: Object.fromEntries(
			definition.relations.map(({ iri }) => [
				iri,
				valuesOf(record[iri]).filter((value): value is string => typeof value === 'string')
			])
		)
	};
}

/** Serialize only the controlled editor fields for OLDAP's partial replacement endpoint. */
export function resourceUpdatePayload(
	definition: ResourceEditorDefinition,
	draft: ResourceEditorDraft
): OldapResourceRecord {
	const payload: OldapResourceRecord = {};
	for (const field of definition.fields) {
		if (field.datatype === 'rdf:langString') {
			const values = draft.languages.flatMap(({ language, values }) => {
				const value = values[field.iri]?.trim();
				return value ? [`${value}@${language}`] : [];
			});
			payload[field.iri] = values.length ? values : null;
		} else {
			const value = draft.plainValues[field.iri]?.trim();
			payload[field.iri] = value || null;
		}
	}
	for (const relation of definition.relations) {
		const values = [...new Set(draft.relations[relation.iri] ?? [])].filter(Boolean);
		payload[relation.iri] = values.length ? values : null;
	}
	return payload;
}

function stringSet(value: JsonValue | undefined): string[] {
	return valuesOf(value)
		.filter((item): item is string => typeof item === 'string')
		.sort();
}

/** Verify exact equality for every controlled property while ignoring unrelated metadata. */
export function resourceUpdateMatches(
	record: OldapResourceRecord,
	payload: OldapResourceRecord
): boolean {
	return Object.entries(payload).every(([iri, expected]) => {
		const actualValues = stringSet(record[iri]);
		const expectedValues = stringSet(expected);
		return (
			actualValues.length === expectedValues.length &&
			actualValues.every((value, index) => value === expectedValues[index])
		);
	});
}
