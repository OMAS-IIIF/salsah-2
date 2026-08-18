/** A user-selectable OLDAP project enriched with its display metadata. */
export interface WorkingProject {
	projectIri: string;
	projectShortName: string;
	labels: string[];
	permissions: string[];
}

export type ProjectContextState =
	| { status: 'idle'; projects: WorkingProject[]; current: null; error: null }
	| { status: 'loading'; projects: WorkingProject[]; current: null; error: null }
	| { status: 'ready'; projects: WorkingProject[]; current: WorkingProject | null; error: null }
	| { status: 'error'; projects: WorkingProject[]; current: null; error: string };
