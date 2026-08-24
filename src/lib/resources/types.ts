export type JsonScalar = string | number | boolean | null;
export type JsonValue = JsonScalar | JsonValue[] | { [key: string]: JsonValue };

/** Raw ontology-driven OLDAP instance response. */
export type OldapResourceRecord = Record<string, JsonValue>;

/** Compact row returned by OLDAP's structured resource search. */
export interface OldapResourceSearchHit extends OldapResourceRecord {
	iri: string;
	resclass: string;
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
	media: MediaDelivery | null;
}
