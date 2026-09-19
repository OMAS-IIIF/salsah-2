import { authenticatedFetch } from '$lib/api/client';
import { getApiBaseUrl } from '$lib/api/baseUrl';
import { OldapResourceError, readDataModel, readResource } from '$lib/resources/client';
import type {
	OldapDataModel,
	OldapResourceRecord,
	OldapResourceSearchHit
} from '$lib/resources/types';
import {
	storyAuthorClass,
	storyClasses,
	storyUpdateMatches,
	storyUpdatePayload,
	type StoryEditorLanguageDraft
} from './model';

export interface StoryAdministrationData {
	model: OldapDataModel;
	classIris: string[];
	stories: OldapResourceSearchHit[];
}

export interface StoryCreationClass {
	iri: string;
	label: string[];
	authorClassIri: string;
}

export interface StoryCreationOptions {
	classes: StoryCreationClass[];
}

export interface CreateStoryInput {
	classIri: string;
	title: string;
	language: string;
	authorIri: string;
	roleIri: string;
}

export interface CreatedStory {
	iri: string;
	record: OldapResourceRecord;
}

export interface StoryEditorContext {
	record: OldapResourceRecord;
	classIri: string;
	authorClassIri: string;
	authors: OldapResourceSearchHit[];
}

async function responseMessage(response: Response): Promise<string | null> {
	try {
		const body = (await response.clone().json()) as { message?: unknown };
		return typeof body.message === 'string' ? body.message : null;
	} catch {
		return null;
	}
}

async function searchStoryClass(
	project: string,
	classIri: string
): Promise<OldapResourceSearchHit[]> {
	const response = await authenticatedFetch(
		`${getApiBaseUrl()}/data/search/${encodeURIComponent(project)}`,
		{
			method: 'POST',
			headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
			body: JSON.stringify({
				resClass: classIri,
				includeProperties: ['schema:name', 'schema:abstract', 'oldap:lastModificationDate'],
				sortBy: [{ property: 'oldap:lastModificationDate', direction: 'desc' }],
				limit: 100
			})
		}
	);
	if (!response.ok) {
		throw new OldapResourceError(
			(await responseMessage(response)) ?? `Story search failed (HTTP ${response.status}).`,
			response.status
		);
	}
	const value = (await response.json()) as unknown;
	if (!Array.isArray(value)) throw new OldapResourceError('Invalid Story search response.', 500);
	return value.filter(
		(item): item is OldapResourceSearchHit =>
			Boolean(item) &&
			typeof item === 'object' &&
			typeof (item as { iri?: unknown }).iri === 'string' &&
			typeof (item as { resclass?: unknown }).resclass === 'string'
	);
}

function resourceClassLocalName(classIri: string): string {
	const match = /^[A-Za-z_][\w.-]*:([A-Za-z_][\w.-]*)$/.exec(classIri);
	if (!match) throw new OldapResourceError(`Cannot create unsupported class IRI ${classIri}.`, 400);
	return match[1];
}

function languageTag(language: string): string {
	const normalized = language.trim().toLowerCase();
	if (!/^[a-z]{2,3}(?:-[a-z0-9]+)*$/.test(normalized)) {
		throw new OldapResourceError(`Invalid Story language ${language}.`, 400);
	}
	return normalized;
}

/** Load configured Story classes and every readable Story in the project. */
export async function loadStoryAdministration(project: string): Promise<StoryAdministrationData> {
	const model = await readDataModel(project);
	const classIris = storyClasses(model).map(({ iri }) => iri);
	const results = await Promise.all(
		classIris.map((classIri) => searchStoryClass(project, classIri))
	);
	const stories = [...new Map(results.flat().map((story) => [story.iri, story])).values()];
	return { model, classIris, stories };
}

/** Load the model-derived Story classes that support safe minimal creation. */
export async function loadStoryCreationOptions(project: string): Promise<StoryCreationOptions> {
	const model = await readDataModel(project);
	const classes = storyClasses(model).flatMap((resourceClass) => {
		const authorClassIri = storyAuthorClass(model, resourceClass.iri);
		return authorClassIri
			? [{ iri: resourceClass.iri, label: resourceClass.label ?? [], authorClassIri }]
			: [];
	});
	return { classes };
}

/** List readable resources that satisfy one Story class's author relationship. */
export function loadStoryAuthors(
	project: string,
	authorClassIri: string
): Promise<OldapResourceSearchHit[]> {
	return searchStoryClass(project, authorClassIri);
}

