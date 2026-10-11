import { env } from '$env/dynamic/public';

/** Resolve the browser-visible OLDAP media-server origin. */
export function getMediaBaseUrl(): string {
	const value = env.PUBLIC_MEDIA_URL?.trim();
	if (!value) throw new Error('PUBLIC_MEDIA_URL is not configured.');
	return value.replace(/\/+$/, '');
}

/** Local delivery records may retain another deployment's host. Preserve the IIIF
 * path while selecting this installation's configured media origin. External-image
 * contracts must never pass through this function. */
export function localIiifUrl(url: string): string {
	if (!env.PUBLIC_MEDIA_URL?.trim()) return url;
	const parsed = new URL(url);
	return new URL(
		parsed.pathname + parsed.search + parsed.hash,
		new URL(getMediaBaseUrl()).origin
	).toString();
}
