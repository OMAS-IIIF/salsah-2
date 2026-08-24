<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { getLocale } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages';
	import { projectPath, projectResourcePath } from '$lib/projects/context';
	import IiifImageViewer from '$lib/components/media/IiifImageViewer.svelte';
	import { loadResource, OldapResourceError } from '$lib/resources/client';
	import { fallbackLabel, presentResource } from '$lib/resources/model';
	import type { JsonScalar, LoadedResource, ResourceDisplayField } from '$lib/resources/types';

	interface Props {
		project: string;
		iri: string;
	}

	let { project, iri }: Props = $props();
	let loaded = $state<LoadedResource | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let reloadGeneration = $state(0);
	let presentation = $derived(loaded ? presentResource(loaded, iri, getLocale()) : null);
	let relationships = $derived(presentation?.fields.filter(({ links }) => links.length) ?? []);
	let metadata = $derived(presentation?.fields.filter(({ links }) => !links.length) ?? []);

	$effect(() => {
		const requestedProject = project;
		const requestedIri = iri;
		const requestedGeneration = reloadGeneration;
		let cancelled = false;
		loading = true;
		error = null;
		loaded = null;

		void loadResource(requestedProject, requestedIri)
			.then((result) => {
				if (!cancelled && requestedGeneration === reloadGeneration) loaded = result;
			})
			.catch((reason: unknown) => {
				if (cancelled) return;
				error =
					reason instanceof OldapResourceError && reason.status === 404
						? m.resource_not_found()
						: reason instanceof Error
							? reason.message
							: m.resource_load_error();
			})
			.finally(() => {
				if (!cancelled) loading = false;
			});

		return () => {
			cancelled = true;
		};
	});

	function retry(): void {
		reloadGeneration += 1;
	}

	function fieldValue(value: JsonScalar): string {
		if (value === true) return m.value_yes();
		if (value === false) return m.value_no();
		if (value === null) return m.value_not_recorded();
		if (typeof value === 'string' && /^[A-Za-z][\w.-]*:[^\s]+$/.test(value)) {
			return fallbackLabel(value);
		}
		return String(value);
	}

	function fieldClass(field: ResourceDisplayField): string {
		if (field.datatype === 'xsd:boolean') return 'boolean';
		if (field.iri.toLowerCase().includes('checksum')) return 'code';
		return '';
	}
</script>

<svelte:head>
	<title>{presentation ? `${presentation.title} · SALSAH 2.0` : m.app_title()}</title>
</svelte:head>

