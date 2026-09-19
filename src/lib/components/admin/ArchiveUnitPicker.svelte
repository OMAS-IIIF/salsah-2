<script lang="ts">
	import { searchArchiveUnits, readResource } from '$lib/resources/client';
	import { localizedText, fallbackLabel } from '$lib/resources/model';
	import { getLocale } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages';
	import type { ArchiveTreeUnit } from '$lib/resources/types';
	/** Incremental, permission-filtered picker. The chosen IRI is separate from the browsed parent. */
	let {
		project,
		value = $bindable(''),
		disabled = false,
		onchange = () => {}
	}: { project: string; value?: string; disabled?: boolean; onchange?: () => void } = $props();
	let parent = $state<string | null>(null);
	let units = $state<ArchiveTreeUnit[]>([]);
	let label = $state('');
	let error = $state('');
	let loading = $state(false);
	$effect(() => {
		let cancelled = false;
		loading = true;
		void searchArchiveUnits(project, parent)
			.then((v) => {
				if (!cancelled) units = v;
			})
			.catch((e) => {
				if (!cancelled) error = String(e);
			})
			.finally(() => {
				if (!cancelled) loading = false;
			});
		return () => {
			cancelled = true;
		};
	});
	$effect(() => {
		const iri = value;
		let cancelled = false;
		label = '';
		if (iri)
			void readResource(project, iri)
				.then((r) => {
					if (!cancelled)
						label = localizedText(r['schema:name'], getLocale()) ?? fallbackLabel(iri);
				})
				.catch((e) => {
					if (!cancelled) error = String(e);
				});
		return () => {
			cancelled = true;
		};
	});
	function choose(iri: string) {
		value = iri;
		onchange();
	}
</script>

<fieldset {disabled} class="picker">
	<legend>{m.archive_choose()}</legend>
	<p>{m.archive_selected()}: {label || value || m.archive_none()}</p>
	<button type="button" onclick={() => choose('')}>{m.archive_none()}</button>
	<button type="button" onclick={() => (parent = null)}>{m.archive_roots()}</button>
	{#if loading}<p role="status">…</p>{/if}
	{#each units as unit (unit.iri)}
		<div class="unit">
			<button type="button" onclick={() => choose(unit.iri)}
				>{localizedText(unit.title, getLocale()) ?? fallbackLabel(unit.iri)}</button
			><button
				type="button"
				aria-label={`${m.archive_browse()}: ${localizedText(unit.title, getLocale()) ?? fallbackLabel(unit.iri)}`}
				onclick={() => (parent = unit.iri)}>›</button
			>
		</div>
	{/each}
	{#if error}<p role="alert">{error}</p>{/if}
</fieldset>

<style>
	.picker {
		border: 1px solid var(--line);
		padding: 0.8rem;
		min-width: 0;
	}
	.picker p {
		overflow-wrap: anywhere;
		font-size: 0.85rem;
	}
	.unit {
		display: flex;
		gap: 0.5rem;
		margin: 0.3rem 0;
	}
	button {
		padding: 0.4rem 0.7rem;
		border: 1px solid var(--line);
		background: var(--paper, white);
		color: var(--navy);
		border-radius: 0.3rem;
		cursor: pointer;
	}
	.unit button:first-child {
		flex: 1;
		text-align: left;
	}
</style>
