<script lang="ts">
	import { onMount, tick } from 'svelte';
	import * as client from '$lib/operations/writer-recovery';
	import {
		parseAttempt,
		uuidPattern,
		type RecoveryCapabilities,
		type RecoveryStatus,
		type RecoveryOperation,
		type RecoveryAttempt
	} from '$lib/operations/writer-recovery-contract';
	/** Deployment-wide operator panel. Polling is read-only; mutation retries are explicit
	 * and keep the exact persisted UUID/body. Parent keys this component by user identity. */
	let { userKey }: { userKey: string } = $props();
	let access = $state<RecoveryCapabilities | null>(null);
	let current = $state<RecoveryStatus | null>(null);
	let selected = $state<RecoveryOperation | null>(null);
	let attempt = $state<RecoveryAttempt | null>(null);
	let reason = $state('');
	let confirmed = $state(false);
	let busy = $state(false);
	let error = $state('');
	let lookup = $state('');
	// Native details remains keyboard accessible; collapse never discards an exact retry.
	let expanded = $state(false);
	let blockedAction = $state(false);
	let disclosure = $state<HTMLDetailsElement>();
	async function openAdministration() {
		expanded = true;
		blockedAction = false;
		await tick();
		disclosure?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		disclosure?.querySelector('summary')?.focus();
	}
	function handleToggle(event: Event) {
		expanded = (event.currentTarget as HTMLDetailsElement).open;
		if (expanded) {
			blockedAction = false;
			void refresh();
		}
	}

	let storageKey = '';
	let alive = true;
	const labels: Record<string, string> = {
		free: 'Schreiben ist frei',
		occupied: 'Schreibvorgang belegt die Sperre',
		recovery_required: 'Klärung erforderlich',
		recovery_in_progress: 'Wiederherstellung läuft',
		store_unavailable: 'Sperrdienst nicht erreichbar',
		awaiting_operator: 'Operator-Nachweis ausstehend',
		controller_blocked: 'Operator aktiv oder unterbrochen',
		ready: 'Nachweis liegt vor – Freigabe möglich',
		completed: 'Wiederherstellung abgeschlossen'
	};
	function remember(value: RecoveryAttempt | null) {
		// Persist before sending. If browser storage is unavailable, do not start a write.
		if (value) sessionStorage.setItem(storageKey, JSON.stringify(value));
		else sessionStorage.removeItem(storageKey);
		attempt = value;
	}
	async function readOperation(id: string) {
		const result = await client.operation(id);
		if (!alive) return;
		if (selected?.operationId !== result.operationId || selected?.state !== result.state)
			confirmed = false;
		selected = result;
		lookup = result.operationId;
		if (result.state === 'completed' && attempt?.operationId === id) remember(null);
	}
	async function refresh() {
		if (busy) return;
		busy = true;
		error = '';
		try {
			const permissions = await client.capabilities();
			if (!alive) return;
			access = permissions;
			if (!permissions.canRecover) {
				current = null;
				selected = null;
				return;
			}
			const value = await client.status();
			if (!alive) return;
			if (current?.revision !== value.revision) confirmed = false;
			current = value;
			const id =
				value.operationId ??
				attempt?.operationId ??
				(uuidPattern.test(lookup) ? lookup : undefined);
			if (id) await readOperation(id);
		} catch {
			if (alive) {
				error =
					'Status nicht bestätigt. Aktualisieren oder denselben Vorgang erneut abfragen. Es wurde nichts automatisch freigegeben.';
				current = null;
				selected = null;
			}
		} finally {
			if (alive) busy = false;
		}
	}
	async function start() {
		if (busy || !confirmed || !current?.revision || reason.trim().length < 10) return;
		busy = true;
		error = '';
		try {
			const value = {
				operationId: crypto.randomUUID(),
				expectedRevision: current.revision,
				reason: reason.trim()
			};
			remember(value);
			const result = await client.begin(value);
			if (alive) {
				selected = result;
				lookup = result.operationId;
				confirmed = false;
			}
		} catch {
			if (alive)
				error =
					'Ergebnis nicht bestätigt. Der genaue Auftrag bleibt erhalten. Bitte aktualisieren oder diesen Auftrag erneut senden.';
		} finally {
			if (alive) busy = false;
		}
	}
	function forgetAttempt() {
		remember(null);
		selected = null;
		current = null;
		confirmed = false;
		void refresh();
	}
	async function retry() {
		if (busy || !attempt) return;
		busy = true;
		error = '';
		try {
			const result = await client.begin(attempt);
			if (alive) selected = result;
		} catch {
			if (alive)
				error =
					'Der Auftrag wurde nicht bestätigt. Keine neue Vorgangsnummer erzeugen; Status prüfen oder den Operator kontaktieren.';
		} finally {
			if (alive) busy = false;
		}
	}
	async function release() {
		if (busy || !selected?.canFinish || !confirmed) return;
		busy = true;
		error = '';
		const id = selected.operationId;
		try {
			const result = await client.finish(id);
			if (alive) {
				selected = result;
				current = null;
				confirmed = false;
				if (attempt?.operationId === id) remember(null);
			}
		} catch {
			if (alive) {
				error =
					'Freigabe nicht bestätigt. Dieselbe Vorgangsnummer aktualisieren; ein Nachfolger darf nicht entsperrt werden.';
				selected = null;
			}
		} finally {
			if (alive) busy = false;
		}
	}
	async function find() {
		if (busy || !uuidPattern.test(lookup)) return;
		busy = true;
		error = '';
		try {
			await readOperation(lookup);
		} catch {
			if (alive) {
				selected = null;
				error =
					'Vorgang nicht verfügbar oder keine Berechtigung. Vorgangsnummer und Status prüfen.';
			}
		} finally {
			if (alive) busy = false;
		}
	}
	onMount(() => {
		void (async () => {
			try {
				const scope = await client.storageScope();
				if (!alive) return;
				storageKey = `oldap-writer-recovery:${scope}:${userKey}`;
				const saved = sessionStorage.getItem(storageKey);
				if (saved) attempt = parseAttempt(JSON.parse(saved));
				await refresh();
			} catch {
				if (alive)
					error =
						'Gespeicherter Auftrag konnte nicht gelesen werden. Vorgangsnummer beim Operator erfragen.';
			}
		})();
		// Only failed application requests offer a shortcut; an occupied lock is normal.
		const onBlocked = () => {
			blockedAction = true;
		};
		window.addEventListener('oldap:writer-blocked', onBlocked);
		const timer = setInterval(() => {
			if (expanded && !document.hidden) void refresh();
		}, 15000);
		return () => {
			alive = false;
			clearInterval(timer);
			window.removeEventListener('oldap:writer-blocked', onBlocked);
		};
	});
