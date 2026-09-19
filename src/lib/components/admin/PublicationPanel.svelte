<script lang="ts">
	/** Project-neutral publication review. Unsaved metadata must be saved first.
	 * An uncertain apply survives navigation/reload with its original command ID.
	 */
	import { archiveRequest, ArchiveRequestError } from '$lib/archive/client';
	import { authSession } from '$lib/auth/session';
	import { getApiBaseUrl } from '$lib/api/baseUrl';
	interface Props {
		project: string;
		iri: string;
		disabled?: boolean;
		onpublished: () => void;
		onpolicy: (propertyName: string) => void;
	}
	let { project, iri, disabled = false, onpublished, onpolicy }: Props = $props();
	type Permission = 'DATA_VIEW' | 'DATA_RESTRICTED';
	type Review = { revision: string; resources: { iri: string; permission: Permission }[] };
	type Command = {
		id: string;
		body: { resourceIri: string; permission: Permission; revision: string };
	};
	let allowed = $state(false);
	let busy = $state(false);
	let error = $state('');
	let permission = $state<Permission>('DATA_VIEW');
	let review = $state<Review | null>(null);
	let pending = $state<Command | null>(null);
	const path = $derived(`/archive/${encodeURIComponent(project)}/publication`);
	const key = $derived(
		JSON.stringify([
			'oldap-publication-v1',
			getApiBaseUrl(),
			$authSession.user?.userIri,
			project,
			iri
		])
	);
	$effect(() => {
		const requestedPath = path,
			requestedIri = iri,
			requestedKey = key;
		let cancelled = false;
		allowed = false;
		review = null;
		error = '';
		const stored = sessionStorage.getItem(requestedKey);
		pending = stored ? (JSON.parse(stored) as Command) : null;
		void archiveRequest<{ enabled: boolean; canPublish: boolean; statusPropertyName?: string }>(
			`${requestedPath}/capabilities?resourceIri=${encodeURIComponent(requestedIri)}`
		)
			.then((value) => {
				if (!cancelled) {
					allowed = value.canPublish;
					onpolicy(value.enabled ? (value.statusPropertyName ?? '') : '');
				}
			})
			.catch((reason) => {
				if (!cancelled && !(reason instanceof ArchiveRequestError && reason.status === 404))
					error = String(reason);
			});
		return () => {
			cancelled = true;
		};
	});
	async function preview() {
		if (busy || disabled) return;
		busy = true;
		error = '';
		try {
			review = await archiveRequest<Review>(`${path}/preview`, { resourceIri: iri, permission });
		} catch (reason) {
			error = String(reason);
		} finally {
			busy = false;
		}
	}
	async function apply() {
		if (busy || disabled || (!review && !pending)) return;
		busy = true;
		error = '';
		try {
			const command = pending ?? {
				id: crypto.randomUUID(),
				body: { resourceIri: iri, permission, revision: review!.revision }
			};
			sessionStorage.setItem(key, JSON.stringify(command));
			pending = command;
			await archiveRequest(`${path}/apply`, command.body, 'POST', command.id);
			sessionStorage.removeItem(key);
			pending = null;
			review = null;
			onpublished();
		} catch (reason) {
			if (reason instanceof ArchiveRequestError && [400, 409, 422].includes(reason.status)) {
				sessionStorage.removeItem(key);
				pending = null;
				review = null;
			}
			error = String(reason);
		} finally {
			busy = false;
		}
	}
</script>

{#if allowed}
	<section class="rounded border p-4" aria-label="Publikation" aria-busy={busy}>
		<p>Publikation des gespeicherten Eintrags und seiner verknüpften Medien</p>
		{#if disabled}<p>Zuerst die Metadaten speichern.</p>{/if}
		<label
			>Öffentliche Sichtbarkeit
			<select bind:value={permission} disabled={busy || disabled || !!pending || !!review}>
				<option value="DATA_VIEW">Vollständig lesbar</option>
				<option value="DATA_RESTRICTED">Eingeschränkt lesbar</option>
			</select>
		</label>
		{#if pending}
			<p>Die letzte Publikation ist noch nicht bestätigt. Derselbe Auftrag wird erneut geprüft.</p>
			<button type="button" disabled={busy || disabled} onclick={apply}
				>Ergebnis bestätigen / erneut versuchen</button
			>
		{:else if review}
			<p>
				{review.resources.length} Einträge und Medien werden gemeinsam publiziert. Die übrigen Rechte
				bleiben erhalten.
			</p>
			<ul>
				{#each review.resources as resource (resource.iri)}<li>
						{resource.iri}: {resource.permission}
					</li>{/each}
			</ul>
			<button type="button" disabled={busy || disabled} onclick={apply}>Jetzt publizieren</button>
			<button
				type="button"
				disabled={busy}
				onclick={() => {
					review = null;
				}}>Abbrechen</button
			>
		{:else}
			<button type="button" disabled={busy || disabled} onclick={preview}>Publikation prüfen</button
			>
		{/if}
		{#if busy}<p role="status">Publikation wird geprüft …</p>{/if}
	</section>
{/if}
{#if error}<p role="alert">{error}</p>{/if}
