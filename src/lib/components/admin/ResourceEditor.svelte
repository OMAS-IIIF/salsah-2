<script lang="ts">
	import PublicationPanel from './PublicationPanel.svelte';
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { getLocale } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages';
	import CompactMediaPreview from '$lib/components/media/CompactMediaPreview.svelte';
	import { projectAdministrationPath, projectResourcePath } from '$lib/projects/context';
	import { localizedText } from '$lib/resources/model';
	import type {
		MediaDelivery,
		OldapResourceRecord,
		OldapResourceSearchHit
	} from '$lib/resources/types';
	import { loadResourceEditorContext, updateResource } from '$lib/resourceEditor/client';
	import {
		resourceEditorDraft,
		type ResourceEditorDefinition,
		type ResourceEditorDraft
	} from '$lib/resourceEditor/model';

	interface Props {
		project: string;
		iri: string;
		initialLanguage?: string;
	}

	let { project, iri, initialLanguage = '' }: Props = $props();
	let record = $state<OldapResourceRecord | null>(null);
	let definition = $state<ResourceEditorDefinition | null>(null);
	let draft = $state<ResourceEditorDraft>({ languages: [], plainValues: {}, relations: {} });
	let relationOptions = $state<Record<string, OldapResourceSearchHit[]>>({});
	let media = $state<MediaDelivery | null>(null);
	let selectedLanguage = $state('');
	let originalDraft = $state('');
	let loading = $state(true);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let saveError = $state<string | null>(null);
	let saved = $state(false);
	let publicationProperty = $state('');
	let reloadGeneration = $state(0);
	let dirty = $derived(JSON.stringify(draft) !== originalDraft);
	let currentLanguageDraft = $derived(
		draft.languages.find(({ language }) => language === selectedLanguage) ?? null
	);
	let invalid = $derived.by(() => {
		if (!definition) return true;
		return definition.fields.some((field) => {
			if (!field.required) return false;
			if (field.datatype === 'rdf:langString') {
				return !draft.languages.some(({ values }) => values[field.iri]?.trim());
			}
			return !draft.plainValues[field.iri]?.trim();
		});
	});
	let title = $derived(
		(currentLanguageDraft?.values['schema:name'] ?? '').trim() ||
			(record ? (localizedText(record['schema:name'], getLocale()) ?? iri) : iri)
	);

	$effect(() => {
		const requestedProject = project;
		const requestedIri = iri;
		const requestedGeneration = reloadGeneration;
		let cancelled = false;
		loading = true;
		error = null;
		saveError = null;
		void loadResourceEditorContext(requestedProject, requestedIri, getLocale())
			.then((context) => {
				if (cancelled || requestedGeneration !== reloadGeneration) return;
				const loadedDraft = resourceEditorDraft(
					context.record,
					context.definition,
					initialLanguage || getLocale()
				);
				const requestedLanguage = initialLanguage.trim().toLowerCase();
				record = context.record;
				definition = context.definition;
				draft = loadedDraft;
				relationOptions = context.relationOptions;
				media = context.media;
				selectedLanguage =
					loadedDraft.languages.find(({ language }) => language === requestedLanguage)?.language ??
					loadedDraft.languages.find(({ language }) => language === getLocale().toLowerCase())
						?.language ??
					loadedDraft.languages[0]?.language ??
					getLocale().toLowerCase();
				originalDraft = JSON.stringify(loadedDraft);
			})
			.catch((reason: unknown) => {
				if (!cancelled)
					error = reason instanceof Error ? reason.message : m.admin_resource_editor_load_error();
			})
			.finally(() => {
				if (!cancelled) loading = false;
			});
		return () => {
			cancelled = true;
		};
	});

	function updateLocalizedValue(propertyIri: string, value: string): void {
		draft = {
			...draft,
			languages: draft.languages.map((languageDraft) =>
				languageDraft.language === selectedLanguage
					? { ...languageDraft, values: { ...languageDraft.values, [propertyIri]: value } }
					: languageDraft
			)
		};
		markChanged();
	}

	function updatePlainValue(propertyIri: string, value: string): void {
		draft = { ...draft, plainValues: { ...draft.plainValues, [propertyIri]: value } };
		markChanged();
	}

	function updateRelation(
		propertyIri: string,
		allowsMultiple: boolean,
		target: HTMLSelectElement
	): void {
		const values = allowsMultiple
			? [...target.selectedOptions].map(({ value }) => value)
			: target.value
				? [target.value]
				: [];
		draft = { ...draft, relations: { ...draft.relations, [propertyIri]: values } };
		markChanged();
	}

	function markChanged(): void {
		saved = false;
		saveError = null;
	}

	function reset(): void {
		draft = JSON.parse(originalDraft) as ResourceEditorDraft;
		saved = false;
		saveError = null;
	}

	async function save(): Promise<void> {
		if (!definition || !dirty || invalid || saving) return;
		saving = true;
		saved = false;
		saveError = null;
		try {
			const verified = await updateResource(project, iri, definition, draft);
			const verifiedDraft = resourceEditorDraft(verified, definition, selectedLanguage);
			record = verified;
			draft = verifiedDraft;
			originalDraft = JSON.stringify(verifiedDraft);
			saved = true;
		} catch (reason: unknown) {
			saveError = reason instanceof Error ? reason.message : m.admin_resource_editor_save_error();
		} finally {
			saving = false;
		}
	}

	function optionTitle(option: OldapResourceSearchHit): string {
		return localizedText(option['schema:name'], getLocale()) ?? option.iri;
	}

	function optionsFor(propertyIri: string): OldapResourceSearchHit[] {
		const options = relationOptions[propertyIri] ?? [];
		const known = new Set(options.map(({ iri: optionIri }) => optionIri));
		return [
			...options,
			...(draft.relations[propertyIri] ?? [])
				.filter((optionIri) => !known.has(optionIri))
				.map((optionIri) => ({ iri: optionIri, resclass: 'oldap:Thing' }))
		];
	}

	function confirmNavigation(event: MouseEvent): void {
		if (!dirty || window.confirm(m.admin_resource_editor_discard_confirm())) return;
		event.preventDefault();
	}

	function protectBrowserNavigation(event: BeforeUnloadEvent): void {
		if (dirty) event.preventDefault();
	}
