import { authenticatedFetch } from '$lib/api/client';
import { getApiBaseUrl } from '$lib/api/baseUrl';
import { getMediaBaseUrl } from './baseUrl';
import { readMediaCapability } from './renewal';

/** Only the configured media origin may receive an OLDAP image capability.
 * Extract the identifier from the right, retaining optional IIIF prefixes. */
export function managedImageTarget(source: string) {
	try {
		const url = new URL(source);
		if (url.origin !== new URL(getMediaBaseUrl()).origin || url.username || url.password)
			return null;
		const match =
			/^\/iiif\/[^/]+\/(?:[^/]+\/)*([^/]+)\/(?:info\.json|[^/]+\/[^/]+\/[^/]+\/[^/]+\.[^/]+)$/.exec(
				url.pathname
			);
		if (!match) return null;
		url.searchParams.delete('token');
		return { url: url.toString(), assetId: decodeURIComponent(match[1]) };
	} catch {
		return null;
	}
}

/** Recheck media rights through the normal API authentication/refresh boundary.
 * The returned JWT is decoded only for expiry and asset binding, never to grant rights. */
export async function loadMediaCapability(assetId: string) {
	const response = await authenticatedFetch(
		`${getApiBaseUrl()}/data/mediaobject/id/${encodeURIComponent(assetId)}`,
		{
			headers: { Accept: 'application/json' },
			signal: AbortSignal.timeout(10_000),
			redirect: 'error'
		}
	);
	if (!response.ok) throw new Error('Media authorization failed.');
	const record = (await response.json()) as { token?: unknown };
	if (typeof record.token !== 'string') throw new Error('Missing media capability.');
	return readMediaCapability(record.token, assetId);
}

/** Metadata must describe the requested service before OSD receives credentials. */
export function assertIiifServiceIdentity(infoUrl: string, info: Record<string, unknown>): void {
	const expected = new URL(infoUrl);
	expected.pathname = expected.pathname.replace(/\/info\.json$/, '');
	expected.search = '';
	expected.hash = '';
	if (
		(info.id ?? info['@id']) !== expected.toString() ||
		[info.id, info['@id']].some((id) => id !== undefined && id !== expected.toString())
	)
		throw new Error('Unexpected IIIF service identity.');
}