</script>

{#if access?.canRecover}
	{#if blockedAction && !expanded}
		<aside class="blocked-shortcut" aria-label="Technische Unterstützung">
			<span>Die Aktion konnte wegen einer Schreibblockierung nicht abgeschlossen werden.</span>
			<button onclick={openAdministration}>Technische Verwaltung öffnen</button>
			<button onclick={() => (blockedAction = false)} aria-label="Hinweis schliessen"
				>Schliessen</button
			>
		</aside>
	{/if}
	<details class="recovery" bind:this={disclosure} bind:open={expanded} ontoggle={handleToggle}>
		<summary>Technische Verwaltung</summary>
		<div class="recovery-content">
			<h2>Schreibsperre verwalten</h2>
			<p>
				Gilt für alle Projekte und Schreiber dieses Systems. Das Alter einer Sperre beweist keinen
				Absturz.
			</p>
			<p role="status">{current ? labels[current.state] : 'Status wird geprüft'}</p>
			{#if current?.startedAt}<p>
					Belegt seit: {new Date(current.startedAt).toLocaleString()}
				</p>{/if}
			<button disabled={busy} onclick={refresh}>Status aktualisieren</button>
			{#if selected}
				<h3>{labels[selected.state]}</h3>
				<p>Vorgangsnummer: <code>{selected.operationId}</code></p>
				<p>Begründung: {selected.reason}</p>
				{#if selected.state === 'awaiting_operator' || selected.state === 'controller_blocked'}
					<p>
						Der Operator muss die alten Schreiber stilllegen, offene Datenbankvorgänge klären und
						den Nachweis hinterlegen. Das kann ein Wartungsfenster mit Datenbank-Neustart erfordern.
						Bei einem unterbrochenen Operator-Werkzeug ist zuerst dessen Zustand auf den beteiligten
						Servern zu prüfen.
					</p>
				{/if}
				{#if selected.canFinish}
					<label
						><input type="checkbox" bind:checked={confirmed} disabled={busy} /> Freigabe für diesen Vorgang
						systemweit anfordern</label
					>
					<button disabled={busy || !confirmed} onclick={release}>Geprüfte Sperre freigeben</button>
				{/if}
			{/if}
			{#if !attempt && current?.revision && (!selected || selected.state === 'completed')}
				<label
					>Begründung (mindestens 10 Zeichen)<textarea
						bind:value={reason}
						maxlength="2000"
						disabled={busy}></textarea></label
				>
				<label
					><input type="checkbox" bind:checked={confirmed} disabled={busy} /> Ich starte eine systemweite
					Wartung. Weitere Schreibvorgänge bleiben bis zur geprüften Freigabe blockiert.</label
				>
				<button disabled={busy || !confirmed || reason.trim().length < 10} onclick={start}
					>Wiederherstellung beginnen</button
				>
			{/if}
			{#if attempt && selected?.operationId !== attempt.operationId}
				<p>
					Unbestätigter Auftrag: <code>{attempt.operationId}</code>. Seine Vorgangsnummer und
					Begründung bleiben unverändert.
				</p>
				<button disabled={busy} onclick={retry}>Denselben Auftrag erneut senden</button>
				<p>
					Ein lokaler Wiederholungsauftrag kann entfernt werden; eine Serversperre bleibt dabei
					unverändert.
				</p>
				<button disabled={busy} onclick={forgetAttempt}
					>Lokalen Wiederholungsauftrag entfernen</button
				>
			{/if}
			<label
				>Vorhandene Vorgangsnummer<input
					bind:value={lookup}
					disabled={busy}
					spellcheck="false"
				/></label
			>
			<button disabled={busy || !uuidPattern.test(lookup)} onclick={find}
				>Vorgang nachschlagen</button
			>
			{#if error}<p role="alert">{error}</p>{/if}
		</div>
	</details>
{/if}

<style>
	summary {
		cursor: pointer;
		padding: 0.8rem 1rem;
		font-size: 0.9rem;
		font-weight: 500;
		color: #475569;
	}
	summary:focus-visible {
		outline: 2px solid #0f766e;
		outline-offset: 2px;
	}
	.recovery-content {
		padding: 0 1rem 1rem;
		border-top: 1px solid #e2e8f0;
	}
	.blocked-shortcut {
		position: fixed;
		bottom: 1rem;
		right: 1rem;
		z-index: 100;
		max-width: min(32rem, calc(100vw - 2rem));
		padding: 1rem;
		border: 1px solid #cbd5e1;
		background: white;
		box-shadow: 0 2px 8px #0002;
		color: #334155;
	}

	.recovery {
		border: 1px solid #e2e8f0;
		border-radius: 0.75rem;
		padding: 0;
		margin-block: 1rem;
		background: white;
		color: #0f172a;
	}
	h2 {
		font-size: 1.25rem;
		font-weight: 600;
	}
	h3 {
		font-weight: 600;
		margin-top: 1rem;
	}
	p {
		margin-block: 0.6rem;
	}
	label {
		display: block;
		margin-block: 0.8rem;
	}
	textarea,
	input:not([type='checkbox']) {
		display: block;
		width: 100%;
		max-width: 40rem;
		border: 1px solid #64748b;
		border-radius: 0.3rem;
		padding: 0.4rem;
	}
	button {
		border: 1px solid #64748b;
		border-radius: 0.3rem;
		padding: 0.4rem 0.7rem;
		margin: 0.3rem 0.4rem 0.3rem 0;
		background: white;
		color: #0f172a;
	}
	button:disabled {
		opacity: 0.5;
	}
	[role='alert'] {
		color: #991b1b;
	}
	code {
		overflow-wrap: anywhere;
	}
</style>