</script>

<svelte:window onbeforeunload={protectBrowserNavigation} />
<svelte:head><title>{title} · SALSAH 2.0</title></svelte:head>

<div class="editor-page">
	<a
		class="back"
		href={resolve(projectAdministrationPath(project, 'resources') as Pathname)}
		onclick={confirmNavigation}>← {m.admin_resources_back()}</a
	>

	{#if loading}
		<div class="state" role="status">{m.admin_resource_editor_loading()}</div>
	{:else if error}
		<div class="state error" role="alert">
			<span>{error}</span><button type="button" onclick={() => (reloadGeneration += 1)}
				>{m.resource_retry()}</button
			>
		</div>
	{:else if record && definition}
		<header>
			<div class="resource-heading">
				{#if media}<CompactMediaPreview {media} {title} size="7rem" />{/if}
				<div>
					<p>{m.admin_resource_editor_kicker()}</p>
					<h1>{title}</h1>
					<span>{definition.classLabel}</span>
					<code>{iri}</code>
				</div>
			</div>
			<a href={resolve(projectResourcePath(project, iri) as Pathname)} onclick={confirmNavigation}
				>{m.admin_resource_editor_view()} ↗</a
			>
		</header>

		<section class="toolbar" aria-label={m.admin_resource_editor_tools()}>
			{#if draft.languages.length}
				<label>
					<span>{m.admin_resource_editor_language()}</span>
					<select bind:value={selectedLanguage}>
						{#each draft.languages as languageDraft (languageDraft.language)}
							<option value={languageDraft.language}>{languageDraft.language.toUpperCase()}</option>
						{/each}
					</select>
				</label>
			{/if}
			<div>
				{#if saved}<span class="saved" role="status">✓ {m.admin_resource_editor_saved()}</span>{/if}
				<button type="button" class="secondary" disabled={!dirty || saving} onclick={reset}
					>{m.admin_resource_editor_reset()}</button
				>
				<button type="button" disabled={!dirty || invalid || saving} onclick={save}>
					{saving ? m.admin_resource_editor_saving() : m.admin_resource_editor_save()}
				</button>
			</div>
		</section>

		{#if invalid}<p class="validation">{m.admin_resource_editor_required()}</p>{/if}
		{#if saveError}<p class="validation" role="alert">{saveError}</p>{/if}

		<section class="panel">
			<header>
				<div>
					<h2>{m.admin_resource_editor_text_fields()}</h2>
					<p>{m.admin_resource_editor_text_intro()}</p>
				</div>
				{#if selectedLanguage}<span>{selectedLanguage.toUpperCase()}</span>{/if}
			</header>
			<div class="fields">
				{#each definition.fields as field (field.iri)}
					<label class:wide={field.iri === 'schema:description'}>
						<span>{field.label}{field.required ? ' *' : ''}</span>
						{#if field.description}<small>{field.description}</small>{/if}
						{#if field.datatype === 'rdf:langString'}
							{#if field.iri === 'schema:description'}
								<textarea
									value={currentLanguageDraft?.values[field.iri] ?? ''}
									oninput={(event) => updateLocalizedValue(field.iri, event.currentTarget.value)}
								></textarea>
							{:else}
								<input
									value={currentLanguageDraft?.values[field.iri] ?? ''}
									oninput={(event) => updateLocalizedValue(field.iri, event.currentTarget.value)}
								/>
							{/if}
						{:else}
							<input
								value={draft.plainValues[field.iri] ?? ''}
								oninput={(event) => updatePlainValue(field.iri, event.currentTarget.value)}
							/>
						{/if}
					</label>
				{/each}
			</div>
		</section>

		{#if definition.relations.length}
			<section class="panel">
				<header>
					<div>
						<h2>{m.admin_resource_editor_relations()}</h2>
						<p>{m.admin_resource_editor_relations_intro()}</p>
					</div>
				</header>
				<div class="fields">
					{#each definition.relations.filter((relation) => relation.iri !== publicationProperty) as relation (relation.iri)}
						<label>
							<span>{relation.label}</span>
							{#if relation.description}<small>{relation.description}</small>{/if}
							<select
								multiple={relation.allowsMultiple}
								size={relation.allowsMultiple
									? Math.min(5, Math.max(2, optionsFor(relation.iri).length))
									: 1}
								onchange={(event) =>
									updateRelation(relation.iri, relation.allowsMultiple, event.currentTarget)}
							>
								{#if !relation.allowsMultiple}<option value="">—</option>{/if}
								{#each optionsFor(relation.iri) as option (option.iri)}
									<option
										value={option.iri}
										selected={(draft.relations[relation.iri] ?? []).includes(option.iri)}
										>{optionTitle(option)}</option
									>
								{/each}
							</select>
							{#if relation.allowsMultiple}
								<small>{m.admin_resource_editor_multi_hint()}</small>
							{/if}
						</label>
					{/each}
				</div>
			</section>
		{/if}

		<p class="scope-note">{m.admin_resource_editor_scope_note()}</p>
	{/if}
</div>

{#if record && definition}
	<PublicationPanel
		{project}
		{iri}
		disabled={dirty || saving || loading}
		onpolicy={(property) => {
			publicationProperty = property;
		}}
		onpublished={() => {
			reloadGeneration += 1;
		}}
	/>
{/if}

<style>
	.editor-page {
		max-width: 82rem;
		margin: auto;
		padding: 1.5rem clamp(1rem, 3vw, 3rem) 4rem;
	}
	.back {
		color: var(--muted);
		font-size: 0.72rem;
		font-weight: 680;
		text-decoration: none;
	}
	.editor-page > header {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 2rem;
		margin: 1.3rem 0;
	}
	.editor-page > header p {
		margin: 0 0 0.4rem;
		color: var(--copper-dark);
		font-size: 0.66rem;
		font-weight: 760;
		letter-spacing: 0.13em;
		text-transform: uppercase;
	}
	h1,
	h2 {
		margin: 0;
		color: var(--navy);
		font-family: Georgia, serif;
		font-weight: 500;
	}
	h1 {
		font-size: clamp(2rem, 4vw, 3.5rem);
		letter-spacing: -0.04em;
		line-height: 1.05;
	}
	.editor-page > header span {
		display: block;
		margin-top: 0.3rem;
		color: var(--copper-dark);
		font-size: 0.7rem;
		font-weight: 700;
	}
	.editor-page > header code {
		display: block;
		margin-top: 0.45rem;
		color: var(--muted);
		font-size: 0.63rem;
	}
	.editor-page > header a {
		color: var(--teal);
		font-size: 0.74rem;
		font-weight: 700;
		text-decoration: none;
	}
	.resource-heading {
		display: flex;
		align-items: center;
		gap: 1.1rem;
		min-width: 0;
	}
	.toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
		padding: 0.75rem 0.9rem;
		background: rgb(255 253 248 / 94%);
		border: 1px solid var(--line);
		border-radius: 0.6rem;
	}
	.toolbar label,
	.toolbar > div {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}
	.toolbar label {
		color: var(--muted);
		font-size: 0.7rem;
		font-weight: 700;
	}
	button {
		padding: 0.55rem 0.85rem;
		color: white;
		background: var(--copper);
		border: 0;
		border-radius: 0.42rem;
		font-weight: 720;
	}
	button.secondary {
		color: var(--navy);
		background: white;
		border: 1px solid var(--line);
	}
	button:disabled {
		opacity: 0.45;
	}
	.saved {
		color: var(--teal);
		font-size: 0.7rem;
		font-weight: 720;
	}
	.panel {
		margin-bottom: 1rem;
		padding: 1rem;
		background: rgb(255 253 248 / 94%);
		border: 1px solid var(--line);
		border-radius: 0.65rem;
	}
	.panel > header {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.9rem;
	}
	.panel h2 {
		font-family: inherit;
		font-size: 0.86rem;
		font-weight: 740;
	}
	.panel header p {
		margin: 0.25rem 0 0;
		color: var(--muted);
		font-size: 0.68rem;
		line-height: 1.45;
	}
	.panel header > span {
		padding: 0.22rem 0.42rem;
		color: var(--teal);
		background: #e8f4f1;
		border-radius: 0.3rem;
		font-size: 0.62rem;
		font-weight: 760;
	}
	.fields {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.9rem 1rem;
	}
	.fields label {
		display: grid;
		align-content: start;
		gap: 0.35rem;
	}
	.fields label.wide {
		grid-column: 1 / -1;
	}
	.fields label > span {
		color: var(--navy);
		font-size: 0.68rem;
		font-weight: 720;
	}
	.fields small {
		color: var(--muted);
		font-size: 0.62rem;
		line-height: 1.4;
	}
	input,
	textarea,
	select {
		width: 100%;
		box-sizing: border-box;
		padding: 0.62rem 0.7rem;
		color: var(--navy);
		background: white;
		border: 1px solid var(--line);
		border-radius: 0.42rem;
		font: inherit;
		font-size: 0.78rem;
	}
	textarea {
		min-height: 8rem;
		resize: vertical;
		line-height: 1.5;
	}
	select[multiple] {
		min-height: 5rem;
	}
	input:focus,
	textarea:focus,
	select:focus {
		border-color: var(--teal);
		outline: 2px solid rgb(25 148 143 / 15%);
	}
	.validation {
		padding: 0.7rem 0.85rem;
		color: #8a4b27;
		background: #fff2e9;
		border: 1px solid #e8c5ad;
		border-radius: 0.5rem;
		font-size: 0.7rem;
	}
	.scope-note {
		margin: 1rem 0 0;
		color: var(--muted);
		font-size: 0.66rem;
		line-height: 1.5;
	}
	.state {
		margin-top: 1.5rem;
		padding: 1.3rem;
		color: var(--muted);
		background: rgb(255 253 248 / 94%);
		border: 1px solid var(--line);
		border-radius: 0.65rem;
	}
	.state.error {
		display: flex;
		align-items: center;
		justify-content: space-between;
		color: #8a4b27;
	}
	@media (max-width: 48rem) {
		.editor-page > header,
		.toolbar {
			align-items: flex-start;
			flex-direction: column;
		}
		.fields {
			grid-template-columns: 1fr;
		}
		.fields label.wide {
			grid-column: auto;
		}
		.toolbar > div {
			width: 100%;
			flex-wrap: wrap;
		}
	}
</style>