/**
 * Create one private-by-role Story with an OLDAP-generated identity and verify it.
 *
 * The payload deliberately omits `iri`, narrative text, and publication state.
 * The selected language is persisted on the required title and initializes the
 * blank editor draft after navigation.
 */
export async function createStory(project: string, input: CreateStoryInput): Promise<CreatedStory> {
	const title = input.title.trim();
	const language = languageTag(input.language);
	if (!title) throw new OldapResourceError('A Story title is required.', 400);
	if (!input.authorIri) throw new OldapResourceError('A Story author is required.', 400);
	if (!input.roleIri) throw new OldapResourceError('A private Story role is required.', 400);

	const response = await authenticatedFetch(
		`${getApiBaseUrl()}/data/${encodeURIComponent(project)}/${encodeURIComponent(resourceClassLocalName(input.classIri))}`,
		{
			method: 'PUT',
			headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
			body: JSON.stringify({
				'schema:name': [`${title}@${language}`],
				'schema:author': input.authorIri,
				'oldap:attachedToRole': { [input.roleIri]: 'DATA_PERMISSIONS' }
			})
		}
	);
	if (!response.ok) {
		throw new OldapResourceError(
			(await responseMessage(response)) ?? `Story creation failed (HTTP ${response.status}).`,
			response.status
		);
	}
	const value = (await response.json()) as { iri?: unknown };
	if (typeof value.iri !== 'string' || !value.iri) {
		throw new OldapResourceError('OLDAP returned no IRI for the created Story.', 500);
	}

	const record = await readResource(project, value.iri);
	const types = Array.isArray(record['rdf:type']) ? record['rdf:type'] : [record['rdf:type']];
	const names = Array.isArray(record['schema:name'])
		? record['schema:name']
		: [record['schema:name']];
	const authors = Array.isArray(record['schema:author'])
		? record['schema:author']
		: [record['schema:author']];
	const permissions = record['oldap:attachedToRole'];
	if (
		!types.includes(input.classIri) ||
		!names.includes(`${title}@${language}`) ||
		!authors.includes(input.authorIri) ||
		!permissions ||
		typeof permissions !== 'object' ||
		Array.isArray(permissions) ||
		permissions[input.roleIri] !== 'DATA_PERMISSIONS'
	) {
		throw new OldapResourceError(
			`Story ${value.iri} was created but failed read-back verification.`,
			500
		);
	}
	return { iri: value.iri, record };
}

/** Load one complete Story record for the administration editor. */
export function loadStoryForEditing(project: string, iri: string): Promise<OldapResourceRecord> {
	return readResource(project, iri);
}

/** Load a Story plus the model-constrained author candidates needed by its editor. */
export async function loadStoryEditorContext(
	project: string,
	iri: string
): Promise<StoryEditorContext> {
	const [record, options] = await Promise.all([
		loadStoryForEditing(project, iri),
		loadStoryCreationOptions(project)
	]);
	const types = new Set(
		(Array.isArray(record['rdf:type']) ? record['rdf:type'] : [record['rdf:type']]).filter(
			(value): value is string => typeof value === 'string'
		)
	);
	const storyClass = options.classes.find(({ iri: classIri }) => types.has(classIri));
	if (!storyClass) {
		throw new OldapResourceError(`Resource ${iri} does not satisfy an editable Story class.`, 400);
	}
	const authors = await loadStoryAuthors(project, storyClass.authorClassIri);
	return {
		record,
		classIri: storyClass.iri,
		authorClassIri: storyClass.authorClassIri,
		authors
	};
}

/** Atomically replace editable Story fields and verify the persisted result. */
export async function updateStory(
	project: string,
	iri: string,
	drafts: StoryEditorLanguageDraft[],
	authorIri: string
): Promise<OldapResourceRecord> {
	if (!drafts.some(({ title }) => title.trim())) {
		throw new OldapResourceError('A Story title is required.', 400);
	}
	if (!authorIri) throw new OldapResourceError('A Story author is required.', 400);
	const payload = storyUpdatePayload(drafts, authorIri);
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
			(await responseMessage(response)) ?? `Story update failed (HTTP ${response.status}).`,
			response.status
		);
	}
	const verified = await loadStoryForEditing(project, iri);
	if (!storyUpdateMatches(verified, payload)) {
		throw new OldapResourceError(`Story ${iri} failed read-back verification.`, 500);
	}
	return verified;
}
