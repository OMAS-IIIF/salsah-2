<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { tick } from 'svelte';
	import StoryAssetPicker from '$lib/components/admin/StoryAssetPicker.svelte';
	import StoryBody from '$lib/components/stories/StoryBody.svelte';
	import { getLocale } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages';
	import { projectAdministrationPath, projectResourcePath } from '$lib/projects/context';
	import { localizedText, valuesOf } from '$lib/resources/model';
	import type {
		OldapResourceRecord,
		OldapResourceSearchHit,
		ResourceCard
	} from '$lib/resources/types';
	import { loadStoryEditorContext, updateStory } from '$lib/stories/client';
	import { insertStoryAsset } from '$lib/stories/markdown';
	import {
		hasInvalidStoryAsset,
		storyEditorDrafts,
		type StoryEditorLanguageDraft
	} from '$lib/stories/model';

	interface Props {
		project: string;
		iri: string;
		initialLanguage?: string;
	}

	let { project, iri, initialLanguage = '' }: Props = $props();
	let record = $state<OldapResourceRecord | null>(null);
	let drafts = $state<StoryEditorLanguageDraft[]>([]);
	let authors = $state<OldapResourceSearchHit[]>([]);
	let authorIri = $state('');
	let originalEditor = $state('{"drafts":[],"authorIri":""}');
	let selectedLanguage = $state('');
	let loading = $state(true);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let saveError = $state<string | null>(null);
	let saved = $state(false);
	let reloadGeneration = $state(0);
	let markdownTextarea = $state<HTMLTextAreaElement>();
	let assetPickerOpen = $state(false);
	let insertionSelection = $state({ start: 0, end: 0 });
	let currentDraft = $derived(drafts.find(({ language }) => language === selectedLanguage) ?? null);
	let currentMarkdown = $derived(currentDraft?.markdown ?? '');
	let dirty = $derived(editorSnapshot(drafts, authorIri) !== originalEditor);
	let invalidAsset = $derived(hasInvalidStoryAsset(drafts));
	let invalidMetadata = $derived(
		!authorIri || !drafts.some(({ title: draftTitle }) => draftTitle.trim())
	);
	let title = $derived(
		currentDraft?.title.trim() ||
			(record
				? (localizedText(record['schema:name'], getLocale()) ?? m.story_asset_untitled())
				: '')
	);

	function editorSnapshot(
		editorDrafts: StoryEditorLanguageDraft[],
		selectedAuthor: string
	): string {
		return JSON.stringify({ drafts: editorDrafts, authorIri: selectedAuthor });
	}

	$effect(() => {
		const requestedProject = project;
		const requestedIri = iri;
		const requestedGeneration = reloadGeneration;
		let cancelled = false;
		loading = true;
		error = null;
		saveError = null;
		void loadStoryEditorContext(requestedProject, requestedIri)
			.then((context) => {
				if (cancelled || requestedGeneration !== reloadGeneration) return;
				const requestedLanguage = initialLanguage.trim().toLowerCase();
				const editorDrafts = storyEditorDrafts(
					context.record,
					requestedLanguage || getLocale().toLowerCase()
				);
				const loadedAuthor = valuesOf(context.record['schema:author']).find(
					(value): value is string => typeof value === 'string'
				);
				record = context.record;
				drafts = editorDrafts;
				authors = context.authors;
				authorIri = loadedAuthor ?? '';
				originalEditor = editorSnapshot(editorDrafts, authorIri);
				const locale = getLocale().toLowerCase();
				selectedLanguage =
					editorDrafts.find(({ language }) => language === requestedLanguage)?.language ??
					editorDrafts.find(({ language }) => language === locale)?.language ??
					editorDrafts.find(({ language }) => language === 'en')?.language ??
					editorDrafts[0].language;
			})
			.catch((reason: unknown) => {
				if (!cancelled)
					error = reason instanceof Error ? reason.message : m.admin_story_load_error();
			})
			.finally(() => {
				if (!cancelled) loading = false;
			});

		return () => {
			cancelled = true;
		};
	});

	function updateCurrentMarkdown(value: string): void {
		updateCurrentField('markdown', value);
	}

	function updateCurrentField(field: 'title' | 'summary' | 'markdown', value: string): void {
		drafts = drafts.map((draft) =>
			draft.language === selectedLanguage ? { ...draft, [field]: value } : draft
		);
		saved = false;
		saveError = null;
	}

	function markAuthorChanged(): void {
		saved = false;
		saveError = null;
	}

	function reset(): void {
		const original = JSON.parse(originalEditor) as {
			drafts: StoryEditorLanguageDraft[];
			authorIri: string;
		};
		drafts = original.drafts;
		authorIri = original.authorIri;
		saved = false;
		saveError = null;
	}

	async function save(): Promise<void> {
		if (!dirty || invalidAsset || invalidMetadata || saving) return;
		saving = true;
		saveError = null;
		saved = false;
		try {
			const verified = await updateStory(project, iri, drafts, authorIri);
			const verifiedDrafts = storyEditorDrafts(verified, selectedLanguage);
			const verifiedAuthor = valuesOf(verified['schema:author']).find(
				(value): value is string => typeof value === 'string'
			);
			record = verified;
			drafts = verifiedDrafts;
			authorIri = verifiedAuthor ?? '';
			originalEditor = editorSnapshot(verifiedDrafts, authorIri);
			saved = true;
		} catch (reason: unknown) {
			saveError = reason instanceof Error ? reason.message : m.admin_story_save_error();
		} finally {
			saving = false;
		}
	}

	function confirmNavigation(event: MouseEvent): void {
		if (!dirty || window.confirm(m.admin_story_discard_confirm())) return;
		event.preventDefault();
	}

	function protectBrowserNavigation(event: BeforeUnloadEvent): void {
		if (!dirty) return;
		event.preventDefault();
	}

	function openAssetPicker(): void {
		insertionSelection = {
			start: markdownTextarea?.selectionStart ?? currentMarkdown.length,
			end: markdownTextarea?.selectionEnd ?? currentMarkdown.length
		};
		assetPickerOpen = true;
	}

	async function insertAsset(card: ResourceCard): Promise<void> {
		const insertion = insertStoryAsset(
			currentMarkdown,
			card.resource.iri,
			insertionSelection.start,
			insertionSelection.end
		);
		updateCurrentMarkdown(insertion.markdown);
		assetPickerOpen = false;
		await tick();
		markdownTextarea?.focus();
		markdownTextarea?.setSelectionRange(insertion.cursor, insertion.cursor);
	}

	function authorTitle(author: OldapResourceSearchHit): string {
		return localizedText(author['schema:name'], getLocale()) ?? author.iri;
	}
