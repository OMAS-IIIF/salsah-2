import type { MediaDelivery } from '$lib/resources/types';

/** Add a short-lived media capability without overwriting existing query parameters. */
export function withMediaCapability(url: string, capability: string | null): string {
	if (!capability) return url;
	const authorizedUrl = new URL(url);
	authorizedUrl.searchParams.set('token', capability);
	return authorizedUrl.toString();
}

/** Build a bounded project-card preview URL from a viewer-neutral delivery contract. */
export function mediaPreviewUrl(media: MediaDelivery): string {
	if (media.kind === 'external-image') return media.thumbnailUrl ?? media.url;
	const preview = new URL(media.infoUrl);
	preview.pathname = preview.pathname.replace(/\/info\.json$/, '/full/!720,480/0/default.jpg');
	return withMediaCapability(preview.toString(), media.capability);
}
