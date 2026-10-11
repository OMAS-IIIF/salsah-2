/** A media capability is unverified client-side; only the image server authorizes it. */
export type MediaCapability = { token: string; expiresAt: number };

/** Read expiry solely to schedule renewal, and reject accidentally mixed asset tokens.
 * This is not signature verification and must never grant client-side permissions.
 */
export function readMediaCapability(
	token: string,
	assetId: string,
	now = Date.now()
): MediaCapability {
	try {
		const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
		const bytes = Uint8Array.from(
			atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')),
			(c) => c.charCodeAt(0)
		);
		const claims = JSON.parse(new TextDecoder().decode(bytes));
		if (
			claims.typ !== 'media' ||
			claims.id !== assetId ||
			(claims.assetId !== undefined && claims.assetId !== assetId) ||
			!Number.isSafeInteger(claims.exp) ||
			claims.exp * 1000 <= now + 1000
		) {
			throw new Error('Invalid capability');
		}
		return { token, expiresAt: claims.exp * 1000 };
	} catch {
		throw new Error('No valid image capability was returned.');
	}
}

/** Own one viewer's renewal timer and in-flight request, never a global token cache.
 * Renew 20% before expiry (at most 60s). Coalesce wake/focus/timer triggers. Fail
 * closed after a renewal failure; the UI can retry explicitly. Disposal discards
 * late responses and prevents timers from surviving image/session changes.
 */
export class MediaCapabilitySession {
	private timer: ReturnType<typeof setTimeout> | undefined;
	private requestTimer: ReturnType<typeof setTimeout> | undefined;
	private flight: Promise<void> | undefined;
	private disposed = false;
	private renewAt = 0;

	constructor(
		private readonly load: () => Promise<MediaCapability>,
		private readonly apply: (capability: MediaCapability) => void | Promise<void>,
		private readonly failed: () => void,
		private readonly now: () => number = Date.now
	) {}

	/** Start or explicitly renew. Callers may await the first installed token. */
	refresh(): Promise<void> {
		if (this.disposed) return Promise.resolve();
		if (this.flight) return this.flight;
		clearTimeout(this.timer);
		// A delayed background timer can run after expiry: allow a bounded fresh
		// authorization attempt instead of trapping the viewer in an expired state.
		this.requestTimer = setTimeout(() => {
			if (this.disposed) return;
			this.dispose();
			this.failed();
		}, 10_000);
		this.flight = (async () => {
			try {
				const capability = await this.load();
				if (this.disposed) return;
				if (capability.expiresAt <= this.now() + 1000) throw new Error('Expired capability');
				await this.apply(capability);
				if (this.disposed) return;
				const remaining = capability.expiresAt - this.now();
				if (remaining <= 1000) throw new Error('Expired capability');
				this.renewAt = capability.expiresAt - Math.min(60_000, remaining * 0.2);
				this.timer = setTimeout(
					() => {
						void this.refresh();
					},
					Math.min(2_147_483_647, Math.max(0, this.renewAt - this.now()))
				);
			} catch {
				if (!this.disposed) {
					this.dispose();
					this.failed();
				}
			} finally {
				clearTimeout(this.requestTimer);
				this.flight = undefined;
			}
		})();
		return this.flight;
	}

	/** Background-tab throttling/sleep can delay timers; recheck when visible. */
	resume(): void {
		if (this.now() >= this.renewAt) void this.refresh();
	}

	dispose(): void {
		this.disposed = true;
		clearTimeout(this.timer);
		clearTimeout(this.requestTimer);
	}
}
