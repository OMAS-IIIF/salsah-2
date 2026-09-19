<script lang="ts">
	import CataloguePlacement from './CataloguePlacement.svelte';
	import { m } from '$lib/paraglide/messages';
	import { getLocale, locales } from '$lib/paraglide/runtime';
	import {
		catalogueStagingMediaObject,
		loadCatalogueTargets,
		type CatalogueResult,
		type CatalogueTarget
	} from '$lib/staging/catalogue';
	import type { StagingMediaObjectNode } from '$lib/staging/types';

	interface Props {
		project: string;
		media: StagingMediaObjectNode;
		oncomplete: (result: CatalogueResult, target: CatalogueTarget) => void;
		oncancel: () => void;
		onbusychange: (busy: boolean) => void;
	}

	let { project, media, oncomplete, oncancel, onbusychange }: Props = $props();
	let archiveUnitIri = $state('');
	let placementReady = $state(false);
	let mixed = $derived(Boolean(media.repositoryEntry));
	let targets = $state<CatalogueTarget[]>([]);
	let selectedTargetIri = $state('');
	let language = $state(getLocale().toLowerCase());
	let values = $state<Record<string, string>>({});
	let loading = $state(true);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let selectedTarget = $derived(targets.find(({ iri }) => iri === selectedTargetIri) ?? null);
	let canSubmit = $derived(
		Boolean(
			selectedTarget &&
			!loading &&
			(!mixed || placementReady) &&
			!saving &&
			selectedTarget.fields.every((field) => !field.required || Boolean(values[field.iri]?.trim()))
		)
	);

	$effect(() => {
		const requestedProject = project;
		let cancelled = false;
		loading = true;
		error = null;
		void loadCatalogueTargets(requestedProject, getLocale())
			.then((result) => {
				if (cancelled || requestedProject !== project) return;
				targets = result;
				selectedTargetIri = result.length === 1 ? result[0].iri : '';
			})
			.catch((reason: unknown) => {
				if (!cancelled)
					error = reason instanceof Error ? reason.message : m.staging_catalogue_error();
			})
			.finally(() => {
				if (!cancelled) loading = false;
			});

		return () => {
			cancelled = true;
		};
	});

	function setValue(iri: string, value: string): void {
		values = { ...values, [iri]: value };
		error = null;
	}

	async function submit(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		const target = selectedTarget;
		if (!target || !canSubmit) return;
		saving = true;
		onbusychange(true);
		error = null;
		try {
			const result = await catalogueStagingMediaObject(project, media, target, {
				targetClass: target.iri,
				...(archiveUnitIri ? { archiveUnitIri } : {}),
				language,
				values
			});
			oncomplete(result, target);
		} catch (reason: unknown) {
			error = reason instanceof Error ? reason.message : m.staging_catalogue_error();
		} finally {
			saving = false;
			onbusychange(false);
		}
	}
</script>

<form class="catalogue-form" onsubmit={submit}>
	<div class="catalogue-heading">
		<p>{m.staging_catalogue_intro()}</p>
	</div>
	{#if loading}
		<p class="catalogue-state" role="status">{m.staging_catalogue_loading()}</p>
	{:else if targets.length === 0}
		<p class="catalogue-state" role="status">{m.staging_catalogue_no_targets()}</p>
	{:else}
		{#if mixed}<CataloguePlacement
				{project}
				media={[media]}
				bind:value={archiveUnitIri}
				bind:ready={placementReady}
				disabled={saving}
			/>{/if}
		<div class="catalogue-grid">
			<label>
				<span>{m.staging_catalogue_target()}</span>
				<select bind:value={selectedTargetIri} disabled={saving} required>
					{#if targets.length > 1}<option value="">{m.staging_catalogue_target_choose()}</option
						>{/if}
					{#each targets as target (target.iri)}
						<option value={target.iri}>{target.label}</option>
					{/each}
				</select>
			</label>
			<label>
				<span>{m.staging_catalogue_language()}</span>
				<select bind:value={language} disabled={saving} required>
					{#each locales as locale (locale)}
						<option value={locale}>{locale.toUpperCase()}</option>
					{/each}
				</select>
			</label>
		</div>
		{#if selectedTarget?.description}<p class="target-description">
				{selectedTarget.description}
			</p>{/if}
		{#if selectedTarget}
			<div class="catalogue-fields">
				{#each selectedTarget.fields as field (field.iri)}
					<label>
						<span>{field.label}{field.required ? ' *' : ''}</span>
						{#if field.iri === 'schema:description'}
							<textarea
								rows="4"
								value={values[field.iri] ?? ''}
								disabled={saving}
								required={field.required}
								oninput={(event) => setValue(field.iri, event.currentTarget.value)}></textarea>
						{:else}
							<input
								type="text"
								value={values[field.iri] ?? ''}
								disabled={saving}
								required={field.required}
								oninput={(event) => setValue(field.iri, event.currentTarget.value)}
							/>
						{/if}
						{#if field.description}<small>{field.description}</small>{/if}
					</label>
				{/each}
			</div>
		{/if}
	{/if}
	{#if error}<p class="catalogue-error" role="alert">{error}</p>{/if}
	<div class="catalogue-actions">
		<button class="secondary" type="button" onclick={oncancel} disabled={saving}
			>{m.staging_catalogue_cancel()}</button
		>
		<button class="primary" type="submit" disabled={!canSubmit}
			>{saving ? m.staging_cataloguing() : m.staging_catalogue_submit()}</button
		>
	</div>
</form>

<style>
	.catalogue-form {
		padding: 1.25rem 1.5rem;
		background: #edf5f2;
		border-top: 1px solid var(--line);
	}
	.catalogue-heading p,
	.target-description,
	.catalogue-state {
		margin: 0 0 1rem;
		color: var(--muted);
		font-size: 0.78rem;
		line-height: 1.5;
	}
	.catalogue-grid {
		display: grid;
		grid-template-columns: minmax(14rem, 1fr) minmax(7rem, 0.3fr);
		gap: 0.8rem;
	}
	.catalogue-fields {
		display: grid;
		gap: 0.8rem;
		margin-top: 0.9rem;
	}
	label,
	label > span,
	label > small {
		display: block;
	}
	label > span {
		margin-bottom: 0.3rem;
		font-size: 0.72rem;
		font-weight: 700;
	}
	label > small {
		margin-top: 0.25rem;
		color: var(--muted);
	}
	input,
	select,
	textarea {
		box-sizing: border-box;
		width: 100%;
		padding: 0.6rem 0.65rem;
		color: var(--navy);
		background: white;
		border: 1px solid var(--line);
		border-radius: 0.35rem;
		font: inherit;
	}
	textarea {
		resize: vertical;
	}
	.catalogue-error {
		margin: 0.9rem 0 0;
		padding: 0.75rem;
		color: #9b382f;
		background: #fff0ed;
		border-radius: 0.35rem;
	}
	.catalogue-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.55rem;
		margin-top: 1rem;
	}
	.catalogue-actions button {
		padding: 0.55rem 0.8rem;
		border-radius: 0.35rem;
		font-size: 0.72rem;
		font-weight: 700;
		cursor: pointer;
	}
	.catalogue-actions .secondary {
		color: var(--navy);
		background: white;
		border: 1px solid var(--line);
	}
	.catalogue-actions .primary {
		color: white;
		background: var(--copper);
		border: 1px solid var(--copper);
	}
	.catalogue-actions button:disabled {
		opacity: 0.5;
		cursor: default;
	}
	@media (max-width: 40rem) {
		.catalogue-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
