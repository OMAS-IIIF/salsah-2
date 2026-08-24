<script lang="ts">
	import { onMount } from 'svelte';
	import { m } from '$lib/paraglide/messages';
	import { withMediaCapability } from '$lib/media/capability';

	interface Props {
		infoUrl: string;
		capability?: string | null;
		label: string;
	}

	let { infoUrl, capability = null, label }: Props = $props();
	let viewerElement: HTMLDivElement;
	let viewer: import('openseadragon').Viewer | null = null;
	let loading = $state(true);
	let error = $state(false);

	function iiifVersion(info: Record<string, unknown>): number {
		const contexts = Array.isArray(info['@context']) ? info['@context'] : [info['@context']];
		const context = contexts.find((value): value is string => typeof value === 'string') ?? '';
		if (context.includes('/image/3/')) return 3;
		if (context.includes('/image/2/')) return 2;
		return 1;
	}

	onMount(() => {
		let cancelled = false;

		void (async () => {
			try {
				const [{ default: OpenSeadragon }, response] = await Promise.all([
					import('openseadragon'),
					fetch(withMediaCapability(infoUrl, capability), {
						headers: { Accept: 'application/json' }
					})
				]);
				if (!response.ok) throw new Error(`IIIF metadata request failed (${response.status}).`);
				const info = (await response.json()) as Record<string, unknown>;
				if (cancelled) return;

				const tileSource = new OpenSeadragon.IIIFTileSource({
					...info,
					version: iiifVersion(info)
				} as OpenSeadragon.TileSourceOptions & { tileFormat?: string; tileQuality?: string });
				const tileUrl = tileSource.getTileUrl.bind(tileSource);
				tileSource.getTileUrl = (level, x, y) => {
					const url = tileUrl(level, x, y);
					return typeof url === 'string' ? withMediaCapability(url, capability) : url;
				};

				viewer = OpenSeadragon({
					element: viewerElement,
					tileSources: tileSource as unknown as OpenSeadragon.TileSourceOptions,
					showNavigationControl: false,
					showNavigator: true,
					navigatorPosition: 'BOTTOM_RIGHT',
					navigatorSizeRatio: 0.18,
					animationTime: 0.6,
					blendTime: 0.1,
					constrainDuringPan: true,
					visibilityRatio: 0.75,
					maxZoomPixelRatio: 2,
					minZoomImageRatio: 0.8,
					gestureSettingsTouch: { pinchToZoom: true, flickEnabled: true },
					gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true }
				});
				viewer.addOnceHandler('open', () => {
					if (!cancelled) loading = false;
				});
				viewer.addOnceHandler('open-failed', () => {
					if (!cancelled) {
						loading = false;
						error = true;
					}
				});
			} catch {
				if (!cancelled) {
					loading = false;
					error = true;
				}
			}
		})();

		return () => {
			cancelled = true;
			viewer?.destroy();
			viewer = null;
		};
	});

	function zoom(factor: number): void {
		viewer?.viewport.zoomBy(factor);
		viewer?.viewport.applyConstraints();
	}
</script>

<section class="viewer-shell" aria-label={m.media_viewer_region({ title: label })}>
	<div class="viewer" bind:this={viewerElement}></div>
	<nav class="toolbar" aria-label={m.media_viewer_controls()}>
		<button
			type="button"
			title={m.media_viewer_zoom_in()}
			aria-label={m.media_viewer_zoom_in()}
			onclick={() => zoom(1.5)}>+</button
		>
		<button
			type="button"
			title={m.media_viewer_zoom_out()}
			aria-label={m.media_viewer_zoom_out()}
			onclick={() => zoom(1 / 1.5)}>−</button
		>
		<button
			type="button"
			title={m.media_viewer_home()}
			aria-label={m.media_viewer_home()}
			onclick={() => viewer?.viewport.goHome()}>⌂</button
		>
		<button
			type="button"
			title={m.media_viewer_fullscreen()}
			aria-label={m.media_viewer_fullscreen()}
			onclick={() => viewer?.setFullScreen(true)}>⛶</button
		>
	</nav>
	{#if loading}<div class="viewer-state" role="status">
			<span></span>{m.media_viewer_loading()}
		</div>{/if}
	{#if error}<div class="viewer-state error" role="alert">{m.media_viewer_error()}</div>{/if}
</section>

<style>
	.viewer-shell {
		position: relative;
		min-height: clamp(22rem, 56vw, 43rem);
		overflow: hidden;
		background: #081b2c;
		border: 1px solid #263f54;
		border-radius: 0.7rem;
		box-shadow: 0 4px 20px rgb(17 44 70 / 12%);
	}
	.viewer {
		position: absolute;
		inset: 0;
	}
	.toolbar {
		position: absolute;
		top: 0.75rem;
		left: 0.75rem;
		display: flex;
		gap: 0.3rem;
		padding: 0.3rem;
		background: rgb(8 27 44 / 86%);
		border: 1px solid rgb(255 255 255 / 18%);
		border-radius: 0.45rem;
		backdrop-filter: blur(8px);
	}
	button {
		display: grid;
		place-items: center;
		width: 2.25rem;
		height: 2.25rem;
		padding: 0;
		color: white;
		background: transparent;
		border: 0;
		border-radius: 0.3rem;
		font:
			600 1.25rem/1 system-ui,
			sans-serif;
		cursor: pointer;
	}
	button:hover,
	button:focus-visible {
		background: var(--copper);
		outline: none;
	}
	.viewer-state {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.65rem;
		color: #e6edf2;
		background: #081b2c;
		font-size: 0.78rem;
	}
	.viewer-state span {
		width: 1rem;
		height: 1rem;
		border: 2px solid rgb(255 255 255 / 28%);
		border-top-color: var(--teal);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	.viewer-state.error {
		padding: 2rem;
		color: #ffd9ce;
		text-align: center;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
