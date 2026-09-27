<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { getApiBaseUrl } from '$lib/api/baseUrl';
	import { m } from '$lib/paraglide/messages';
	// Tokens stay in the URL/in-memory form only; never persist them in browser storage.
	let token = $derived(page.url.searchParams.get('token'));
	let userId = $state('');
	let password = $state('');
	let repeat = $state('');
	let busy = $state(false);
	let message = $state('');
	let error = $state('');
	let done = $state(false);
	async function submit(event: SubmitEvent) {
		event.preventDefault();
		error = '';
		message = '';
		if (token && password !== repeat) {
			error = m.reset_mismatch();
			return;
		}
		busy = true;
		try {
			const response = await fetch(
				`${getApiBaseUrl()}/admin/auth/password-reset/${token ? 'confirm' : 'request'}`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(token ? { token, password } : { userId: userId.trim() })
				}
			);
			const result = await response.json();
			if (!response.ok) throw new Error(result.message || m.mail_request_error());
			message = result.message;
			done = true;
			password = '';
			repeat = '';
		} catch (e) {
			error = e instanceof Error ? e.message : m.mail_request_error();
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head
	><title>{m.reset_title()} · SALSAH</title><meta
		name="referrer"
		content="no-referrer"
	/></svelte:head
>
<main class="mail-page">
	<h1>{m.reset_title()}</h1>
	{#if !done}<form onsubmit={submit}>
			{#if token}
				<label
					>{m.reset_password()}<input
						type="password"
						autocomplete="new-password"
						required
						bind:value={password}
					/></label
				>
				<label
					>{m.reset_repeat()}<input
						type="password"
						autocomplete="new-password"
						required
						bind:value={repeat}
					/></label
				>
			{:else}<label
					>{m.reset_user()}<input autocomplete="username" required bind:value={userId} /></label
				>{/if}
			<button disabled={busy}>{token ? m.reset_confirm() : m.reset_request()}</button>
		</form>{/if}
	{#if error}<p role="alert">{error}</p>{/if}{#if message}<p role="status">{message}</p>{/if}
	<a href={resolve('/login')}>{m.reset_login()}</a>
</main>

<style>
	.mail-page {
		max-width: 36rem;
		margin: 4rem auto;
		padding: 2rem;
	}
	label {
		display: grid;
		gap: 0.5rem;
		margin: 1rem 0;
	}
	input,
	button {
		padding: 0.75rem;
		border: 1px solid var(--line);
		border-radius: 0.3rem;
	}
</style>