<div class="resource-page">
	<a class="back-link" href={resolve(projectPath(project) as Pathname)}>
		<span aria-hidden="true">←</span>{m.resource_back_workspace()}
	</a>

	{#if loading}
		<div class="state-card" role="status"><span class="spinner"></span>{m.resource_loading()}</div>
	{:else if error}
		<div class="state-card error" role="alert">
			<div>
				<strong>{m.resource_load_error_title()}</strong>
				<p>{error}</p>
			</div>
			<button type="button" onclick={retry}>{m.resource_retry()}</button>
		</div>
	{:else if presentation}
		<header class="resource-heading">
			<div>
				<p class="eyebrow">{presentation.classLabel}</p>
				<h1>{presentation.title}</h1>
				<code>{presentation.iri}</code>
			</div>
			<span class:public={presentation.publiclyReadable} class="access-state">
				<i aria-hidden="true"></i>
				{presentation.publiclyReadable ? m.resource_public() : m.resource_restricted()}
			</span>
		</header>

		<div class="resource-grid">
			<div class="main-column">
				{#if loaded?.media?.kind === 'iiif-image'}
					<IiifImageViewer
						infoUrl={loaded.media.infoUrl}
						capability={loaded.media.capability}
						label={presentation.title}
					/>
				{:else if loaded?.media?.kind === 'external-image'}
					<figure class="external-image">
						<img src={loaded.media.url} alt={presentation.title} />
					</figure>
				{:else if presentation.isMediaObject && !presentation.mediaAvailable}
					<section class="media-placeholder" aria-label={m.media_placeholder_title()}>
						<div class="image-mark" aria-hidden="true">
							<span></span><i></i><b></b>
						</div>
						<div>
							<p class="kicker">{m.media_placeholder_kicker()}</p>
							<h2>{m.media_placeholder_title()}</h2>
							<p>{m.media_placeholder_text()}</p>
						</div>
					</section>
				{/if}

				{#if presentation.description}
					<section class="panel description">
						<p class="kicker">{m.resource_description_kicker()}</p>
						<h2>{m.resource_description_title()}</h2>
						<p>{presentation.description}</p>
					</section>
				{/if}

				<section class="panel metadata-panel">
					<header>
						<div>
							<p class="kicker">{m.resource_metadata_kicker()}</p>
							<h2>{m.resource_metadata_title()}</h2>
						</div>
						<small>{m.resource_ontology_driven()}</small>
					</header>
					{#if metadata.length}
						<dl>
							{#each metadata as field (field.iri)}
								<div>
									<dt>{field.label}<code>{field.iri}</code></dt>
									<dd class={fieldClass(field)}>
										{#each field.values as value, index (`${field.iri}-${index}`)}
											<span>{fieldValue(value)}</span>
										{/each}
									</dd>
								</div>
							{/each}
						</dl>
					{:else}
						<p class="empty-note">{m.resource_no_metadata()}</p>
					{/if}
				</section>
			</div>

			<aside class="relationship-column" aria-label={m.resource_relationships_title()}>
				<section class="panel relationships">
					<p class="kicker">{m.resource_context_kicker()}</p>
					<h2>{m.resource_relationships_title()}</h2>
					{#if relationships.length}
						<div class="relationship-list">
							{#each relationships as field (field.iri)}
								<div class="relationship-group">
									<h3>{field.label}</h3>
									{#each field.links as link (link.iri)}
										<a href={resolve(projectResourcePath(project, link.iri) as Pathname)}>
											<i aria-hidden="true">{link.title.slice(0, 1).toUpperCase()}</i>
											<span>
												<small>{link.classLabel}</small>
												<strong>{link.title}</strong>
												<code>{link.iri}</code>
											</span>
											<b aria-hidden="true">→</b>
										</a>
									{/each}
								</div>
							{/each}
						</div>
					{:else}
						<p class="empty-note">{m.resource_no_relationships()}</p>
					{/if}
				</section>

				<section class="provenance-note">
					<span aria-hidden="true">◇</span>
					<div>
						<p class="kicker">{m.resource_live_kicker()}</p>
						<h2>{m.resource_live_title()}</h2>
						<p>{m.resource_live_text()}</p>
					</div>
				</section>
			</aside>
		</div>
	{/if}
</div>

<style>
	.resource-page {
		max-width: 96rem;
		margin: auto;
		padding: 1.5rem clamp(1.1rem, 3vw, 3.25rem) 4rem;
	}
	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		margin-bottom: 1.35rem;
		color: var(--muted);
		font-size: 0.76rem;
		font-weight: 680;
		text-decoration: none;
	}
	.back-link:hover {
		color: var(--teal);
	}
	.resource-heading {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 2rem;
		padding: 1.2rem 0 1.8rem;
		border-bottom: 1px solid var(--line);
	}
	.eyebrow,
	.kicker {
		margin: 0 0 0.45rem;
		color: var(--copper-dark);
		font-size: 0.66rem;
		font-weight: 760;
		letter-spacing: 0.13em;
		text-transform: uppercase;
	}
	h1,
	h2,
	h3 {
		margin: 0;
		color: var(--navy);
		font-family: Georgia, 'Times New Roman', serif;
		font-weight: 500;
	}
	h1 {
		max-width: 58rem;
		font-size: clamp(2.2rem, 5vw, 4.2rem);
		letter-spacing: -0.045em;
		line-height: 1;
	}
	h2 {
		font-size: 1.35rem;
	}
	.resource-heading code {
		display: inline-block;
		margin-top: 0.75rem;
		color: var(--muted);
		font-size: 0.72rem;
	}
	.access-state {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		flex: 0 0 auto;
		margin-top: 0.35rem;
		padding: 0.5rem 0.7rem;
		color: #76552a;
		background: #f4e8d4;
		border: 1px solid #e3cfad;
		border-radius: 999px;
		font-size: 0.68rem;
		font-weight: 720;
	}
	.access-state i {
		width: 0.45rem;
		height: 0.45rem;
		background: currentColor;
		border-radius: 50%;
	}
	.access-state.public {
		color: #176760;
		background: #e0f1ed;
		border-color: #b8dcd5;
	}
	.resource-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(16rem, 21rem);
		gap: 1.5rem;
		margin-top: 1.5rem;
	}
	.main-column,
	.relationship-column {
		display: grid;
		align-content: start;
		gap: 1.5rem;
		min-width: 0;
	}
	.panel,
	.media-placeholder,
	.provenance-note,
	.state-card {
		background: rgb(255 253 248 / 94%);
		border: 1px solid var(--line);
		border-radius: 0.7rem;
		box-shadow: 0 3px 16px rgb(17 44 70 / 4%);
	}
	.media-placeholder {
		display: grid;
		grid-template-columns: minmax(12rem, 0.75fr) minmax(15rem, 1fr);
		align-items: center;
		min-height: 18rem;
		overflow: hidden;
	}
	.external-image {
		margin: 0;
		overflow: hidden;
		background: #081b2c;
		border: 1px solid #263f54;
		border-radius: 0.7rem;
		box-shadow: 0 4px 20px rgb(17 44 70 / 12%);
	}
	.external-image img {
		display: block;
		width: 100%;
		max-height: 70vh;
		object-fit: contain;
	}
	.media-placeholder > div:last-child {
		padding: 2rem clamp(1.5rem, 4vw, 3rem);
	}
	.media-placeholder h2 {
		font-size: clamp(1.65rem, 3vw, 2.35rem);
	}
	.media-placeholder p:last-child {
		max-width: 31rem;
		margin: 0.8rem 0 0;
		color: var(--muted);
		line-height: 1.6;
	}
	.image-mark {
		position: relative;
		align-self: stretch;
		min-height: 18rem;
		background:
			linear-gradient(145deg, rgb(17 44 70 / 92%), rgb(35 68 95 / 88%)),
			repeating-linear-gradient(45deg, transparent 0 12px, rgb(255 255 255 / 4%) 12px 13px);
	}
	.image-mark span {
		position: absolute;
		top: 28%;
		right: 22%;
		width: 2.2rem;
		height: 2.2rem;
		background: var(--copper);
		border-radius: 50%;
	}
	.image-mark i,
	.image-mark b {
		position: absolute;
		bottom: 20%;
		width: 55%;
		height: 45%;
		background: #2c7778;
		clip-path: polygon(50% 0, 100% 100%, 0 100%);
	}
	.image-mark i {
		left: 5%;
	}
	.image-mark b {
		right: -5%;
		height: 58%;
		background: #245b68;
	}
	.description,
	.metadata-panel,
	.relationships {
		padding: 1.35rem 1.5rem;
	}
	.description > p:last-child {
		max-width: 62rem;
		margin: 0.85rem 0 0;
		color: var(--ink);
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 1.05rem;
		line-height: 1.75;
	}
	.metadata-panel > header {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--line);
	}
	.metadata-panel > header small {
		color: var(--muted);
		font-size: 0.65rem;
	}
	dl {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		margin: 0;
	}
	dl > div {
		min-width: 0;
		padding: 1rem 1rem 1rem 0;
		border-bottom: 1px solid #ebe7df;
	}
	dl > div:nth-child(even) {
		padding-left: 1rem;
		border-left: 1px solid #ebe7df;
	}
	dt {
		display: grid;
		gap: 0.2rem;
		color: var(--muted);
		font-size: 0.68rem;
		font-weight: 700;
	}
	dt code {
		font-size: 0.57rem;
		font-weight: 400;
		opacity: 0.72;
	}
	dd {
		display: grid;
		gap: 0.3rem;
		min-width: 0;
		margin: 0.5rem 0 0;
		font-size: 0.82rem;
		line-height: 1.45;
		overflow-wrap: anywhere;
	}
	dd span {
		white-space: pre-line;
	}
	dd.boolean span {
		justify-self: start;
		padding: 0.22rem 0.5rem;
		color: #176760;
		background: #e0f1ed;
		border-radius: 999px;
		font-size: 0.68rem;
		font-weight: 720;
	}
	dd.code {
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		font-size: 0.67rem;
	}
	.relationships h2 {
		margin-bottom: 1rem;
	}
	.relationship-list,
	.relationship-group {
		display: grid;
		gap: 0.65rem;
	}
	.relationship-group + .relationship-group {
		margin-top: 0.5rem;
		padding-top: 1rem;
		border-top: 1px solid var(--line);
	}
	.relationship-group h3 {
		font-family: inherit;
		font-size: 0.68rem;
		font-weight: 730;
	}
	.relationship-group a {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.7rem;
		padding: 0.7rem;
		background: #f5f1e9;
		border: 1px solid transparent;
		border-radius: 0.5rem;
		text-decoration: none;
	}
	.relationship-group a:hover {
		background: var(--paper);
		border-color: var(--teal);
	}
	.relationship-group a > i {
		display: grid;
		place-items: center;
		width: 2.35rem;
		height: 2.35rem;
		color: white;
		background: var(--navy-soft);
		border-radius: 0.38rem;
		font-family: Georgia, serif;
		font-style: normal;
	}
	.relationship-group a > span {
		display: grid;
		min-width: 0;
	}
	.relationship-group small,
	.relationship-group code {
		overflow: hidden;
		color: var(--muted);
		font-size: 0.58rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.relationship-group strong {
		overflow: hidden;
		font-family: Georgia, serif;
		font-size: 0.88rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.relationship-group a > b {
		color: var(--teal);
	}
	.provenance-note {
		display: flex;
		gap: 0.8rem;
		padding: 1rem;
		background: var(--navy);
		border-color: var(--navy);
	}
	.provenance-note > span {
		color: var(--teal);
		font-size: 1.35rem;
	}
	.provenance-note .kicker {
		color: #d59a77;
	}
	.provenance-note h2 {
		color: white;
		font-size: 1rem;
	}
	.provenance-note p:last-child {
		margin: 0.55rem 0 0;
		color: #c7d3dc;
		font-size: 0.72rem;
		line-height: 1.5;
	}
	.empty-note {
		margin: 0.75rem 0 0;
		color: var(--muted);
		font-size: 0.78rem;
		line-height: 1.5;
	}
	.state-card {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		min-height: 18rem;
		padding: 2rem;
		color: var(--muted);
	}
	.state-card.error {
		justify-content: space-between;
		color: #7f3027;
		background: #fbebe7;
		border-color: #e9c2b7;
	}
	.state-card.error p {
		margin: 0.35rem 0 0;
		font-size: 0.75rem;
	}
	.state-card button {
		padding: 0.55rem 0.75rem;
		color: white;
		background: var(--copper);
		border: 0;
		border-radius: 0.4rem;
		font-size: 0.72rem;
		font-weight: 700;
	}
	.spinner {
		width: 1rem;
		height: 1rem;
		border: 2px solid #c7cfce;
		border-top-color: var(--teal);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	@media (max-width: 900px) {
		.resource-grid {
			grid-template-columns: 1fr;
		}
		.relationship-column {
			grid-template-columns: minmax(0, 1fr) minmax(14rem, 0.6fr);
		}
	}
	@media (max-width: 680px) {
		.resource-heading,
		.metadata-panel > header {
			align-items: flex-start;
			flex-direction: column;
		}
		.media-placeholder {
			grid-template-columns: 1fr;
		}
		.image-mark {
			min-height: 12rem;
		}
		dl {
			grid-template-columns: 1fr;
		}
		dl > div:nth-child(even) {
			padding-left: 0;
			border-left: 0;
		}
		.relationship-column {
			grid-template-columns: 1fr;
		}
	}
</style>
