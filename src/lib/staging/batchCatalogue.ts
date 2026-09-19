import {
	catalogueStagingMediaObject,
	type CatalogueResult,
	type CatalogueTarget
} from './catalogue';
import type { StagingMediaObjectNode } from './types';

/** One reviewed set of minimal metadata for a Staging media object. */
export interface BatchCatalogueItem {
	archiveUnitIri?: string;
	media: StagingMediaObjectNode;
	values: Record<string, string>;
	relations?: Record<string, string[]>;
}

export interface BatchCatalogueSuccess {
	status: 'catalogued';
	item: BatchCatalogueItem;
	result: CatalogueResult;
}

export interface BatchCatalogueFailure {
	status: 'failed';
	item: BatchCatalogueItem;
	error: string;
}

export interface BatchCatalogueSkipped {
	status: 'not_started';
	item: BatchCatalogueItem;
}

export type BatchCatalogueOutcome =
	BatchCatalogueSuccess | BatchCatalogueFailure | BatchCatalogueSkipped;

export interface BatchCatalogueReport {
	total: number;
	completed: number;
	failed: boolean;
	outcomes: BatchCatalogueOutcome[];
}

interface BatchCatalogueDependencies {
	catalogue: typeof catalogueStagingMediaObject;
}

const defaultDependencies: BatchCatalogueDependencies = {
	catalogue: catalogueStagingMediaObject
};

/**
 * Derive a human-editable initial title from an uploaded filename.
 *
 * The value is only a form suggestion. It is never written until the user has
 * reviewed the complete batch preview and explicitly confirms it.
 */
export function suggestedCatalogueTitle(media: StagingMediaObjectNode): string {
	const source =
		media.originalName?.trim() || media.iri.split(/[:/#]/).filter(Boolean).at(-1) || '';
	return source
		.replace(/\.[^.]+$/, '')
		.replace(/[_-]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Catalogue a reviewed batch sequentially and stop on the first failure.
 *
 * OLDAP currently exposes one atomic transform per resource. Sequential
 * execution preserves that strong per-resource boundary and produces an exact
 * partial-result report instead of pretending the whole client-side batch is
 * atomic.
 */
export async function catalogueStagingMediaBatch(
	project: string,
	target: CatalogueTarget,
	language: string,
	items: BatchCatalogueItem[],
	onProgress: (completed: number, total: number) => void = () => undefined,
	dependencies: BatchCatalogueDependencies = defaultDependencies
): Promise<BatchCatalogueReport> {
	const outcomes: BatchCatalogueOutcome[] = [];
	let failed = false;
	let completed = 0;
	for (const item of items) {
		if (failed) {
			outcomes.push({ status: 'not_started', item });
			continue;
		}
		try {
			const result = await dependencies.catalogue(project, item.media, target, {
				targetClass: target.iri,
				language,
				values: item.values,
				relations: item.relations,
				...(item.archiveUnitIri ? { archiveUnitIri: item.archiveUnitIri } : {})
			});
			outcomes.push({ status: 'catalogued', item, result });
			completed += 1;
			onProgress(completed, items.length);
		} catch (reason: unknown) {
			outcomes.push({
				status: 'failed',
				item,
				error: reason instanceof Error ? reason.message : 'Catalogue transition failed.'
			});
			failed = true;
		}
	}
	return { total: items.length, completed, failed, outcomes };
}
