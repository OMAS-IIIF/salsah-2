export type JsonScalar = string | number | boolean | null;
export type JsonValue = JsonScalar | JsonValue[] | { [key: string]: JsonValue };

/** Raw ontology-driven OLDAP instance response. */
export type OldapResourceRecord = Record<string, JsonValue>;

/** Compact row returned by OLDAP's structured resource search. */
export interface OldapResourceSearchHit extends OldapResourceRecord {
	iri: string;
	resclass: string;
}

/** Compact permission-filtered record returned by OLDAP's batch summary endpoint. */
export interface OldapResourceSummary {
	iri: string;
	resclass: string;
	data: OldapResourceRecord;
	mediaDelivery?: MediaDelivery | null;
}

export interface OldapResourceSummaryResponse {
	resources: OldapResourceSummary[];
}

/** One permission-aware resource card for project discovery. */
export interface ResourceCard {
	resource: OldapResourceSearchHit;
	classLabels: string[];
	media: MediaDelivery | null;
}

/** One permission-filtered archival description in the incremental tree. */
export interface ArchiveTreeUnit {
	iri: string;
	resclass: string;
	title: JsonValue | undefined;
	archiveLevel: string | null;
	parentIri: string | null;
	position: number | null;
	mediaIris: string[];
}

/** One media object displayed as content below an expanded archive unit. */
export interface ArchiveTreeMedia {
	iri: string;
	resclass: string;
	title: JsonValue | undefined;
	media: MediaDelivery | null;
}

export interface OldapPropertyDefinition {
	iri: string;
	name?: string[];
	description?: string[];
	datatype?: string;
	toClass?: string;
	minCount?: number;
	maxCount?: number;
	order?: number;
}

export interface OldapResourceClassDefinition {
	iri: string;
	label?: string[];
	comment?: string[];
	superclass?: string[];
	properties: OldapPropertyDefinition[];
}

export interface OldapDataModel {
	project: string;
	resources: OldapResourceClassDefinition[];
	annotationProperties?: OldapPropertyDefinition[];
}

export interface LinkedResourceValue {
	iri: string;
	title: string;
	classLabel: string | null;
}

export interface ResourceDisplayField {
	iri: string;
	label: string;
	datatype: string | null;
	values: JsonScalar[];
	links: LinkedResourceValue[];
	order: number;
}

export interface ResourcePresentation {
	iri: string;
	classIri: string;
	classLabel: string;
	title: string;
	description: string | null;
	fields: ResourceDisplayField[];
	publiclyReadable: boolean;
	isMediaObject: boolean;
	mediaAvailable: boolean;
}

/** Authorized delivery information kept separate from ontology display fields. */
export type MediaDelivery =
	| {
			kind: 'iiif-image';
			infoUrl: string;
			capability: string | null;
	  }
	| {
			kind: 'external-image';
			url: string;
			thumbnailUrl: string | null;
	  };

export interface LoadedResource {
	record: OldapResourceRecord;
	models: OldapDataModel[];
	linkedRecords: Map<string, OldapResourceRecord>;
	/** Direct media resource, or the sole linked representation selected for display. */
	displayMediaIri: string | null;
	media: MediaDelivery | null;
}
