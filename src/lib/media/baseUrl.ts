import { env } from '$env/dynamic/public';

/** Resolve the browser-visible OLDAP media-server origin. */
export function getMediaBaseUrl(): string {
	const value = env.PUBLIC_MEDIA_URL?.trim();
	if (!value) throw new Error('PUBLIC_MEDIA_URL is not configured.');
	return value.replace(/\/+$/, '');
}
