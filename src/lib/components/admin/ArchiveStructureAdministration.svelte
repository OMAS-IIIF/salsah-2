<script lang="ts">
	import { absoluteProjectIri } from '$lib/archive/iri';
	import { untrack } from 'svelte';
	import { authSession } from '$lib/auth/session';
	import {
		archiveLevels,
		archiveRequest,
		structureCapabilities,
		structurePath,
		validPlan,
		isDefiniteRejection,
		type StructureCapabilities,
		type StructurePlan,
		type StructureReview,
		type StructureProposal
	} from '$lib/archive/client';
	import { localizedText, fallbackLabel, valuesOf } from '$lib/resources/model';
	import { readResource, readResourceSummaries } from '$lib/resources/client';
	import type { OldapResourceSearchHit } from '$lib/resources/types';
	import { getLocale } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages';
	import ArchiveUnitPicker from './ArchiveUnitPicker.svelte';
	/** Admin composition of reviewed adoption and guarded existing-unit edits. No role names are hard-coded. */
	let { project }: { project: string } = $props();
	let access = $state<StructureCapabilities | null>(null);
	let folders = $state<OldapResourceSearchHit[]>([]);
	let areaLabels = $state<Record<string, string>>({});
	let source = $state('');
	let proposal = $state<StructureProposal | null>(null);
	let plan = $state<StructurePlan | null>(null);
	let review = $state<StructureReview | null>(null);
	let reviewedJson = $state('');
	let attachment = $state('');
	let confirmed = $state(false);
	let pending = $state<{ id: string; plan: StructurePlan; reviewDigest: string } | null>(null);
	let blocked = $state(false);
	let busy = $state(false);
	let error = $state('');
	let notice = $state('');
	let editingMapping = $state(-1);
	let unit = $state('');
	let unitRevision = $state(0);
	let unitName = $state('');
	let unitNames = $state<string[]>([]);
	let unitLevel = $state<string>(archiveLevels[0]);
	let parent = $state('');
	let unitReady = $state(false);
	const storageKey = $derived(`salsah-adoption:${project}:${$authSession.user?.userIri ?? ''}`);
	const levelLabels = $derived([
		m.archive_level_archive_group(),
		m.archive_level_fonds(),
		m.archive_level_subfonds(),
		m.archive_level_series(),
		m.archive_level_subseries(),
		m.archive_level_file(),
		m.archive_level_item()
	]);
	$effect(() => {
		let cancelled = false;
		access = null;
		void structureCapabilities(project)
			.then((v) => {
				if (!cancelled) access = v;
			})
			.catch((e) => {
				if (!cancelled) error = String(e);
			});
		return () => {
			cancelled = true;
		};
	});
	$effect(() => {
		const allowed = access?.enabled && access.canManageStructure;
		const requested = project;
		let cancelled = false;
		folders = [];
		if (allowed)
			void loadFolders(requested)
				.then((v) => {
					if (!cancelled) {
						folders = v.rows;
						areaLabels = v.labels;
					}
				})
				.catch((e) => {
					if (!cancelled) error = String(e);
				});
		return () => {
			cancelled = true;
		};
	});
	$effect(() => {
		const saved = sessionStorage.getItem(storageKey);
		pending = null;
		blocked = false;
		if (saved)
			try {
				const p = JSON.parse(saved);
				if (
					!validPlan(p.plan) ||
					!/^[a-f0-9]{64}$/.test(p.reviewDigest) ||
					!/^[a-f0-9-]{36}$/.test(p.id)
				)
					throw new Error('Invalid recovery record.');
				pending = p;
			} catch (e) {
				blocked = true;
				error = String(e);
			}
	});
	// Any edit invalidates the prior digest. Pending commands remain immutable and independently recoverable.
	$effect(() => {
		const current = JSON.stringify(plan);
		const parentIri = attachment;
		untrack(() => {
			if (
				reviewedJson &&
				reviewedJson !== JSON.stringify({ plan: JSON.parse(current), attachment: parentIri })
			) {
				review = null;
				reviewedJson = '';
				confirmed = false;
			}
		});
	});
	$effect(() => {
		const iri = unit;
		let cancelled = false;
		unitReady = false;
		if (iri)
			void readResource(project, iri)
				.then((record) => {
					if (cancelled) return;
					unitNames = valuesOf(record['schema:name']).filter(
						(v): v is string => typeof v === 'string'
					);
					unitName = localizedText(record['schema:name'], getLocale()) ?? '';
					unitLevel = String(valuesOf(record['shared:archiveLevel'])[0] ?? archiveLevels[0]);
					parent = String(valuesOf(record['shared:parentArchiveUnit'])[0] ?? '');
					unitReady = true;
				})
				.catch((e) => {
					if (!cancelled) error = String(e);
				});
		return () => {
			cancelled = true;
		};
	});
	async function loadFolders(project: string) {
		const rows: OldapResourceSearchHit[] = [];
		for (let offset = 0; ; offset += 100) {
			const page = await archiveRequest<OldapResourceSearchHit[]>(
				`/data/search/${encodeURIComponent(project)}`,
				{
					resClass: 'shared:StagingFolder',
					includeProperties: ['schema:name', 'shared:inStagingArea', 'shared:inStagingFolder'],
					limit: 100,
					offset
				}
			);
			if (!Array.isArray(page)) throw new Error('Invalid folder search.');
			rows.push(...page);
			if (page.length < 100) break;
		}
		const areaIris = rows
			.map((row) => String(valuesOf(row['shared:inStagingArea'])[0] ?? ''))
			.filter((iri, index, all) => iri && all.indexOf(iri) === index);
		const summaries = await readResourceSummaries(project, areaIris, ['schema:name']);
		const labels = Object.fromEntries(
			summaries.map((area) => [
				absoluteProjectIri(project, area.iri),
				localizedText(area.data['schema:name'], getLocale()) ?? fallbackLabel(area.iri)
			])
		);
		return { rows, labels };
	}
	function folderLabel(iri: string) {
		const row = folders.find((f) => f.iri === iri);
		if (!row) return fallbackLabel(iri);
		const path = [localizedText(row['schema:name'], getLocale()) ?? fallbackLabel(iri)];
		let ancestor = valuesOf(row['shared:inStagingFolder'])[0];
		const seen = [iri];
		while (typeof ancestor === 'string' && !seen.includes(ancestor)) {
			seen.push(ancestor);
			const parent = folders.find((f) => f.iri === ancestor);
			if (!parent) break;
			path.unshift(localizedText(parent['schema:name'], getLocale()) ?? fallbackLabel(parent.iri));
			ancestor = valuesOf(parent['shared:inStagingFolder'])[0];
		}
		const area = valuesOf(row['shared:inStagingArea'])[0];
		if (typeof area === 'string')
			path.unshift(areaLabels[absoluteProjectIri(project, area)] ?? fallbackLabel(area));
		return path.join(' / ');
	}
	async function propose() {
		busy = true;
		error = '';
		notice = '';
		review = null;
		try {
			const value = await archiveRequest<StructureProposal>(structurePath(project, 'proposal'), {
				sourceFolderIri: absoluteProjectIri(project, source)
			});
			if (!validPlan(value.suggestedPlan)) throw new Error('Invalid proposal.');
			proposal = value;
			plan = value.suggestedPlan;
			if (!access?.canCreateUnits) {
				plan.newUnits = [];
				plan.mappings = plan.mappings.map((v) =>
					v.action === 'set' && 'key' in v.target ? { folderIri: v.folderIri, action: 'skip' } : v
				);
			}
			attachment = '';
		} catch (e) {
			error = String(e);
		} finally {
			busy = false;
		}
	}
	function effectivePlan() {
		if (!plan) throw new Error('No plan.');
		const result = structuredClone($state.snapshot(plan));
		for (const node of result.newUnits)
			if (!node.parent && attachment) node.parent = { iri: attachment };
		for (const node of result.newUnits)
			if (node.parent && 'iri' in node.parent)
				node.parent.iri = absoluteProjectIri(project, node.parent.iri);
		for (const mapping of result.mappings)
			if (mapping.action === 'set' && 'iri' in mapping.target)
				mapping.target.iri = absoluteProjectIri(project, mapping.target.iri);
		return result;
	}
	async function preflight() {
		busy = true;
		error = '';
		review = null;
		confirmed = false;
		try {
			const result = await archiveRequest<StructureReview>(structurePath(project, 'preflight'), {
				plan: effectivePlan()
			});
			if (!/^[a-f0-9]{64}$/.test(result.reviewDigest) || !result.counts)
				throw new Error('Invalid review.');
			review = result;
			reviewedJson = JSON.stringify({ plan: $state.snapshot(plan), attachment });
		} catch (e) {
			error = String(e);
		} finally {
			busy = false;
		}
	}
	async function apply() {
		if (!access?.canManageStructure || blocked || busy) return;
		busy = true;
		error = '';
		try {
			if (!pending) {
				if (!confirmed || !review) return;
				const command = {
					id: crypto.randomUUID(),
					plan: effectivePlan(),
					reviewDigest: review.reviewDigest
				};
				sessionStorage.setItem(storageKey, JSON.stringify(command));
				pending = command;
			}
			const receipt = await archiveRequest<{ state: string; operationId: string }>(
				structurePath(project, 'apply'),
				{ plan: pending.plan, reviewDigest: pending.reviewDigest, confirm: true },
				'POST',
				pending.id
			);
			if (receipt.state !== 'committed' || receipt.operationId !== pending.id)
				throw new Error('Invalid apply receipt.');
			sessionStorage.removeItem(storageKey);
			pending = null;
			plan = null;
			review = null;
			notice = m.archive_done();
		} catch (e) {
			error = String(e);
			if (isDefiniteRejection(e)) {
				sessionStorage.removeItem(storageKey);
				pending = null;
				review = null;
				confirmed = false;
			}
		} finally {
			busy = false;
		}
	}
	function addGroup() {
		if (!plan || !access?.canCreateUnits) return;
		plan.newUnits.push({
			key: `group_${crypto.randomUUID()}`,
			name: { [getLocale()]: m.archive_new_group() },
			archiveLevel: 'shared:Series',
			parent: null
		});
	}
	function removeGroup(key: string) {
		if (!plan) return;
		const parent = plan.newUnits.find((u) => u.key === key)?.parent ?? null;
		plan.newUnits = plan.newUnits
			.filter((u) => u.key !== key)
			.map((u) => (u.parent && 'key' in u.parent && u.parent.key === key ? { ...u, parent } : u));
		plan.mappings = plan.mappings.map((v) =>
			v.action === 'set' && 'key' in v.target && v.target.key === key
				? { folderIri: v.folderIri, action: 'skip' }
				: v
		);
	}
	function setMapping(index: number, value: string) {
		if (!plan) return;
		const folderIri = plan.mappings[index].folderIri;
		plan.mappings[index] =
			value === 'skip' || value === 'clear'
				? { folderIri, action: value }
				: { folderIri, action: 'set', target: value === 'existing' ? { iri: '' } : { key: value } };
		editingMapping = index;
	}
	async function changeUnit(action: 'save' | 'move' | 'delete') {
		if (!unitReady || !access?.canManageStructure) return;
		if (action === 'delete' && !window.confirm(m.archive_delete_confirm())) return;
		busy = true;
		error = '';
		notice = '';
		try {
			const path = `/data/${encodeURIComponent(project)}/${encodeURIComponent(unit)}`;
			if (action === 'save') {
				const names = unitNames.filter((n) => !n.endsWith(`@${getLocale()}`));
				names.push(`${unitName.trim()}@${getLocale()}`);
				await archiveRequest(path, { 'schema:name': names, 'shared:archiveLevel': unitLevel });
			}
			if (action === 'move')
				await archiveRequest(`${path}/archive-move`, {
					'shared:parentArchiveUnit': parent || null
				});
			if (action === 'delete') {
				await archiveRequest(path, undefined, 'DELETE');
				unit = '';
			}
			unitRevision += 1;
			notice = m.archive_done();
		} catch (e) {
			error = String(e);
		} finally {
			busy = false;
		}
	}
