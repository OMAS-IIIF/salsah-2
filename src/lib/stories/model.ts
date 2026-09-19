import { parseLocalizedText, resolvedProperties, valuesOf } from '$lib/resources/model';
import type {
	JsonValue,
	OldapDataModel,
	OldapResourceClassDefinition,
	OldapResourceRecord
} from '$lib/resources/types';
import { parseStoryMarkdown, storyAssetIris } from './markdown';

export interface StoryLanguageDraft {
	language: string;
	markdown: string;
}

/** Language-specific editable Story metadata and narrative content. */
export interface StoryEditorLanguageDraft extends StoryLanguageDraft {
	title: string;
	summary: string;
}

/**
 * Detect project Story classes by their semantic editing contract.
 *
 * A class qualifies when its resolved properties contain multilingual
 * narrative text and an author relationship. This avoids embedding a Chama
 * class IRI while excluding the retained StorySection experiment.
 */
export function storyClasses(model: OldapDataModel): OldapResourceClassDefinition[] {
	return model.resources.filter((resourceClass) => {
		const properties = resolvedProperties(resourceClass.iri, [model]);
		return properties.has('schema:text') && properties.has('schema:author');
	});
}

/** Resolve the class accepted by a Story's required author relationship. */
export function storyAuthorClass(model: OldapDataModel, storyClassIri: string): string | null {
	return resolvedProperties(storyClassIri, [model]).get('schema:author')?.toClass ?? null;
}

/** Convert OLDAP language-tagged narrative values to stable editor drafts. */
export function storyLanguageDrafts(value: JsonValue | undefined): StoryLanguageDraft[] {
	return valuesOf(value)
		.filter((item): item is string => typeof item === 'string')
		.map(parseLocalizedText)
		.filter(({ language }) => Boolean(language))
		.map(({ text, language }) => ({ language, markdown: text }));
}

/** Serialize language drafts using OLDAP's `text@language` JSON convention. */
export function serializeStoryLanguageDrafts(drafts: StoryLanguageDraft[]): string[] {
	return drafts.map(({ language, markdown }) => `${markdown}@${language}`);
}

function localizedField(value: JsonValue | undefined): Map<string, string> {
	return new Map(
		valuesOf(value)
			.filter((item): item is string => typeof item === 'string')
			.map(parseLocalizedText)
			.filter(({ language }) => Boolean(language))
			.map(({ language, text }) => [language, text])
	);
}

/** Build one coherent editor draft per language present anywhere on the Story. */
export function storyEditorDrafts(
	record: OldapResourceRecord,
	fallbackLanguage = ''
): StoryEditorLanguageDraft[] {
	const titles = localizedField(record['schema:name']);
	const summaries = localizedField(record['schema:abstract']);
	const narratives = new Map(
		storyLanguageDrafts(record['schema:text']).map(({ language, markdown }) => [language, markdown])
	);
	const languages = new Set([...narratives.keys(), ...titles.keys(), ...summaries.keys()]);
	const fallback = fallbackLanguage.trim().toLowerCase();
	if (!languages.size && fallback) languages.add(fallback);
	return [...languages].map((language) => ({
		language,
		title: titles.get(language) ?? '',
		summary: summaries.get(language) ?? '',
		markdown: narratives.get(language) ?? ''
	}));
}

/** Return the ordered union of every valid asset IRI used by all translations. */
export function mentionedStoryIris(drafts: StoryLanguageDraft[]): string[] {
	return [
		...new Set(drafts.flatMap(({ markdown }) => storyAssetIris(parseStoryMarkdown(markdown))))
	];
}

/** Refuse persistence when any language contains a malformed asset directive. */
export function hasInvalidStoryAsset(drafts: StoryLanguageDraft[]): boolean {
	return drafts.some(({ markdown }) =>
		parseStoryMarkdown(markdown).some(({ kind }) => kind === 'invalid-asset')
	);
}

function serializeLocalizedDraftField(
	drafts: StoryEditorLanguageDraft[],
	field: 'title' | 'summary'
): string[] {
	return drafts.flatMap((draft) => {
		const value = draft[field].trim();
		return value ? [`${value}@${draft.language}`] : [];
	});
}

function stringValues(value: JsonValue | undefined): string[] {
	return valuesOf(value).filter((item): item is string => typeof item === 'string');
}

function sameStringSet(actual: JsonValue | undefined, expected: JsonValue): boolean {
	const actualValues = stringValues(actual).sort();
	const expectedValues = stringValues(expected).sort();
	return (
		actualValues.length === expectedValues.length &&
		actualValues.every((value, index) => value === expectedValues[index])
	);
}

/** Build a focused replacement payload for editable Story fields. */
export function storyUpdatePayload(
	drafts: StoryEditorLanguageDraft[],
	authorIri: string
): OldapResourceRecord {
	const mentions = mentionedStoryIris(drafts);
	const titles = serializeLocalizedDraftField(drafts, 'title');
	const summaries = serializeLocalizedDraftField(drafts, 'summary');
	const narratives = drafts.flatMap(({ language, markdown }) =>
		markdown.trim() ? [`${markdown}@${language}`] : []
	);
	return {
		'schema:name': titles,
		'schema:abstract': summaries.length ? summaries : null,
		'schema:author': authorIri,
		'schema:text': narratives.length ? narratives : null,
		'schema:mentions': mentions.length ? mentions : null
	};
}

/** Verify that OLDAP persisted every field controlled by the Story editor. */
export function storyUpdateMatches(
	record: OldapResourceRecord,
	payload: OldapResourceRecord
): boolean {
	return [
		'schema:name',
		'schema:abstract',
		'schema:author',
		'schema:text',
		'schema:mentions'
	].every((property) => sameStringSet(record[property], payload[property]));
}