</script>

<svelte:window onbeforeunload={protectBrowserNavigation} />

<svelte:head><title>{title || m.admin_story_editor_title()} · SALSAH 2.0</title></svelte:head>

<div class="editor-page">
	<a
		class="back"
		href={resolve(projectAdministrationPath(project, 'stories') as Pathname)}
		onclick={confirmNavigation}>← {m.admin_story_back()}</a
	>

	{#if loading}
		<div class="state" role="status">{m.admin_story_loading()}</div>
	{:else if error}
		<div class="state error" role="alert">
			<span>{error}</span><button type="button" onclick={() => (reloadGeneration += 1)}
				>{m.resource_retry()}</button
			>
		</div>
	{:else if record}
		<header>
			<div>
				<p>{m.admin_story_editor_kicker()}</p>
				<h1>{title}</h1>
				<code>{iri}</code>
			</div>
			<a href={resolve(projectResourcePath(project, iri) as Pathname)} onclick={confirmNavigation}
				>{m.admin_story_view()} ↗</a
			>
		</header>

		<section class="editor-toolbar" aria-label={m.admin_story_editor_tools()}>
			<label>
				<span>{m.admin_story_language()}</span>
				<select bind:value={selectedLanguage}>
					{#each drafts as draft (draft.language)}
						<option value={draft.language}>{draft.language.toUpperCase()}</option>
					{/each}
				</select>
			</label>
			<div class="toolbar-actions">
				<button type="button" class="asset-button" onclick={openAssetPicker}
					>＋ {m.asset_picker_open()}</button
				>
				{#if saved}<span class="saved" role="status">✓ {m.admin_story_saved()}</span>{/if}
				<button type="button" class="secondary" disabled={!dirty || saving} onclick={reset}
					>{m.admin_story_reset()}</button
				>
				<button
					type="button"
					disabled={!dirty || invalidAsset || invalidMetadata || saving}
					onclick={save}
				>
					{saving ? m.admin_story_saving() : m.admin_story_save()}
				</button>
			</div>
		</section>

		<section class="metadata-panel" aria-labelledby="story-metadata-heading">
			<header>
				<div>
					<h2 id="story-metadata-heading">{m.admin_story_metadata()}</h2>
					<p>{m.admin_story_metadata_intro()}</p>
				</div>
				<span>{selectedLanguage.toUpperCase()}</span>
			</header>
			<div class="metadata-grid">
				<label>
					<span>{m.admin_story_metadata_title()}</span>
					<input
						value={currentDraft?.title ?? ''}
						oninput={(event) => updateCurrentField('title', event.currentTarget.value)}
						maxlength="500"
					/>
				</label>
				<label>
					<span>{m.admin_story_metadata_author()}</span>
					<select bind:value={authorIri} onchange={markAuthorChanged}>
						{#if authorIri && !authors.some((author) => author.iri === authorIri)}
							<option value={authorIri}>{authorIri}</option>
						{/if}
						{#each authors as author (author.iri)}
							<option value={author.iri}>{authorTitle(author)}</option>
						{/each}
					</select>
				</label>
				<label class="summary-field">
					<span>{m.admin_story_metadata_summary()}</span>
					<textarea
						class="summary-input"
						value={currentDraft?.summary ?? ''}
						oninput={(event) => updateCurrentField('summary', event.currentTarget.value)}
					></textarea>
				</label>
			</div>
		</section>

		{#if invalidMetadata}
			<p class="validation" role="alert">{m.admin_story_metadata_required()}</p>
		{/if}
		{#if invalidAsset}
			<p class="validation" role="alert">{m.admin_story_invalid_asset()}</p>
		{/if}
		{#if saveError}<p class="validation" role="alert">{saveError}</p>{/if}

		<div class="editor-grid">
			<section class="source-panel">
				<header>
					<h2>{m.admin_story_markdown()}</h2>
					<small>{m.admin_story_plain_text()}</small>
				</header>
				<textarea
					class="markdown-input"
					bind:this={markdownTextarea}
					value={currentMarkdown}
					oninput={(event) => updateCurrentMarkdown(event.currentTarget.value)}
					spellcheck="true"
					aria-label={m.admin_story_markdown()}></textarea>
			</section>

			<section class="preview-panel">
				<header>
					<h2>{m.admin_story_preview()}</h2>
					<small>{m.admin_story_preview_live()}</small>
				</header>
				{#if currentMarkdown}
					<StoryBody {project} markdown={currentMarkdown} />
				{:else}
					<p class="empty-preview">{m.admin_story_empty_language()}</p>
				{/if}
			</section>
		</div>
	{/if}
</div>

{#if assetPickerOpen}
	<StoryAssetPicker {project} onselect={insertAsset} onclose={() => (assetPickerOpen = false)} />
{/if}

<style>
	.editor-page {
		max-width: 110rem;
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
		margin: 1.25rem 0 1.2rem;
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
	.editor-page > header code {
		display: block;
		margin-top: 0.5rem;
		color: var(--muted);
		font-size: 0.65rem;
	}
	.editor-page > header a {
		color: var(--teal);
		font-size: 0.74rem;
		font-weight: 700;
		text-decoration: none;
	}
	.editor-toolbar {
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
	.editor-toolbar label {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		color: var(--muted);
		font-size: 0.7rem;
		font-weight: 700;
	}
	select {
		padding: 0.42rem 1.8rem 0.42rem 0.55rem;
		color: var(--navy);
		background: white;
		border: 1px solid var(--line);
		border-radius: 0.4rem;
	}
	.metadata-panel {
		margin-bottom: 1rem;
		padding: 1rem;
		background: rgb(255 253 248 / 94%);
		border: 1px solid var(--line);
		border-radius: 0.65rem;
	}
	.metadata-panel > header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.9rem;
	}
	.metadata-panel h2 {
		font-family: inherit;
		font-size: 0.84rem;
		font-weight: 740;
	}
	.metadata-panel header p {
		margin: 0.25rem 0 0;
		color: var(--muted);
		font-size: 0.68rem;
		line-height: 1.45;
	}
	.metadata-panel header > span {
		padding: 0.22rem 0.42rem;
		color: var(--teal);
		background: #e8f4f1;
		border-radius: 0.3rem;
		font-size: 0.62rem;
		font-weight: 760;
	}
	.metadata-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(14rem, 0.45fr);
		gap: 0.85rem 1rem;
	}
	.metadata-grid label {
		display: grid;
		gap: 0.35rem;
	}
	.metadata-grid label > span {
		color: var(--navy);
		font-size: 0.67rem;
		font-weight: 720;
	}
	.metadata-grid input,
	.metadata-grid select,
	.summary-input {
		width: 100%;
		min-height: 2.55rem;
		padding: 0.58rem 0.7rem;
		color: var(--navy);
		background: white;
		border: 1px solid #cbd1d3;
		border-radius: 0.42rem;
		font: inherit;
	}
	.metadata-grid input:focus,
	.metadata-grid select:focus,
	.summary-input:focus {
		border-color: var(--teal);
		outline: 2px solid rgb(23 145 139 / 18%);
	}
	.summary-field {
		grid-column: 1 / -1;
	}
	.summary-input {
		min-height: 4.6rem;
		resize: vertical;
		line-height: 1.5;
	}
	.toolbar-actions {
		display: flex;
		align-items: center;
		gap: 0.55rem;
	}
	button {
		padding: 0.55rem 0.85rem;
		color: white;
		background: var(--copper);
		border: 1px solid var(--copper);
		border-radius: 0.42rem;
		font-size: 0.7rem;
		font-weight: 720;
		cursor: pointer;
	}
	button.secondary {
		color: var(--navy);
		background: transparent;
		border-color: var(--line);
	}
	button.asset-button {
		color: var(--teal);
		background: #e8f4f1;
		border-color: #badbd4;
	}
	button:disabled {
		cursor: default;
		opacity: 0.45;
	}
	.saved {
		color: var(--teal);
		font-size: 0.7rem;
		font-weight: 700;
	}
	.editor-grid {
		display: grid;
		grid-template-columns: minmax(22rem, 0.9fr) minmax(28rem, 1.1fr);
		gap: 1rem;
		align-items: start;
	}
	.source-panel,
	.preview-panel {
		min-width: 0;
		background: rgb(255 253 248 / 94%);
		border: 1px solid var(--line);
		border-radius: 0.65rem;
		overflow: hidden;
	}
	.source-panel > header,
	.preview-panel > header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.85rem 1rem;
		border-bottom: 1px solid var(--line);
	}
	.source-panel h2,
	.preview-panel h2 {
		font-family: inherit;
		font-size: 0.78rem;
		font-weight: 740;
	}
	.source-panel small,
	.preview-panel small {
		color: var(--muted);
		font-size: 0.62rem;
	}
	.markdown-input {
		display: block;
		width: 100%;
		min-height: 67vh;
		padding: 1rem;
		resize: vertical;
		color: #21384d;
		background: #f8f5ee;
		border: 0;
		outline: 0;
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		font-size: 0.78rem;
		line-height: 1.65;
	}
	.markdown-input:focus {
		box-shadow: inset 0 0 0 2px var(--teal);
	}
	.preview-panel :global(.story-body) {
		border: 0;
		border-radius: 0;
		box-shadow: none;
	}
	.validation,
	.state,
	.empty-preview {
		padding: 0.85rem 1rem;
		color: #8a4b27;
		background: #fbefe6;
		border: 1px solid #d6a984;
		border-radius: 0.5rem;
		font-size: 0.75rem;
	}
	.validation {
		margin: 0 0 1rem;
	}
	.state {
		margin-top: 1.5rem;
	}
	.state.error {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.empty-preview {
		margin: 1rem;
		color: var(--muted);
		background: #f5f1e9;
		border-color: var(--line);
	}
	@media (max-width: 70rem) {
		.editor-grid {
			grid-template-columns: 1fr;
		}
		.markdown-input {
			min-height: 28rem;
		}
	}
	@media (max-width: 42rem) {
		.editor-page > header,
		.editor-toolbar {
			align-items: flex-start;
			flex-direction: column;
		}
		.toolbar-actions {
			align-self: stretch;
			justify-content: flex-end;
		}
		.metadata-grid {
			grid-template-columns: 1fr;
		}
		.summary-field {
			grid-column: auto;
		}
	}
</style>
