/** Project-neutral AS-00 HTTP boundary. Authorization remains authoritative in OLDAP. */
import { authenticatedFetch } from '$lib/api/client';
import { getApiBaseUrl } from '$lib/api/baseUrl';

export class ArchiveRequestError extends Error {
	constructor(
		message: string,
		public status: number,
		public code: string
	) {
		super(message);
	}
}
/** JSON requests retain server conflict codes so uncertain writes can keep their exact command. */
export async function archiveRequest<T>(
	path: string,
	body?: unknown,
	method = body === undefined ? 'GET' : 'POST',
	id?: string
): Promise<T> {
	const response = await authenticatedFetch(`${getApiBaseUrl()}${path}`, {
		method,
		headers: {
			Accept: 'application/json',
			...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
			...(id ? { 'Idempotency-Key': id } : {})
		},
		...(body === undefined ? {} : { body: JSON.stringify(body) })
	});
	const result = response.status === 204 ? null : await response.json();
	if (!response.ok) {
		// The optional operator panel handles this without exposing recovery to ordinary users.
		if (
			typeof window !== 'undefined' &&
			result?.code === 'COORDINATION_UNAVAILABLE' &&
			!path.includes('/admin/writer-recovery')
		) {
			window.dispatchEvent(new Event('oldap:writer-blocked'));
		}
		throw new ArchiveRequestError(
			result?.code === 'COORDINATION_UNAVAILABLE'
				? 'Schreibzugriff blockiert. Eine berechtigte Betriebsperson kann die Schreibsperre in der Archivverwaltung prüfen.'
				: (result?.message ?? result?.title ?? `HTTP ${response.status}`),
			response.status,
			result?.code ?? ''
		);
	}
	return result as T;
}
export interface StructureCapabilities {
	enabled: boolean;
	canManageStructure: boolean;
	canCreateUnits: boolean;
	maxMutations: number;
}
export async function structureCapabilities(project: string): Promise<StructureCapabilities> {
	const value = await archiveRequest<StructureCapabilities>(
		`/archive/${encodeURIComponent(project)}/structure/capabilities`
	);
	if (
		!value ||
		['enabled', 'canManageStructure', 'canCreateUnits'].some(
			(key) => typeof value[key as keyof StructureCapabilities] !== 'boolean'
		)
	)
		throw new Error('Invalid structure capabilities.');
	return value;
}
export const archiveLevels = [
	'shared:ArchiveGroup',
	'shared:Fonds',
	'shared:Subfonds',
	'shared:Series',
	'shared:Subseries',
	'shared:File',
	'shared:Item'
] as const;
export type UnitTarget = { iri: string } | { key: string };
export interface StructurePlan {
	sourceFolderIri: string;
	sourceSnapshot: string;
	newUnits: {
		key: string;
		name: Record<string, string>;
		archiveLevel: (typeof archiveLevels)[number];
		parent: UnitTarget | null;
		position?: number | null;
	}[];
	mappings: (
		| { folderIri: string; action: 'set'; target: UnitTarget }
		| { folderIri: string; action: 'clear' | 'skip' }
	)[];
}
export interface StructureReview {
	reviewDigest: string;
	counts: Record<string, number>;
	warnings: { code: string; message: string }[];
}
export interface StructureProposal {
	suggestedPlan: StructurePlan;
	folders: { iri: string; name: string; mappingState: string }[];
	warnings: { code: string; message: string }[];
}
/** Reject corrupt persisted commands rather than offering a new command after an uncertain write. */
export function validPlan(value: unknown): value is StructurePlan {
	if (!value || typeof value !== 'object') return false;
	const p = value as StructurePlan;
	const target = (v: UnitTarget | null) =>
		v === null ||
		Boolean(
			v &&
			typeof v === 'object' &&
			(('iri' in v && typeof v.iri === 'string' && v.iri) ||
				('key' in v && typeof v.key === 'string' && v.key))
		);
	return (
		typeof p.sourceFolderIri === 'string' &&
		/^[a-f0-9]{64}$/.test(p.sourceSnapshot) &&
		Array.isArray(p.newUnits) &&
		p.newUnits.length <= 500 &&
		p.newUnits.every(
			(u) =>
				u &&
				typeof u === 'object' &&
				typeof u.key === 'string' &&
				u.name &&
				typeof u.name === 'object' &&
				!Array.isArray(u.name) &&
				Object.keys(u.name).length > 0 &&
				Object.values(u.name).every((n) => typeof n === 'string' && n.length > 0) &&
				archiveLevels.includes(u.archiveLevel) &&
				target(u.parent)
		) &&
		Array.isArray(p.mappings) &&
		p.mappings.length <= 500 &&
		p.mappings.every(
			(m) =>
				m &&
				typeof m === 'object' &&
				typeof m.folderIri === 'string' &&
				(m.action === 'set'
					? target(m.target) && m.target !== null
					: ['clear', 'skip'].includes(m.action))
		)
	);
}
export function structurePath(project: string, action: string) {
	return `/archive/${encodeURIComponent(project)}/structure/${action}`;
}
/** Only explicit deterministic rejections permit abandoning a pending domain command. */
export function isDefiniteRejection(error: unknown): boolean {
	return (
		error instanceof ArchiveRequestError &&
		[
			'STALE_REVIEW',
			'STALE_FOLDER',
			'INVALID_REQUEST',
			'INVALID_HIERARCHY',
			'FORBIDDEN',
			'NOT_FOUND',
			'TOO_LARGE',
			'REFERENCE_IN_USE'
		].includes(error.code)
	);
}
