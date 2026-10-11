import { authSession } from '$lib/auth/session';
import { loadMediaCapability, managedImageTarget } from './access';
import { withMediaCapability } from './capability';
import { MediaCapabilitySession } from './renewal';

/** Inert first render: managed images must never trigger a tokenless/stale-token fetch.
 * Keep a complete GIF palette and LZW data: Safari rejects truncated placeholders,
 * which would activate the caller's permanent image-error fallback. */
export const IMAGE_PLACEHOLDER =
	'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
export function initialImageSource(source: string): string {
	return managedImageTarget(source) ? IMAGE_PLACEHOLDER : source;
}

/** Own one native image's authorization, preserving callers' CSS and error handling.
 * Acquire within 200px of the viewport; pause timers offscreen/in hidden tabs.
 * Source/user changes dispose pending work. API-token rotation keeps the session.
 * No credentials are written back into resource records or Story drafts. */
export function authorizedImage(node: HTMLImageElement, source: string) {
	let cleanup = () => {};
	const update = (src: string) => {
		cleanup();
		const target = managedImageTarget(src);
		if (!target) {
			node.src = src;
			cleanup = () => {};
			return;
		}
		node.src = IMAGE_PLACEHOLDER;
		node.referrerPolicy = 'no-referrer';
		let near = false;
		let principal: string | undefined;
		let session: MediaCapabilitySession | undefined;
		const stop = () => {
			session?.dispose();
			session = undefined;
		};
		const sync = () => {
			if (!near || document.hidden || !principal) {
				stop();
				return;
			}
			if (session) {
				session.resume();
				return;
			}
			session = new MediaCapabilitySession(
				() => loadMediaCapability(target.assetId),
				(cap) => {
					node.src = withMediaCapability(target.url, cap.token);
				},
				() => {
					node.src = IMAGE_PLACEHOLDER;
					node.dispatchEvent(new Event('error'));
				}
			);
			void session.refresh();
		};
		const unsubscribe = authSession.subscribe((auth) => {
			const next = auth.user?.userIri;
			if (next !== principal) {
				stop();
				node.src = IMAGE_PLACEHOLDER;
				principal = next;
			}
			sync();
		});
		const observer = new IntersectionObserver(
			(entries) => {
				near = entries.some((entry) => entry.isIntersecting);
				sync();
			},
			{ rootMargin: '200px' }
		);
		observer.observe(node);
		document.addEventListener('visibilitychange', sync);
		window.addEventListener('focus', sync);
		cleanup = () => {
			stop();
			unsubscribe();
			observer.disconnect();
			document.removeEventListener('visibilitychange', sync);
			window.removeEventListener('focus', sync);
		};
	};
	update(source);
	return { update, destroy: () => cleanup() };
}
