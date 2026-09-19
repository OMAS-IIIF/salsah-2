<script lang="ts">
	import { structureCapabilities } from '$lib/archive/client';
	import { loadRepositoryMedia, writableDraft } from '$lib/staging/repository';
	import PrivateFolderActions from './PrivateFolderActions.svelte';
	import ReferenceMove from './ReferenceMove.svelte';
	import FolderExport from './FolderExport.svelte';
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import { mediaPreviewUrl, mediaThumbnailUrl } from '$lib/media/capability';
	import { m } from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import { projectAdministrationPath, projectResourcePath } from '$lib/projects/context';
	import { fallbackLabel, localizedText } from '$lib/resources/model';
	import StagingBatchCatalogue from './StagingBatchCatalogue.svelte';
	import StagingCatalogueForm from './StagingCatalogueForm.svelte';
	import StagingZipUpload from './StagingZipUpload.svelte';
	import type { CatalogueResult, CatalogueTarget } from '$lib/staging/catalogue';
	import type { BatchCatalogueReport } from '$lib/staging/batchCatalogue';
	import {
		searchStagingAreas,
		searchStagingFolders,
		searchStagingMediaObjects
	} from '$lib/staging/client';
	import { discardStagingMediaObject } from '$lib/staging/discard';
	import { StagingUploadError, uploadStagingImage } from '$lib/staging/upload';
	import {
		listZipImportJobs,
		type ZipImportJob,
		type ZipImportState
	} from '$lib/staging/zipImport';
	import type {
		StagingAreaSummary,
		StagingFolderNode,
		StagingMediaObjectNode
	} from '$lib/staging/types';

	interface Props {
		project: string;
	}
	type VisibleEntry =
		| { kind: 'folder'; folder: StagingFolderNode; depth: number }
		| { kind: 'media'; media: StagingMediaObjectNode; depth: number };

	let { project }: Props = $props();
	let movingReference = $state<StagingMediaObjectNode | null>(null);
	let folderActionError = $state('');
	/** Capabilities are fetched before content; an unavailable server never selects legacy writes. */
	async function loadMedia(project: string, areaIri: string, folderIri: string) {
		const access = await structureCapabilities(project);
		return access.enabled
			? loadRepositoryMedia(project, areaIri, folderIri)
			: searchStagingMediaObjects(project, areaIri, folderIri);
	}
	async function reloadMixedFolder(media: StagingMediaObjectNode) {
		try {
			const requestedProject = project;
			const generation = reloadGeneration;
			const items = await loadMedia(requestedProject, media.areaIri, media.folderIri);
			if (
				project !== requestedProject ||
				media.areaIri !== selectedAreaIri ||
				generation !== reloadGeneration
			)
				return;
			mediaByFolder.set(media.folderIri, items);
		} catch (e) {
			mediaByFolder.delete(media.folderIri);
			childErrors.add(media.folderIri);
			folderActionError = String(e);
		}
	}

	let areas = $state<StagingAreaSummary[]>([]);
	let selectedAreaIri = $state<string | null>(null);
	let roots = $state<StagingFolderNode[]>([]);
	let children = new SvelteMap<string, StagingFolderNode[]>();
	let mediaByFolder = new SvelteMap<string, StagingMediaObjectNode[]>();
	let expanded = new SvelteSet<string>();
	let loadingChildren = new SvelteSet<string>();
	let childErrors = new SvelteSet<string>();
	let failedThumbnails = new SvelteSet<string>();
	let loadingAreas = $state(true);
	let loadingFolders = $state(false);
	let areasError = $state(false);
	let foldersError = $state(false);
	let reloadGeneration = $state(0);
	let uploadFolder = $state<StagingFolderNode | null>(null);
	let uploadFile = $state<File | null>(null);
	let uploadProgress = $state(0);
	let uploading = $state(false);
	let uploadError = $state<string | null>(null);
	let uploadSuccess = $state<string | null>(null);
	let uploadController: AbortController | null = null;
	let uploadInput = $state<HTMLInputElement>();
	let zipFolder = $state<StagingFolderNode | null>(null);
	let resumedZipJob = $state<ZipImportJob | null>(null);
	let recentZipJobs = $state<ZipImportJob[]>([]);
	let recentZipJobsLoading = $state(true);
	let recentZipJobsError = $state(false);
	let zipBusy = $state(false);
	let reviewedMedia = $state<StagingMediaObjectNode | null>(null);
	let discarding = $state(false);
	let discardError = $state<string | null>(null);
	let catalogueMode = $state(false);
	let catalogueBusy = $state(false);
	let operationNotice = $state<string | null>(null);
	let operationResourceIri = $state<string | null>(null);
	let reviewDialog = $state<HTMLDialogElement>();
	let selectedMediaIris = new SvelteSet<string>();
	let reviewQueueIris = $state<string[]>([]);
	let batchCatalogueMedia = $state<StagingMediaObjectNode[]>([]);
	let batchCatalogueBusy = $state(false);

	let selectedArea = $derived(areas.find((area) => area.iri === selectedAreaIri) ?? null);
	let visibleEntries = $derived.by(() => {
		const result: VisibleEntry[] = [];
		function append(folders: StagingFolderNode[], depth: number): void {
			for (const folder of folders) {
				result.push({ kind: 'folder', folder, depth });
				if (expanded.has(folder.iri)) {
					append(children.get(folder.iri) ?? [], depth + 1);
					for (const media of mediaByFolder.get(folder.iri) ?? []) {
						result.push({ kind: 'media', media, depth: depth + 1 });
					}
				}
			}
		}
		append(roots, 1);
		return result;
	});
	let reviewQueueIndex = $derived(reviewedMedia ? reviewQueueIris.indexOf(reviewedMedia.iri) : -1);

	$effect(() => {
		if (reviewedMedia && reviewDialog && !reviewDialog.open) reviewDialog.showModal();
	});

	$effect(() => {
		const requestedProject = project;
		const generation = reloadGeneration;
		loadingAreas = true;
		areasError = false;
		void searchStagingAreas(requestedProject)
			.then((result) => {
				if (requestedProject !== project || generation !== reloadGeneration) return;
				areas = result.sort((a, b) => areaTitle(a).localeCompare(areaTitle(b), getLocale()));
				selectedAreaIri = areas.some((area) => area.iri === selectedAreaIri)
					? selectedAreaIri
					: (areas[0]?.iri ?? null);
			})
			.catch(() => {
				if (requestedProject === project && generation === reloadGeneration) areasError = true;
			})
			.finally(() => {
				if (requestedProject === project && generation === reloadGeneration) loadingAreas = false;
			});
	});

	$effect(() => {
		const requestedProject = project;
		const generation = reloadGeneration;
		recentZipJobsLoading = true;
		recentZipJobsError = false;
		void listZipImportJobs(100)
			.then((page) => {
				if (requestedProject !== project || generation !== reloadGeneration) return;
				recentZipJobs = page.items
					.filter((job) => job.target.projectShortName === requestedProject)
					.slice(0, 8);
			})
			.catch(() => {
				if (requestedProject === project && generation === reloadGeneration) {
					recentZipJobsError = true;
				}
			})
			.finally(() => {
				if (requestedProject === project && generation === reloadGeneration) {
					recentZipJobsLoading = false;
				}
			});
	});

	$effect(() => {
		const areaIri = selectedAreaIri;
		const requestedProject = project;
		const generation = reloadGeneration;
		roots = [];
		children.clear();
		mediaByFolder.clear();
		expanded.clear();
		loadingChildren.clear();
		childErrors.clear();
		failedThumbnails.clear();
		selectedMediaIris.clear();
		reviewQueueIris = [];
		batchCatalogueMedia = [];
		batchCatalogueBusy = false;
		reviewedMedia = null;
		catalogueMode = false;
		foldersError = false;
		if (!areaIri) {
			loadingFolders = false;
			return;
		}
		loadingFolders = true;
		void searchStagingFolders(requestedProject, areaIri, null)
			.then((result) => {
				if (
					areaIri === selectedAreaIri &&
					requestedProject === project &&
					generation === reloadGeneration
				)
					roots = result;
			})
			.catch(() => {
				if (
					areaIri === selectedAreaIri &&
					requestedProject === project &&
					generation === reloadGeneration
				)
					foldersError = true;
			})
			.finally(() => {
				if (
					areaIri === selectedAreaIri &&
					requestedProject === project &&
					generation === reloadGeneration
				)
					loadingFolders = false;
			});
	});

	function areaTitle(area: StagingAreaSummary): string {
		return localizedText(area.title, getLocale()) ?? fallbackLabel(area.iri);
	}
	function folderTitle(folder: StagingFolderNode): string {
		return localizedText(folder.title, getLocale()) ?? fallbackLabel(folder.iri);
	}
	function mediaTitle(media: StagingMediaObjectNode): string {
		return media.originalName ?? fallbackLabel(media.iri);
	}
	function mediaIcon(media: StagingMediaObjectNode): string {
		return media.mimeType?.startsWith('image/') ? '▧' : '▤';
	}
	function thumbnail(media: StagingMediaObjectNode): string | null {
		return media.mediaDelivery && !failedThumbnails.has(media.iri)
			? mediaThumbnailUrl(media.mediaDelivery)
			: null;
	}
	function preview(media: StagingMediaObjectNode): string | null {
		return media.mediaDelivery ? mediaPreviewUrl(media.mediaDelivery) : null;
	}
	function folderHasContent(folderIri: string): boolean {
		return (children.get(folderIri)?.length ?? 0) + (mediaByFolder.get(folderIri)?.length ?? 0) > 0;
	}
	function folderContentLoaded(folderIri: string): boolean {
		return children.has(folderIri) && mediaByFolder.has(folderIri);
	}
	function quota(value: number | null): string {
		if (value === null) return m.staging_not_specified();
		const units = ['B', 'KB', 'MB', 'GB', 'TB'];
		let amount = value;
		let unit = 0;
		while (amount >= 1024 && unit < units.length - 1) {
			amount /= 1024;
			unit += 1;
		}
		return `${new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 1 }).format(amount)} ${units[unit]}`;
	}
	function zipStateLabel(state: ZipImportState): string {
		return {
			UPLOADING: m.staging_zip_state_uploading(),
			VALIDATING: m.staging_zip_state_validating(),
			READY: m.staging_zip_state_ready(),
			IMPORTING: m.staging_zip_state_importing(),
			IMPORTED: m.staging_zip_state_imported(),
			INVALID: m.staging_zip_state_invalid(),
			FAILED: m.staging_zip_state_failed(),
			CANCELLED: m.staging_zip_state_cancelled(),
			EXPIRED: m.staging_zip_state_expired()
		}[state];
	}
	function zipDate(value: string): string {
		return new Intl.DateTimeFormat(getLocale(), {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(value));
	}
	function updateRecentZipJob(current: ZipImportJob): void {
		recentZipJobs = [current, ...recentZipJobs.filter((job) => job.importId !== current.importId)]
			.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
			.slice(0, 8);
		if (resumedZipJob?.importId === current.importId) resumedZipJob = current;
	}
	function openRecentZipJob(current: ZipImportJob): void {
		if (uploading || zipBusy) return;
		uploadFolder = null;
		zipFolder = null;
		resumedZipJob = current;
	}
	async function toggle(folder: StagingFolderNode): Promise<void> {
		if (expanded.has(folder.iri)) {
			expanded.delete(folder.iri);
			return;
		}
		if (folderContentLoaded(folder.iri)) {
			if (folderHasContent(folder.iri)) expanded.add(folder.iri);
			return;
		}
		if (!selectedAreaIri) return;
		const areaIri = selectedAreaIri;
		const requestedProject = project;
		const generation = reloadGeneration;
		loadingChildren.add(folder.iri);
		childErrors.delete(folder.iri);
		try {
			const [folderResult, mediaResult] = await Promise.all([
				searchStagingFolders(project, selectedAreaIri, folder.iri),
				loadMedia(project, selectedAreaIri, folder.iri)
			]);
			if (
				areaIri !== selectedAreaIri ||
				requestedProject !== project ||
				generation !== reloadGeneration
			)
				return;
			children.set(folder.iri, folderResult);
			mediaByFolder.set(folder.iri, mediaResult);
			if (folderResult.length || mediaResult.length) expanded.add(folder.iri);
		} catch {
			childErrors.add(folder.iri);
		} finally {
			loadingChildren.delete(folder.iri);
		}
	}
	function retry(): void {
		reloadGeneration += 1;
	}
	function mediaByIri(iri: string): StagingMediaObjectNode | null {
		for (const mediaObjects of mediaByFolder.values()) {
			const media = mediaObjects.find((candidate) => candidate.iri === iri);
			if (media) return media;
		}
		return null;
	}
	function toggleMediaSelection(media: StagingMediaObjectNode): void {
		if (!writableDraft(media)) return;
		if (selectedMediaIris.has(media.iri)) selectedMediaIris.delete(media.iri);
		else selectedMediaIris.add(media.iri);
	}
	function clearMediaSelection(): void {
		selectedMediaIris.clear();
		reviewQueueIris = [];
	}
	function reviewSelection(): void {
		const queue = [...selectedMediaIris].filter((iri) => mediaByIri(iri));
		const first = queue.length ? mediaByIri(queue[0]) : null;
		if (!first) return;
		reviewQueueIris = queue;
		review(first, true);
	}
	function startBatchCatalogue(): void {
		const selected = [...selectedMediaIris]
			.map((iri) => mediaByIri(iri))
			.filter((item): item is StagingMediaObjectNode => item !== null && writableDraft(item));
		if (!selected.length) return;
		batchCatalogueMedia = selected;
	}
	function completeBatchItem(media: StagingMediaObjectNode): void {
		if (media.repositoryEntry) void reloadMixedFolder(media);
		mediaByFolder.set(
			media.folderIri,
			(mediaByFolder.get(media.folderIri) ?? []).filter((item) => item.iri !== media.iri)
		);
		selectedMediaIris.delete(media.iri);
		reviewQueueIris = reviewQueueIris.filter((iri) => iri !== media.iri);
	}
	function finishBatchCatalogue(report: BatchCatalogueReport, target: CatalogueTarget): void {
		operationNotice = report.failed
			? m.staging_batch_workspace_partial({ completed: report.completed, total: report.total })
			: batchCatalogueMedia.some((item) => item.repositoryEntry)
				? m.repository_batch_catalogued()
				: m.staging_batch_workspace_success({ count: report.completed, title: target.label });
		operationResourceIri = null;
	}
	function review(media: StagingMediaObjectNode, keepQueue = false): void {
		if (!keepQueue) reviewQueueIris = [];
		reviewedMedia = media;
		discardError = null;
		catalogueMode = false;
		catalogueBusy = false;
		operationNotice = null;
		operationResourceIri = null;
	}
	function navigateReview(offset: number): void {
		if (reviewQueueIndex < 0) return;
		const media = mediaByIri(reviewQueueIris[reviewQueueIndex + offset] ?? '');
		if (!media) return;
		review(media, true);
	}
	function closeReview(): void {
		if (discarding || catalogueBusy) return;
		reviewDialog?.close();
		reviewedMedia = null;
		discardError = null;
		catalogueMode = false;
		reviewQueueIris = [];
	}
	function removeFromSelectionAndQueue(iri: string): StagingMediaObjectNode | null {
		selectedMediaIris.delete(iri);
		const removedIndex = reviewQueueIris.indexOf(iri);
		if (removedIndex < 0) return null;
		reviewQueueIris = reviewQueueIris.filter((candidate) => candidate !== iri);
		const nextIri = reviewQueueIris[Math.min(removedIndex, reviewQueueIris.length - 1)];
		return nextIri ? mediaByIri(nextIri) : null;
	}
	function completeCatalogue(result: CatalogueResult, target: CatalogueTarget): void {
		const media = reviewedMedia;
		if (!media || result.iri !== media.iri) return;
		mediaByFolder.set(
			media.folderIri,
			(mediaByFolder.get(media.folderIri) ?? []).filter((item) => item.iri !== media.iri)
		);
		if (media.repositoryEntry) void reloadMixedFolder(media);
		const nextMedia = removeFromSelectionAndQueue(media.iri);
		reviewedMedia = nextMedia;
		catalogueMode = false;
		operationNotice = media.repositoryEntry
			? m.repository_catalogued()
			: m.staging_catalogue_success({ title: target.label });
		operationResourceIri = result.iri;
	}
	async function discardReviewedMedia(): Promise<void> {
		const media = reviewedMedia;
		if (!media || discarding || media.repositoryEntry?.canDeleteMedia === false) return;
		const title = mediaTitle(media);
		if (!window.confirm(m.staging_discard_confirm({ title }))) return;
		discarding = true;
		discardError = null;
		try {
			const result = await discardStagingMediaObject(media);
			mediaByFolder.set(
				media.folderIri,
				(mediaByFolder.get(media.folderIri) ?? []).filter((item) => item.iri !== media.iri)
			);
			const nextMedia = removeFromSelectionAndQueue(media.iri);
			reviewedMedia = nextMedia;
			operationNotice = result.cleanupPending
				? m.staging_discard_cleanup_pending()
				: m.staging_discard_success({ title });
			operationResourceIri = null;
		} catch (error) {
			discardError = error instanceof Error ? error.message : m.staging_upload_error();
		} finally {
			discarding = false;
		}
	}
	function prepareUpload(folder: StagingFolderNode): void {
		if (zipBusy) return;
		zipFolder = null;
		resumedZipJob = null;
		uploadFolder = folder;
		uploadFile = null;
		uploadProgress = 0;
		uploadError = null;
		uploadSuccess = null;
		queueMicrotask(() => uploadInput?.focus());
	}
	function prepareZipUpload(folder: StagingFolderNode): void {
		if (uploading || zipBusy) return;
		uploadFolder = null;
		resumedZipJob = null;
		zipFolder = folder;
	}
	async function refreshAfterZipImport(area: StagingAreaSummary, folder: StagingFolderNode) {
		const [folderResult, mediaResult] = await Promise.all([
			searchStagingFolders(project, area.iri, folder.iri),
			loadMedia(project, area.iri, folder.iri)
		]);
		if (selectedAreaIri !== area.iri || zipFolder?.iri !== folder.iri) return;
		children.set(folder.iri, folderResult);
		mediaByFolder.set(folder.iri, mediaResult);
		expanded.add(folder.iri);
		operationNotice = m.staging_zip_workspace_refreshed({ folder: folderTitle(folder) });
		operationResourceIri = null;
	}
	async function refreshCurrentZipFolder(): Promise<void> {
		if (!selectedArea || !zipFolder) return;
		await refreshAfterZipImport(selectedArea, zipFolder);
	}
	async function refreshAfterResumedZipImport(): Promise<void> {
		const current = resumedZipJob;
		if (!current) return;
		const folderName = current.target.targetRootFolderName;
		operationNotice = m.staging_zip_workspace_refreshed({ folder: folderName });
		operationResourceIri = null;
		if (
			!selectedArea ||
			fallbackLabel(selectedArea.iri) !== fallbackLabel(current.target.stagingAreaIri)
		) {
			return;
		}
		const visibleFolder = visibleEntries.find(
			(entry) =>
				entry.kind === 'folder' &&
				fallbackLabel(entry.folder.iri) === fallbackLabel(current.target.targetRootFolderIri)
		);
		if (!visibleFolder || visibleFolder.kind !== 'folder') return;
		const [folderResult, mediaResult] = await Promise.all([
			searchStagingFolders(project, selectedArea.iri, visibleFolder.folder.iri),
			loadMedia(project, selectedArea.iri, visibleFolder.folder.iri)
		]);
		children.set(visibleFolder.folder.iri, folderResult);
		mediaByFolder.set(visibleFolder.folder.iri, mediaResult);
		expanded.add(visibleFolder.folder.iri);
	}
	function closeUpload(): void {
		if (uploading) uploadController?.abort();
		uploadFolder = null;
		uploadFile = null;
		uploadError = null;
		uploadSuccess = null;
	}
	async function submitUpload(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		if (!selectedArea || !uploadFolder || !uploadFile || uploading) return;
		const area = selectedArea;
		const folder = uploadFolder;
		uploading = true;
		uploadProgress = 0;
		uploadError = null;
		uploadSuccess = null;
		uploadController = new AbortController();
		try {
			const result = await uploadStagingImage({
				project,
				stagingAreaIri: area.iri,
				stagingFolderIri: folder.iri,
				file: uploadFile,
				quotaBytes: area.quotaBytes,
				onProgress: (value) => (uploadProgress = value),
				signal: uploadController.signal
			});
			const refreshed = await loadMedia(project, area.iri, folder.iri);
			if (!refreshed.some((media) => media.iri === result.iri && media.mediaDelivery !== null)) {
				throw new StagingUploadError(m.staging_upload_readback_error(), 502);
			}
			mediaByFolder.set(folder.iri, refreshed);
			if (!children.has(folder.iri)) children.set(folder.iri, []);
			expanded.add(folder.iri);
			uploadProgress = 100;
			uploadSuccess = m.staging_upload_success({ name: result.originalName });
			uploadFile = null;
			if (uploadInput) uploadInput.value = '';
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') {
				uploadError = m.staging_upload_cancelled();
			} else {
				uploadError = error instanceof Error ? error.message : m.staging_upload_error();
			}
		} finally {
			uploading = false;
			uploadController = null;
		}
	}
