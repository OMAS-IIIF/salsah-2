<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { mediaPreviewUrl, mediaThumbnailUrl } from '$lib/media/capability';
	import type { MediaDelivery } from '$lib/resources/types';

	interface Props {
		media: MediaDelivery;
		title: string;
		size?: string;
	}

	let { media, title, size = '5rem' }: Props = $props();
	let dialog = $state<HTMLDialogElement>();
	let open = $state(false);
	let thumbnailFailed = $state(false);

	$effect(() => {
		if (open && dialog && !dialog.open) dialog.showModal();
	});

	function close(): void {
		dialog?.close();
		open = false;
	}
</script>

{#if !thumbnailFailed}
	<button
		type="button"
		class="thumbnail"
		style={`--preview-size: ${size}`}
		onclick={() => (open = true)}
		aria-label={m.media_preview_open({ title })}
	>
		<img src={mediaThumbnailUrl(media)} alt={title} onerror={() => (thumbnailFailed = true)} />
	</button>
{:else}
	<span class="thumbnail fallback" style={`--preview-size: ${size}`} aria-hidden="true">▧</span>
{/if}

{#if open}
	<dialog
		bind:this={dialog}
		class="lightbox"
		aria-label={m.media_preview_label({ title })}
		oncancel={(event) => {
			event.preventDefault();
			close();
		}}
		onclick={(event) => {
			if (event.target === event.currentTarget) close();
		}}
	>
		<button type="button" class="close" onclick={close} aria-label={m.media_preview_close()}
			>×</button
		>
		<figure>
			<img src={mediaPreviewUrl(media)} alt={title} />
			<figcaption>{title}</figcaption>
		</figure>
	</dialog>
{/if}

<style>
	.thumbnail {
		display: grid;
		width: var(--preview-size);
		height: var(--preview-size);
		padding: 0;
		place-items: center;
		overflow: hidden;
		color: var(--teal-dark);
		background: #e8ebe7;
		border: 1px solid #d8ddd8;
		border-radius: 0.4rem;
	}
	button.thumbnail {
		cursor: zoom-in;
	}
	.thumbnail img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.thumbnail.fallback {
		font-size: 1.4rem;
	}
	.lightbox {
		position: fixed;
		inset: 50% auto auto 50%;
		z-index: 70;
		width: min(80rem, calc(100vw - 4rem));
		max-width: none;
		max-height: calc(100vh - 4rem);
		margin: 0;
		padding: 0;
		transform: translate(-50%, -50%);
		overflow: visible;
		background: transparent;
		border: 0;
	}
	.lightbox::backdrop {
		background: rgb(9 31 52 / 82%);
	}
	.lightbox figure {
		display: grid;
		max-width: 100%;
		max-height: calc(100vh - 4rem);
		margin: 0;
		gap: 0.6rem;
	}
	.lightbox img {
		max-width: 100%;
		max-height: calc(100vh - 7rem);
		object-fit: contain;
		background: #101820;
		box-shadow: 0 1rem 4rem rgb(0 0 0 / 45%);
	}
	.lightbox figcaption {
		color: white;
		text-align: center;
	}
	.close {
		position: absolute;
		top: -1rem;
		right: -1rem;
		width: 2.6rem;
		height: 2.6rem;
		padding: 0;
		color: white;
		background: rgb(17 44 70 / 82%);
		border: 1px solid rgb(255 255 255 / 55%);
		border-radius: 50%;
		font-size: 1.4rem;
	}
	@media (max-width: 40rem) {
		.lightbox {
			width: calc(100vw - 2rem);
		}
		.close {
			top: -0.5rem;
			right: -0.5rem;
		}
	}
</style>
