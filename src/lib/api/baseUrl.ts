import { env } from '$env/dynamic/public';

/** Resolve the browser-visible OLDAP API origin from deployment configuration. */
export function getApiBaseUrl(): string {
	const value = env.PUBLIC_API_URL?.trim();
	if (!value) throw new Error('PUBLIC_API_URL is not configured.');
	return value.replace(/\/+$/, '');
}