</script>

<svelte:head><title>{m.staging_title()} · SALSAH 2.0</title></svelte:head>

<div class="page">
	<a class="back" href={resolve(projectAdministrationPath(project) as Pathname)}
		>← {m.staging_back()}</a
	>
	<header>
		<div>
			<p>{m.staging_kicker()}</p>
			<h1>{m.staging_title()}</h1>
			<span>{m.staging_intro()}</span>
		</div>
		<small>{m.staging_single_upload()}</small>
	</header>

	{#if loadingAreas}
		<div class="state" role="status">{m.staging_loading()}</div>
	{:else if areasError}
		<div class="state error" role="alert">
			<span>{m.staging_error()}</span><button type="button" onclick={retry}
				>{m.resource_retry()}</button
			>
		</div>
	{:else if areas.length === 0}
		<div class="state empty">
			<strong>{m.staging_empty_title()}</strong><span>{m.staging_empty_text()}</span>
		</div>
	{:else}
		<div class="workspace">
			<aside aria-label={m.staging_areas_title()}>
				<p>{m.staging_areas_kicker()}</p>
				<h2>{m.staging_areas_title()}</h2>
				<nav>
					{#each areas as area (area.iri)}
						<button
							class:active={area.iri === selectedAreaIri}
							type="button"
							disabled={uploading || zipBusy}
							onclick={() => (selectedAreaIri = area.iri)}
						>
							<strong>{areaTitle(area)}</strong><code>{area.iri}</code>
						</button>
					{/each}
				</nav>
			</aside>

			<section class="folders" aria-labelledby="folder-title" aria-busy={loadingFolders}>
				<div class="folder-heading">
					<div>
						<p>{m.staging_folders_kicker()}</p>
						<h2 id="folder-title">
							{selectedArea ? areaTitle(selectedArea) : m.staging_folders_title()}
						</h2>
					</div>
					{#if selectedArea}<a
							href={resolve(projectResourcePath(project, selectedArea.iri) as Pathname)}
							>{m.staging_open_record()} →</a
						>{/if}
				</div>
				{#if selectedArea}
					<dl>
						<div>
							<dt>{m.staging_quota()}</dt>
							<dd>{quota(selectedArea.quotaBytes)}</dd>
						</div>
						<div>
							<dt>{m.staging_role()}</dt>
							<dd>{selectedArea.defaultRoleIri ?? m.staging_not_specified()}</dd>
						</div>
						<div>
							<dt>{m.staging_media_path()}</dt>
							<dd>{selectedArea.mediaPath ?? m.staging_not_specified()}</dd>
						</div>
					</dl>
				{/if}
				{#if operationNotice}<p class="operation-notice" role="status">
						<span>{operationNotice}</span>
						{#if operationResourceIri}<a
								href={resolve(projectResourcePath(project, operationResourceIri) as Pathname)}
								>{m.staging_open_record()} →</a
							>{/if}
					</p>{/if}
				<section class="recent-imports" aria-labelledby="recent-imports-title">
					<div>
						<p>{m.staging_zip_recent_kicker()}</p>
						<h3 id="recent-imports-title">{m.staging_zip_recent_title()}</h3>
					</div>
					{#if recentZipJobsLoading}
						<span class="recent-state" role="status">{m.staging_zip_recent_loading()}</span>
					{:else if recentZipJobsError}
						<span class="recent-state error" role="alert">{m.staging_zip_recent_error()}</span>
					{:else if recentZipJobs.length === 0}
						<span class="recent-state">{m.staging_zip_recent_empty()}</span>
					{:else}
						<ul>
							{#each recentZipJobs as recent (recent.importId)}
								<li>
									<div>
										<strong>{recent.originalFileName}</strong>
										<span>{recent.target.targetRootFolderName} · {zipDate(recent.updatedAt)}</span>
									</div>
									<small class:actionable={recent.state === 'READY'}
										>{zipStateLabel(recent.state)}</small
									>
									<button
										type="button"
										disabled={uploading || zipBusy}
										onclick={() => openRecentZipJob(recent)}>{m.staging_zip_recent_open()}</button
									>
								</li>
							{/each}
						</ul>
					{/if}
				</section>
				{#if uploadFolder}
					<form class="upload-panel" onsubmit={submitUpload}>
						<div>
							<p>{m.staging_upload_kicker()}</p>
							<strong>{m.staging_upload_to({ folder: folderTitle(uploadFolder) })}</strong>
							<span>{m.staging_upload_hint()}</span>
						</div>
						<label>
							<span>{m.staging_upload_file()}</span>
							<input
								bind:this={uploadInput}
								type="file"
								accept=".jpg,.jpeg,.png,.heic,.heif,image/jpeg,image/png,image/heic,image/heif"
								disabled={uploading}
								onchange={(event) => {
									uploadFile = event.currentTarget.files?.[0] ?? null;
									uploadError = null;
									uploadSuccess = null;
								}}
							/>
						</label>
						{#if uploading}
							<div class="progress" role="status">
								<progress max="100" value={uploadProgress}></progress>
								<span>{m.staging_upload_progress({ percent: uploadProgress })}</span>
							</div>
						{/if}
						{#if uploadError}<p class="upload-message error" role="alert">{uploadError}</p>{/if}
						{#if uploadSuccess}<p class="upload-message success" role="status">
								{uploadSuccess}
							</p>{/if}
						<div class="upload-actions">
							<button class="secondary" type="button" onclick={closeUpload}
								>{uploading ? m.staging_upload_cancel() : m.staging_upload_close()}</button
							>
							<button class="primary" type="submit" disabled={!uploadFile || uploading}
								>{m.staging_upload_start()}</button
							>
						</div>
					</form>
				{/if}
				{#if zipFolder && selectedArea}
					<StagingZipUpload
						{project}
						areaIri={selectedArea.iri}
						folderIri={zipFolder.iri}
						folderName={folderTitle(zipFolder)}
						onclose={() => (zipFolder = null)}
						onbusychange={(busy) => (zipBusy = busy)}
						onimported={refreshCurrentZipFolder}
						onjobchange={updateRecentZipJob}
					/>
				{/if}
				{#if resumedZipJob}
					<StagingZipUpload
						{project}
						areaIri={resumedZipJob.target.stagingAreaIri}
						folderIri={resumedZipJob.target.targetRootFolderIri}
						folderName={resumedZipJob.target.targetRootFolderName}
						initialJob={resumedZipJob}
						onclose={() => (resumedZipJob = null)}
						onbusychange={(busy) => (zipBusy = busy)}
						onimported={refreshAfterResumedZipImport}
						onjobchange={updateRecentZipJob}
					/>
				{/if}
				{#if loadingFolders}<div class="folder-state" role="status">
						{m.staging_folders_loading()}
					</div>
				{:else if foldersError}<div class="folder-state error" role="alert">
						{m.staging_folders_error()}
					</div>
				{:else if roots.length === 0}<div class="folder-state">{m.staging_folders_empty()}</div>
				{:else}
					{#if selectedMediaIris.size > 0}
						<div class="selection-bar">
							<strong aria-live="polite"
								>{m.staging_selection_count({ count: selectedMediaIris.size })}</strong
							>
							<div>
								<button
									class="secondary"
									type="button"
									onclick={clearMediaSelection}
									disabled={batchCatalogueBusy}>{m.staging_selection_clear()}</button
								>
								<button
									class="primary"
									type="button"
									onclick={reviewSelection}
									disabled={batchCatalogueBusy}>{m.staging_selection_review()}</button
								>
								<button
									class="catalogue"
									type="button"
									onclick={startBatchCatalogue}
									disabled={batchCatalogueBusy}>{m.staging_batch_action()}</button
								>
							</div>
						</div>
					{/if}
					<ul role="tree" aria-label={m.staging_folders_title()}>
						{#each visibleEntries as entry (entry.kind === 'folder' ? entry.folder.iri : `${entry.media.folderIri}|${entry.media.iri}`)}
							{#if entry.kind === 'folder'}
								<li
									role="treeitem"
									aria-selected="false"
									aria-level={entry.depth}
									aria-expanded={folderContentLoaded(entry.folder.iri) &&
									!folderHasContent(entry.folder.iri)
										? undefined
										: expanded.has(entry.folder.iri)}
									style={`--depth:${entry.depth - 1}`}
								>
									<button
										class="toggle"
										type="button"
										onclick={() => toggle(entry.folder)}
										aria-label={expanded.has(entry.folder.iri)
											? m.staging_collapse({ title: folderTitle(entry.folder) })
											: m.staging_expand({ title: folderTitle(entry.folder) })}
									>
										{#if loadingChildren.has(entry.folder.iri)}…{:else if folderContentLoaded(entry.folder.iri) && !folderHasContent(entry.folder.iri)}·{:else}{expanded.has(
												entry.folder.iri
											)
												? '⌄'
												: '›'}{/if}
									</button>
									<span class="folder-icon" aria-hidden="true">▰</span>
									<a href={resolve(projectResourcePath(project, entry.folder.iri) as Pathname)}
										><strong>{folderTitle(entry.folder)}</strong><code>{entry.folder.iri}</code></a
									>
									{#if childErrors.has(entry.folder.iri)}<small class="child-error"
											>{m.staging_children_error()}</small
										>{/if}
									<div class="folder-actions">
										<FolderExport {project} folderIri={entry.folder.iri} />
										{#if !['top', 'Trash', 'Mobile'].includes(folderTitle(entry.folder))}<PrivateFolderActions
												{project}
												folder={entry.folder}
												onchanged={retry}
											/>{/if}
										<button
											class="upload-trigger"
											type="button"
											disabled={uploading || zipBusy}
											onclick={() => prepareUpload(entry.folder)}
											>↑ {m.staging_upload_action()}</button
										>
										<button
											class="upload-trigger zip"
											type="button"
											disabled={uploading || zipBusy}
											onclick={() => prepareZipUpload(entry.folder)}
											>▣ {m.staging_zip_action()}</button
										>
									</div>
								</li>
							{:else}
								{@const thumbnailUrl = thumbnail(entry.media)}
								<li
									class="media-row"
									class:selected={selectedMediaIris.has(entry.media.iri)}
									role="treeitem"
									aria-selected={selectedMediaIris.has(entry.media.iri)}
									aria-level={entry.depth}
									style={`--depth:${entry.depth - 1}`}
								>
									<label class="media-selector">
										<input
											type="checkbox"
											disabled={!writableDraft(entry.media)}
											checked={selectedMediaIris.has(entry.media.iri)}
											onchange={() => toggleMediaSelection(entry.media)}
										/>
										<span class="sr-only"
											>{m.staging_selection_select({ title: mediaTitle(entry.media) })}</span
										>
									</label>
									<span class="thumbnail">
										{#if thumbnailUrl}
											<img
												src={thumbnailUrl}
												alt=""
												loading="lazy"
												decoding="async"
												onerror={() => failedThumbnails.add(entry.media.iri)}
											/>
										{:else}
											<span class="media-icon" aria-hidden="true">{mediaIcon(entry.media)}</span>
										{/if}
									</span>
									<button
										class="media-review"
										type="button"
										onclick={() => review(entry.media)}
										aria-label={m.staging_review_action({ title: mediaTitle(entry.media) })}
									>
										<strong>{mediaTitle(entry.media)}</strong>
										{#if entry.media.repositoryEntry?.kind === 'archiveReference'}<span
												>{m.repository_protected()}</span
											>{/if}
										<span class="media-meta">
											{entry.media.mimeType ?? m.staging_not_specified()}
											{#if entry.media.statusIri}
												· {fallbackLabel(entry.media.statusIri)}
											{/if}
										</span>
										<code>{entry.media.iri}</code>
									</button>
									<a
										class="record-link"
										href={resolve(projectResourcePath(project, entry.media.iri) as Pathname)}
										aria-label={`${m.staging_open_record()}: ${mediaTitle(entry.media)}`}>↗</a
									>
								</li>
							{/if}
						{/each}
					</ul>
				{/if}
			</section>
		</div>
	{/if}
</div>

{#if batchCatalogueMedia.length > 0}
	<StagingBatchCatalogue
		{project}
		media={batchCatalogueMedia}
		onitemcomplete={completeBatchItem}
		onfinished={finishBatchCatalogue}
		onclose={() => (batchCatalogueMedia = [])}
		onbusychange={(busy) => (batchCatalogueBusy = busy)}
	/>
{/if}

{#if reviewedMedia}
	<dialog
		bind:this={reviewDialog}
		aria-labelledby="staging-review-title"
		oncancel={(event) => {
			event.preventDefault();
			closeReview();
		}}
	>
		<div class="review-heading">
			<div>
				<p>{m.staging_review_kicker()}</p>
				<h2 id="staging-review-title">{m.staging_review_title()}</h2>
				<strong>{mediaTitle(reviewedMedia)}</strong>
				{#if reviewQueueIndex >= 0}<small
						>{m.staging_selection_position({
							current: reviewQueueIndex + 1,
							total: reviewQueueIris.length
						})}</small
					>{/if}
			</div>
			<button
				type="button"
				onclick={closeReview}
				disabled={discarding || catalogueBusy}
				aria-label={m.staging_review_close()}>×</button
			>
		</div>
		<div class="review-body">
			<section class="review-preview" aria-label={m.staging_review_preview()}>
				{#if preview(reviewedMedia)}
					<img src={preview(reviewedMedia) ?? ''} alt={mediaTitle(reviewedMedia)} />
				{:else}
					<span class="media-icon" aria-hidden="true">{mediaIcon(reviewedMedia)}</span>
				{/if}
			</section>
			<dl class="review-facts">
				<div>
					<dt>{m.staging_review_original_name()}</dt>
					<dd>{reviewedMedia.originalName ?? m.staging_not_specified()}</dd>
				</div>
				<div>
					<dt>{m.staging_review_mime_type()}</dt>
					<dd>{reviewedMedia.mimeType ?? m.staging_not_specified()}</dd>
				</div>
				<div>
					<dt>{m.staging_review_status()}</dt>
					<dd>
						{reviewedMedia.statusIri
							? fallbackLabel(reviewedMedia.statusIri)
							: m.staging_not_specified()}
					</dd>
				</div>
				<div>
					<dt>{m.staging_review_asset_id()}</dt>
					<dd>{reviewedMedia.assetId ?? m.staging_not_specified()}</dd>
				</div>
				<div>
					<dt>{m.staging_review_checksum()}</dt>
					<dd><code>{reviewedMedia.checksum ?? m.staging_not_specified()}</code></dd>
				</div>
				<div>
					<dt>{m.staging_review_protocol()}</dt>
					<dd>{reviewedMedia.protocol ?? m.staging_not_specified()}</dd>
				</div>
				<div>
					<dt>{m.staging_review_derivative()}</dt>
					<dd>{reviewedMedia.derivativeName ?? m.staging_not_specified()}</dd>
				</div>
			</dl>
		</div>
		{#if catalogueMode && writableDraft(reviewedMedia)}
			<StagingCatalogueForm
				{project}
				media={reviewedMedia}
				oncomplete={completeCatalogue}
				oncancel={() => (catalogueMode = false)}
				onbusychange={(busy) => (catalogueBusy = busy)}
			/>
		{/if}
		{#if discardError}<p class="discard-error" role="alert">{discardError}</p>{/if}
		{#if reviewedMedia.repositoryEntry?.kind === 'archiveReference'}
			<p>{m.repository_protected()}</p>
			<a
				href={resolve(
					projectAdministrationPath(
						project,
						`resources/${encodeURIComponent(reviewedMedia.iri)}`
					) as Pathname
				)}>{m.repository_archive_edit()}</a
			>
			{#if reviewedMedia.repositoryEntry.canMove}<button
					onclick={() => {
						movingReference = reviewedMedia;
						closeReview();
					}}>{m.repository_move()}</button
				>{/if}
		{/if}
		<div class="review-actions" class:catalogue-open={catalogueMode}>
			<a href={resolve(projectResourcePath(project, reviewedMedia.iri) as Pathname)}
				>{m.staging_open_record()} →</a
			>
			{#if reviewQueueIndex >= 0}
				<button
					class="secondary"
					type="button"
					onclick={() => navigateReview(-1)}
					disabled={discarding || catalogueBusy || reviewQueueIndex === 0}
					>{m.staging_selection_previous()}</button
				>
				<button
					class="secondary"
					type="button"
					onclick={() => navigateReview(1)}
					disabled={discarding || catalogueBusy || reviewQueueIndex === reviewQueueIris.length - 1}
					>{m.staging_selection_next()}</button
				>
			{/if}
			<button
				class="primary"
				type="button"
				onclick={() => (catalogueMode = true)}
				disabled={discarding || catalogueBusy || catalogueMode || !writableDraft(reviewedMedia)}
				>{m.staging_catalogue_action()}</button
			>
			<button
				class="secondary"
				type="button"
				onclick={closeReview}
				disabled={discarding || catalogueBusy}>{m.staging_review_close()}</button
			>
			<button
				class="danger"
				type="button"
				onclick={discardReviewedMedia}
				disabled={discarding ||
					catalogueBusy ||
					catalogueMode ||
					!reviewedMedia.assetId ||
					reviewedMedia.repositoryEntry?.canDeleteMedia === false}
				>{discarding ? m.staging_discarding() : m.staging_discard_action()}</button
			>
		</div>
	</dialog>
{/if}

<ReferenceMove
	{project}
	media={movingReference}
	onclose={() => (movingReference = null)}
	onmoved={retry}
/>
{#if folderActionError}<p role="alert">{folderActionError}</p>{/if}

<style>
	.page {
		max-width: 86rem;
		margin: auto;
		padding: clamp(1.5rem, 4vw, 4rem);
	}
	.back {
		display: inline-block;
		margin-bottom: 1.4rem;
		color: var(--teal-dark);
		font-size: 0.78rem;
		font-weight: 700;
		text-decoration: none;
	}
	header {
		display: flex;
		justify-content: space-between;
		gap: 2rem;
		align-items: flex-start;
		margin-bottom: 2rem;
	}
	header p,
	aside > p,
	.folder-heading p {
		margin: 0 0 0.45rem;
		color: var(--copper-dark);
		font-size: 0.67rem;
		font-weight: 760;
		letter-spacing: 0.13em;
		text-transform: uppercase;
	}
	h1,
	h2 {
		margin: 0;
		color: var(--navy);
		font-family: Georgia, 'Times New Roman', serif;
		font-weight: 500;
	}
	h1 {
		font-size: clamp(2.5rem, 6vw, 4.5rem);
		line-height: 1;
	}
	header span {
		display: block;
		max-width: 52rem;
		margin-top: 1rem;
		color: var(--muted);
		line-height: 1.65;
	}
	header small {
		padding: 0.45rem 0.65rem;
		color: var(--teal-dark);
		border: 1px solid var(--teal);
		border-radius: 999px;
		white-space: nowrap;
	}
	.workspace {
		display: grid;
		grid-template-columns: minmax(15rem, 21rem) minmax(0, 1fr);
		gap: 1rem;
	}
	aside,
	.folders,
	.state {
		background: rgb(255 253 248 / 94%);
		border: 1px solid var(--line);
		border-radius: 0.75rem;
		box-shadow: 0 3px 16px rgb(17 44 70 / 4%);
	}
	aside {
		padding: 1.25rem;
	}
	h2 {
		font-size: 1.6rem;
	}
	nav {
		display: grid;
		gap: 0.55rem;
		margin-top: 1rem;
	}
	nav button {
		display: grid;
		gap: 0.3rem;
		width: 100%;
		padding: 0.8rem;
		text-align: left;
		color: var(--navy);
		background: #f6f2e9;
		border: 1px solid transparent;
		border-radius: 0.45rem;
		cursor: pointer;
	}
	nav button.active {
		background: white;
		border-color: var(--teal);
		box-shadow: inset 3px 0 var(--teal);
	}
	code {
		overflow: hidden;
		color: var(--muted);
		font-family: inherit;
		font-size: 0.68rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.folders {
		overflow: hidden;
	}
	.folder-heading {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		padding: 1.25rem;
		border-bottom: 1px solid var(--line);
	}
	.folder-heading a {
		color: var(--teal-dark);
		font-size: 0.75rem;
		font-weight: 700;
		text-decoration: none;
	}
	dl {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		margin: 0;
		padding: 0.85rem 1.25rem;
		background: #f6f2e9;
		border-bottom: 1px solid var(--line);
	}
	.upload-panel {
		display: grid;
		grid-template-columns: minmax(13rem, 1fr) minmax(14rem, 1.2fr) auto;
		align-items: end;
		gap: 1rem;
		padding: 1rem 1.25rem;
		background: #edf5f2;
		border-bottom: 1px solid var(--line);
	}
	.upload-panel p {
		margin: 0 0 0.3rem;
		color: var(--copper-dark);
		font-size: 0.64rem;
		font-weight: 760;
		letter-spacing: 0.11em;
		text-transform: uppercase;
	}
	.upload-panel strong,
	.upload-panel label,
	.upload-panel label > span {
		display: block;
	}
	.upload-panel span {
		margin-top: 0.25rem;
		color: var(--muted);
		font-size: 0.72rem;
	}
	.upload-panel input {
		max-width: 100%;
		margin-top: 0.4rem;
	}
	.upload-actions {
		display: flex;
		gap: 0.45rem;
	}
	.folder-actions {
		grid-column: 2 / -1;
		min-width: 0;
		align-items: center;
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.upload-actions button,
	.upload-trigger {
		padding: 0.5rem 0.7rem;
		border-radius: 0.35rem;
		font-size: 0.7rem;
		font-weight: 700;
		cursor: pointer;
	}
	.upload-actions .primary {
		color: white;
		background: var(--copper);
		border: 1px solid var(--copper);
	}
	.upload-actions .secondary,
	.upload-trigger {
		color: var(--teal-dark);
		background: white;
		border: 1px solid var(--teal);
	}
	.upload-trigger.zip {
		color: var(--navy);
		border-color: #c9b8d8;
	}
	.upload-actions button:disabled,
	.upload-trigger:disabled {
		opacity: 0.45;
		cursor: default;
	}
	.progress,
	.upload-message {
		grid-column: 1 / -1;
		margin: 0;
	}
	.progress {
		display: grid;
		grid-template-columns: minmax(10rem, 1fr) auto;
		align-items: center;
		gap: 0.75rem;
	}
	.progress progress {
		width: 100%;
	}
	.upload-message.success {
		color: var(--teal-dark);
	}
	.operation-notice {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		margin: 0;
		padding: 0.8rem 1.25rem;
		color: var(--teal-dark);
		background: #edf5f2;
		border-bottom: 1px solid var(--line);
		font-size: 0.78rem;
	}
	.operation-notice a {
		color: var(--teal-dark);
		font-weight: 700;
		white-space: nowrap;
	}
	.selection-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 1.25rem;
		color: var(--navy);
		background: #e3f2ed;
		border-bottom: 1px solid var(--teal);
	}
	.selection-bar > div {
		display: flex;
		gap: 0.5rem;
	}
	.selection-bar button {
		padding: 0.5rem 0.7rem;
		border-radius: 0.35rem;
		font-size: 0.7rem;
		font-weight: 700;
	}
	.selection-bar .secondary {
		color: var(--teal-dark);
		background: white;
		border: 1px solid var(--teal);
	}
	.selection-bar .primary {
		color: white;
		background: var(--teal-dark);
		border: 1px solid var(--teal-dark);
	}
	.selection-bar .catalogue {
		color: white;
		background: var(--copper);
		border: 1px solid var(--copper);
	}
	.selection-bar button:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.recent-imports {
		display: grid;
		grid-template-columns: minmax(10rem, 0.32fr) minmax(0, 1fr);
		gap: 1rem;
		align-items: start;
		padding: 1rem 1.25rem;
		background: #fbf8f1;
		border-bottom: 1px solid var(--line);
	}
	.recent-imports > div > p {
		margin: 0 0 0.25rem;
		color: var(--copper-dark);
		font-size: 0.62rem;
		font-weight: 760;
		letter-spacing: 0.11em;
		text-transform: uppercase;
	}
	.recent-imports h3 {
		margin: 0;
		color: var(--navy);
		font:
			500 1.15rem/1.2 Georgia,
			'Times New Roman',
			serif;
	}
	.recent-imports ul {
		display: grid;
		gap: 0.35rem;
	}
	.recent-imports li {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto auto;
		gap: 0.75rem;
		align-items: center;
		min-height: 0;
		padding: 0.55rem 0.65rem;
		background: white;
		border: 1px solid var(--line);
		border-radius: 0.4rem;
	}
	.recent-imports li > div {
		display: grid;
		min-width: 0;
	}
	.recent-imports li strong,
	.recent-imports li span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.recent-imports li strong {
		color: var(--navy);
		font-size: 0.76rem;
	}
	.recent-imports li span,
	.recent-state {
		color: var(--muted);
		font-size: 0.68rem;
	}
	.recent-imports li small {
		padding: 0.24rem 0.4rem;
		color: var(--muted);
		background: #f3f0e9;
		border-radius: 999px;
		font-size: 0.62rem;
		white-space: nowrap;
	}
	.recent-imports li small.actionable {
		color: var(--teal-dark);
		background: #e3f2ed;
	}
	.recent-imports li button {
		padding: 0.42rem 0.6rem;
		color: var(--teal-dark);
		background: white;
		border: 1px solid var(--teal);
		border-radius: 0.35rem;
		font-size: 0.67rem;
		font-weight: 700;
		cursor: pointer;
	}
	.recent-imports li button:disabled {
		opacity: 0.45;
		cursor: default;
	}
	.recent-state {
		padding: 0.55rem 0;
	}
	.recent-state.error {
		color: #a33c2d;
	}
	dl div {
		min-width: 0;
	}
	dt {
		color: var(--muted);
		font-size: 0.65rem;
		text-transform: uppercase;
	}
	dd {
		overflow: hidden;
		margin: 0.2rem 0 0;
		color: var(--navy);
		font-size: 0.75rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	li {
		display: grid;
		grid-template-columns: 2rem 3.25rem minmax(0, 1fr) auto;
		align-items: center;
		min-height: 4.4rem;
		padding: 0.5rem 1rem 0.5rem calc(1rem + var(--depth) * 1.5rem);
		border-bottom: 1px solid var(--line);
	}
	li:last-child {
		border-bottom: 0;
	}
	.toggle {
		width: 2rem;
		height: 2rem;
		color: var(--navy);
		background: transparent;
		border: 0;
		font-size: 1.3rem;
		cursor: pointer;
	}
	.folder-icon {
		color: var(--copper);
		font-size: 1.25rem;
	}
	.media-row {
		background: rgb(246 242 233 / 45%);
	}
	.media-row.selected {
		background: #edf5f2;
		box-shadow: inset 3px 0 var(--teal);
	}
	.media-selector {
		display: grid;
		width: 2rem;
		height: 2rem;
		place-items: center;
		cursor: pointer;
	}
	.media-selector input {
		width: 1rem;
		height: 1rem;
		accent-color: var(--teal-dark);
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
	.thumbnail {
		display: grid;
		place-items: center;
		width: 3.25rem;
		height: 3.25rem;
		overflow: hidden;
		color: var(--teal-dark);
		background: #e8ebe7;
		border: 1px solid #d8ddd8;
		border-radius: 0.35rem;
	}
	.thumbnail img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.media-icon {
		color: var(--teal-dark);
		font-size: 1.25rem;
	}
	.media-meta {
		color: var(--muted);
		font-size: 0.72rem;
	}
	li > a {
		display: grid;
		gap: 0.2rem;
		min-width: 0;
		color: var(--navy);
		text-decoration: none;
	}
	.media-review {
		display: grid;
		gap: 0.2rem;
		min-width: 0;
		padding: 0;
		color: var(--navy);
		text-align: left;
		background: transparent;
		border: 0;
		cursor: pointer;
	}
	.media-review:hover strong,
	.media-review:focus-visible strong {
		color: var(--teal-dark);
		text-decoration: underline;
	}
	.record-link {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		color: var(--teal-dark);
		border: 1px solid var(--line);
		border-radius: 50%;
	}
	.child-error {
		color: #9b382f;
	}
	.upload-trigger {
		white-space: nowrap;
	}
	.state,
	.folder-state {
		display: grid;
		gap: 0.5rem;
		padding: 2rem;
		color: var(--muted);
	}
	.state.error {
		grid-template-columns: 1fr auto;
	}
	.state button {
		padding: 0.45rem 0.8rem;
		color: white;
		background: var(--navy);
		border: 0;
		border-radius: 0.35rem;
	}
	.folder-state {
		min-height: 9rem;
		place-items: center;
	}
	.error {
		color: #9b382f;
	}
	dialog {
		position: fixed;
		inset: 50% auto auto 50%;
		z-index: 30;
		width: min(62rem, calc(100vw - 2rem));
		max-height: calc(100vh - 2rem);
		margin: 0;
		padding: 0;
		transform: translate(-50%, -50%);
		overflow: auto;
		color: var(--navy);
		background: #fffdf8;
		border: 1px solid var(--line);
		border-radius: 0.8rem;
		box-shadow: 0 1.5rem 5rem rgb(9 31 52 / 28%);
	}
	dialog::backdrop {
		background: rgb(9 31 52 / 48%);
	}
	.review-heading {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		padding: 1.3rem 1.5rem;
		border-bottom: 1px solid var(--line);
	}
	.review-heading p {
		margin: 0 0 0.3rem;
		color: var(--copper-dark);
		font-size: 0.65rem;
		font-weight: 760;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}
	.review-heading strong {
		display: block;
		margin-top: 0.35rem;
	}
	.review-heading small {
		display: block;
		margin-top: 0.3rem;
		color: var(--muted);
		font-size: 0.7rem;
	}
	.review-heading > button {
		width: 2.2rem;
		height: 2.2rem;
		color: var(--navy);
		background: transparent;
		border: 1px solid var(--line);
		border-radius: 50%;
		font-size: 1.25rem;
		cursor: pointer;
	}
	.review-body {
		display: grid;
		grid-template-columns: minmax(18rem, 1.2fr) minmax(16rem, 0.8fr);
		gap: 1.25rem;
		padding: 1.5rem;
	}
	.review-preview {
		display: grid;
		min-height: 20rem;
		place-items: center;
		overflow: hidden;
		background: #e8ebe7;
		border-radius: 0.5rem;
	}
	.review-preview img {
		width: 100%;
		height: 100%;
		max-height: 34rem;
		object-fit: contain;
	}
	.review-facts {
		display: grid;
		grid-template-columns: 1fr;
		align-content: start;
		gap: 0;
		margin: 0;
		padding: 0;
		background: transparent;
		border: 1px solid var(--line);
		border-radius: 0.45rem;
	}
	.review-facts div {
		padding: 0.75rem;
		border-bottom: 1px solid var(--line);
	}
	.review-facts div:last-child {
		border-bottom: 0;
	}
	.review-facts dd,
	.review-facts code {
		white-space: normal;
		word-break: break-word;
	}
	.discard-error {
		margin: 0 1.5rem 1rem;
		padding: 0.75rem;
		color: #9b382f;
		background: #fff0ed;
		border-radius: 0.35rem;
	}
	.review-actions {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 0.55rem;
		padding: 1rem 1.5rem;
		border-top: 1px solid var(--line);
	}
	.review-actions a {
		margin-right: auto;
		color: var(--teal-dark);
		font-size: 0.75rem;
		font-weight: 700;
		text-decoration: none;
	}
	.review-actions button {
		padding: 0.55rem 0.8rem;
		border-radius: 0.35rem;
		font-size: 0.72rem;
		font-weight: 700;
		cursor: pointer;
	}
	.review-actions .secondary {
		color: var(--navy);
		background: white;
		border: 1px solid var(--line);
	}
	.review-actions .primary {
		color: white;
		background: var(--copper);
		border: 1px solid var(--copper);
	}
	.review-actions .danger {
		color: white;
		background: #9b382f;
		border: 1px solid #9b382f;
	}
	.review-actions button:disabled,
	.review-heading button:disabled {
		opacity: 0.5;
		cursor: default;
	}
	@media (max-width: 52rem) {
		header {
			display: block;
		}
		header small {
			display: inline-block;
			margin-top: 1rem;
		}
		.workspace {
			grid-template-columns: 1fr;
		}
		dl {
			grid-template-columns: 1fr;
			gap: 0.65rem;
		}
		.upload-panel {
			grid-template-columns: 1fr;
		}
		.recent-imports {
			grid-template-columns: 1fr;
		}
		.recent-imports li {
			grid-template-columns: minmax(0, 1fr) auto;
		}
		.recent-imports li small {
			grid-column: 1;
			grid-row: 2;
			justify-self: start;
		}
		.recent-imports li button {
			grid-column: 2;
			grid-row: 1 / span 2;
		}
		.review-body {
			grid-template-columns: 1fr;
		}
		.review-preview {
			min-height: 14rem;
		}
		.review-actions {
			flex-wrap: wrap;
		}
		.selection-bar {
			align-items: flex-start;
			flex-direction: column;
		}
	}
</style>