</script>

<section class="administration">
	<h2>Archivstruktur</h2>
	{#if error}<p role="alert">{error}</p>{/if}{#if notice}<p role="status">{notice}</p>{/if}
	{#if access?.enabled && access.canManageStructure}
		{#if pending}<button disabled={busy} onclick={apply}>{m.archive_retry()}</button>{/if}
		<fieldset disabled={busy || !!pending || blocked}>
			<legend>{m.archive_existing()}</legend>
			{#key unitRevision}<ArchiveUnitPicker {project} bind:value={unit} />{/key}
			{#if unitReady}
				<label>{m.archive_name()}<input bind:value={unitName} /></label>
				<label
					>{m.archive_level()}<select bind:value={unitLevel}
						>{#each archiveLevels as level, i (level)}<option value={level}>{levelLabels[i]}</option
							>{/each}</select
					></label
				>
				<button disabled={!unitName.trim()} onclick={() => changeUnit('save')}
					>{m.archive_save()}</button
				>
				<h2>{m.archive_parent()}</h2>
				<ArchiveUnitPicker {project} bind:value={parent} />
				<button disabled={parent === unit} onclick={() => changeUnit('move')}
					>{m.archive_move()}</button
				>
				<button onclick={() => changeUnit('delete')}>{m.archive_delete_empty()}</button>
			{/if}
		</fieldset>
		<details>
			<summary>Struktur ergänzen – aus Arbeitsordnern übernehmen</summary>
			<fieldset disabled={busy || !!pending || blocked}>
				<legend>{m.archive_propose()}</legend>
				<label
					>{m.archive_source()}<select bind:value={source}
						><option value="">—</option
						>{#each folders.filter((f) => !['top', 'Trash', 'Mobile'].includes(localizedText(f['schema:name'], getLocale()) ?? '')) as folder (folder.iri)}<option
								value={folder.iri}>{folderLabel(folder.iri)}</option
							>{/each}</select
					></label
				>
				<button disabled={!source} onclick={propose}>{m.archive_propose()}</button>
				{#if plan}
					<h2>{m.archive_parent()}</h2>
					<ArchiveUnitPicker {project} bind:value={attachment} />
					{#each plan.newUnits as node (node.key)}
						<div class="node">
							<label
								>{m.archive_name()}<input
									value={node.name[getLocale()] ?? Object.values(node.name)[0] ?? ''}
									oninput={(e) => (node.name[getLocale()] = e.currentTarget.value)}
								/></label
							>
							<label
								>{m.archive_level()}<select bind:value={node.archiveLevel}
									>{#each archiveLevels as level, i (level)}<option value={level}
											>{levelLabels[i]}</option
										>{/each}</select
								></label
							>
							<label
								>{m.archive_parent()}<select
									value={node.parent && 'key' in node.parent
										? node.parent.key
										: node.parent
											? 'existing'
											: ''}
									onchange={(e) =>
										(node.parent = e.currentTarget.value ? { key: e.currentTarget.value } : null)}
									><option value="">—</option>{#if node.parent && 'iri' in node.parent}<option
											value="existing">{m.archive_existing()}</option
										>{/if}{#each plan.newUnits.filter((v) => v.key !== node.key) as candidate (candidate.key)}<option
											value={candidate.key}
											>{candidate.name[getLocale()] ?? Object.values(candidate.name)[0]}</option
										>{/each}</select
								></label
							>
							<button onclick={() => removeGroup(node.key)}>{m.archive_remove()}</button>
						</div>
					{/each}
					<button disabled={!access.canCreateUnits} onclick={addGroup}
						>{m.archive_new_group()}</button
					>
					<h2>{m.archive_mapping()}</h2>
					{#each plan.mappings as mapping, i (mapping.folderIri)}
						<div class="mapping">
							<label
								>{proposal?.folders.find((f) => f.iri === mapping.folderIri)?.name ??
									folderLabel(mapping.folderIri)}<select
									disabled={proposal?.folders.find((f) => f.iri === mapping.folderIri)
										?.mappingState === 'unavailable'}
									value={mapping.action === 'set'
										? 'key' in mapping.target
											? mapping.target.key
											: 'existing'
										: mapping.action}
									onchange={(e) => setMapping(i, e.currentTarget.value)}
									><option value="skip">{m.archive_keep()}</option><option value="clear"
										>{m.archive_none()}</option
									><option value="existing">{m.archive_existing()}</option
									>{#each plan.newUnits as node (node.key)}<option value={node.key}
											>{node.name[getLocale()] ?? Object.values(node.name)[0]}</option
										>{/each}</select
								></label
							>
							{#if mapping.action === 'set' && 'iri' in mapping.target}{#if editingMapping === i}<ArchiveUnitPicker
										{project}
										bind:value={mapping.target.iri}
									/>{:else}<button onclick={() => (editingMapping = i)}>{m.archive_choose()}</button
									>{/if}{/if}
						</div>{/each}
					{#each proposal?.warnings ?? [] as warning, i (i)}<p>{warning.message}</p>{/each}
					<button onclick={preflight}>{m.archive_review()}</button>
				{/if}
			</fieldset>
			{#if review}
				<p>
					{review.counts.create} + · {review.counts.set} ↦ · {review.counts.clear} − · {review
						.counts.skip} =
				</p>
				{#each review.warnings ?? [] as warning, i (i)}<p>{warning.message}</p>{/each}
				<label
					><input
						type="checkbox"
						bind:checked={confirmed}
						disabled={busy || !!pending}
					/>{m.archive_confirm()}</label
				>
				<button disabled={!confirmed || busy || !!pending} onclick={apply}
					>{m.archive_apply()}</button
				>
			{/if}
		</details>
	{:else if access}<p>{m.archive_access_denied()}</p>{:else}<p role="status">…</p>{/if}
</section>

<style>
	summary {
		cursor: pointer;
		padding: 0.6rem 1rem;
		border: 1px solid var(--line);
		border-radius: 0.5rem;
		margin-block: 1rem;
	}
	.administration {
		max-width: 80rem;
		margin: auto;
		padding: clamp(1rem, 4vw, 3rem);
		color: var(--navy);
	}
	fieldset {
		min-width: 0;
		margin: 1rem 0;
		padding: 1rem;
		border: 1px solid var(--line);
		border-radius: 0.5rem;
		background: var(--paper, white);
	}
	h2 {
		font-size: 1.125rem;
		font-weight: 600;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		margin: 0.5rem 0;
	}
	input,
	select,
	button {
		font: inherit;
		padding: 0.6rem;
		border: 1px solid var(--line);
		border-radius: 0.3rem;
		max-width: 100%;
	}
	button {
		cursor: pointer;
		background: white;
		color: var(--teal-dark);
		margin: 0.4rem 0.4rem 0.4rem 0;
	}
	button:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.node {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr auto;
		gap: 0.6rem;
		align-items: end;
	}
	.mapping {
		border-bottom: 1px solid var(--line);
		padding: 0.5rem 0;
	}
	p {
		overflow-wrap: anywhere;
	}
	[role='alert'] {
		color: #a12a2a;
	}
	@media (max-width: 48rem) {
		.node {
			grid-template-columns: 1fr;
		}
	}
</style>
