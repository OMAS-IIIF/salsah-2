import { get } from 'svelte/store';
import { projectContext } from '$lib/projects/context';

/** Resolve legacy search QNames using authoritative project metadata, never guessed URL patterns. */
export function absoluteProjectIri(project: string, value: string): string {
	if (/^(?:https?:\/\/|urn:)[^\s<>"{}|\\^`]+$/.test(value)) return value;
	const namespace = get(projectContext).projects.find(
		(p) => p.projectShortName === project
	)?.namespaceIri;
	return expandProjectIri(project, namespace, value);
}
/** Pure project-bound conversion, also used by contract regression tests. */
export function expandProjectIri(
	project: string,
	namespace: string | undefined,
	value: string
): string {
	if (/^(?:https?:\/\/|urn:)[^\s<>"{}|\\^`]+$/.test(value)) return value;
	if (
		!namespace ||
		!/^https?:\/\//.test(namespace) ||
		!value.startsWith(`${project}:`) ||
		!value.slice(project.length + 1) ||
		/[\s<>"{}|\\^`]/.test(value)
	)
		throw new Error('Cannot resolve resource IRI from the current project namespace.');
	return namespace + value.slice(project.length + 1);
}
