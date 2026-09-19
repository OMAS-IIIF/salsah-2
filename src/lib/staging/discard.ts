import { authenticatedFetch } from '$lib/api/client';
import { getMediaBaseUrl } from '$lib/media/baseUrl';
import type { StagingMediaObjectNode } from './types';

export interface StagingDiscardResult {
	iri: string;
	assetId: string;
	cleanupPending: boolean;
}

interface DiscardDependencies {
	fetch: typeof authenticatedFetch;
	mediaBaseUrl: () => string;
}

const defaultDependencies: DiscardDependencies = {
	fetch: authenticatedFetch,
	mediaBaseUrl: getMediaBaseUrl
};

async function errorMessage(response: Response): Promise<string> {
	try {
		const payload = (await response.json()) as { message?: unknown; error?: unknown };
		if (typeof payload.message === 'string') return payload.message;
		if (typeof payload.error === 'string') return payload.error;
	} catch {
		// Preserve the stable HTTP fallback below.
	}
	return `Discard failed (HTTP ${response.status}).`;
}

/**
 * Remove one identity-bound Staging media object through the media owner.
 *
 * The media server verifies the expected OLDAP IRI, Staging relations, delete
 * permission, and asset ID before withdrawing files and deleting RDF.
 */
export async function discardStagingMediaObject(
	media: StagingMediaObjectNode,
	dependencies: DiscardDependencies = defaultDependencies
): Promise<StagingDiscardResult> {
	if (
		media.repositoryEntry &&
		(!media.repositoryEntry.canDeleteMedia || media.repositoryEntry.kind === 'archiveReference')
	)
		throw new Error('Archived references cannot delete media.');
	if (!media.assetId) throw new Error('The Staging object has no removable media asset.');
	const url = new URL(`${dependencies.mediaBaseUrl()}/upload/${encodeURIComponent(media.assetId)}`);
	url.searchParams.set('expectedResourceIri', media.iri);
	url.searchParams.set('stagingOnly', 'true');
	const response = await dependencies.fetch(url, {
		method: 'DELETE',
		headers: { Accept: 'application/json' }
	});
	if (!response.ok) throw new Error(await errorMessage(response));
	const payload = (await response.json()) as Partial<StagingDiscardResult>;
	if (
		payload.iri !== media.iri ||
		payload.assetId !== media.assetId ||
		typeof payload.cleanupPending !== 'boolean'
	) {
		throw new Error('The media server returned an invalid discard response.');
	}
	return payload as StagingDiscardResult;
}
