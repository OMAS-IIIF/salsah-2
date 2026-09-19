import type { JsonValue, MediaDelivery } from '$lib/resources/types';

/** Permission-filtered StagingArea presented in project administration. */
export interface StagingAreaSummary {
	iri: string;
	resclass: string;
	title: JsonValue | undefined;
	mediaPath: string | null;
	defaultRoleIri: string | null;
	quotaBytes: number | null;
}

/** One visible folder in a StagingArea hierarchy. */
export interface StagingFolderNode {
	iri: string;
	resclass: string;
	title: JsonValue | undefined;
	areaIri: string;
	parentIri: string | null;
}

/** One readable media object placed directly inside a StagingFolder. */
export interface StagingMediaObjectNode {
	repositoryEntry?: import('./repository').RepositoryEntry;
	folderRevision?: string;
	iri: string;
	resclass: string;
	folderIri: string;
	areaIri: string;
	originalName: string | null;
	mimeType: string | null;
	statusIri: string | null;
	assetId: string | null;
	checksum: string | null;
	protocol: string | null;
	derivativeName: string | null;
	mediaDelivery: MediaDelivery | null;
}
