<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import { page } from '$app/state';
	import { login } from '$lib/auth/session';
	import { safeReturnPath } from '$lib/auth/navigation';
	import { m } from '$lib/paraglide/messages';

	let userId = $state('');
	let password = $state('');
	let submitting = $state(false);
	let errorMessage = $state('');

	async function submit(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		errorMessage = '';
		submitting = true;
		try {
			await login(userId.trim(), password);
			await goto(resolve(safeReturnPath(page.url.searchParams.get('next')) as Pathname));
		} catch (error) {
			const code = error instanceof Error ? error.message : '';
			errorMessage =
				code === 'LOGIN_INVALID'
					? m.login_invalid()
					: code === 'LOGIN_UNAVAILABLE'
						? m.login_unavailable()
						: m.login_failed();
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head><title>{m.login_title()} · SALSAH 2.0</title></svelte:head>

<main class="login-page">
	<section class="login-introduction">
		<a href={resolve('/')} class="login-brand" aria-label={m.home_label()}>
			<img src="/brand/salsah-2.0-logo-horizontal.svg" alt="SALSAH 2.0" />
		</a>
		<div>
			<p class="eyebrow">{m.login_environment()}</p>
			<h1>{m.login_welcome()}</h1>
			<p>{m.login_intro()}</p>
		</div>
		<p class="hosting-note"><span aria-hidden="true">◇</span>{m.login_hosting_note()}</p>
	</section>

	<section class="login-panel" aria-labelledby="login-heading">
		<div class="panel-heading">
			<p class="eyebrow">{m.login_account()}</p>
			<h2 id="login-heading">{m.login_title()}</h2>
			<p>{m.login_prompt()}</p>
		</div>

		{#if errorMessage}
			<div class="login-error" role="alert">{errorMessage}</div>
		{/if}

		<form onsubmit={submit}>
			<label for="user-id">{m.login_user_id()}</label>
			<input
				id="user-id"
				name="userId"
				type="text"
				bind:value={userId}
				autocomplete="username"
				required
			/>

			<div class="password-label"><label for="password">{m.login_password()}</label></div>
			<input
				id="password"
				name="password"
				type="password"
				bind:value={password}
				autocomplete="current-password"
				required
			/>

			<button class="submit-button" type="submit" disabled={submitting}>
				{submitting ? m.login_submitting() : m.login_submit()}
				<span aria-hidden="true">→</span>
			</button>
		</form>

		<p class="privacy-note">{m.login_privacy()}</p>
	</section>
</main>

<style>
	.login-page {
		display: grid;
		grid-template-columns: minmax(20rem, 1.1fr) minmax(24rem, 0.9fr);
		min-height: 100vh;
		background: var(--paper);
	}
	.login-introduction {
		position: relative;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		min-height: 100vh;
		padding: clamp(2rem, 5vw, 5rem);
		overflow: hidden;
		color: white;
		background: var(--navy);
	}
	.login-introduction::before,
	.login-introduction::after {
		position: absolute;
		border: 1px solid rgb(36 184 178 / 22%);
		border-radius: 50%;
		content: '';
	}
	.login-introduction::before {
		right: -12rem;
		bottom: -10rem;
		width: 34rem;
		height: 34rem;
	}
	.login-introduction::after {
		right: 4rem;
		bottom: 5rem;
		width: 13rem;
		height: 13rem;
	}
	.login-brand {
		position: relative;
		z-index: 1;
		display: block;
		width: min(15rem, 55%);
		padding: 0.8rem 1rem;
		background: var(--paper);
		border-radius: 0.45rem;
	}
	.login-brand img {
		display: block;
		width: 100%;
	}
	.login-introduction > div {
		position: relative;
		z-index: 1;
		max-width: 38rem;
		margin-block: auto;
		padding-block: 4rem;
	}
	.eyebrow {
		margin: 0 0 0.65rem;
		color: #d59a77;
		font-size: 0.69rem;
		font-weight: 750;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}
	h1,
	h2 {
		margin: 0;
		font-family: Georgia, 'Times New Roman', serif;
		font-weight: 500;
	}
	.login-introduction h1 {
		max-width: 34rem;
		font-size: clamp(2.8rem, 6vw, 5.5rem);
		letter-spacing: -0.045em;
		line-height: 0.98;
	}
	.login-introduction > div > p:last-child {
		max-width: 32rem;
		margin: 1.5rem 0 0;
		color: #c9d4dc;
		font-size: clamp(1rem, 1.5vw, 1.2rem);
		line-height: 1.65;
	}
	.hosting-note {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin: 0;
		color: #b9c7d1;
		font-size: 0.75rem;
	}
	.hosting-note span {
		color: var(--teal);
		font-size: 1.2rem;
	}
	.login-panel {
		align-self: center;
		width: min(27rem, calc(100% - 3rem));
		margin: auto;
		padding: 3rem 0;
	}
	.panel-heading h2 {
		color: var(--navy);
		font-size: 2.25rem;
	}
	.panel-heading > p:last-child {
		margin: 0.7rem 0 0;
		color: var(--muted);
		line-height: 1.5;
	}
	.login-error {
		margin: 1.5rem 0 -1rem;
		padding: 0.8rem 1rem;
		color: #8b3228;
		background: #f9e7e2;
		border: 1px solid #e9c2b7;
		border-radius: 0.45rem;
		font-size: 0.82rem;
		line-height: 1.4;
	}
	form {
		display: grid;
		margin-top: 2rem;
	}
	label {
		color: var(--navy);
		font-size: 0.75rem;
		font-weight: 700;
	}
	input {
		width: 100%;
		height: 3.1rem;
		margin-top: 0.45rem;
		padding: 0 0.85rem;
		color: var(--ink);
		background: #faf8f3;
		border: 1px solid var(--line);
		border-radius: 0.45rem;
	}
	input:focus {
		background: white;
		border-color: var(--teal);
		outline: 3px solid rgb(22 143 138 / 14%);
	}
	.password-label {
		margin-top: 1.25rem;
	}
	.submit-button {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 3.2rem;
		margin-top: 1.7rem;
		padding: 0.7rem 1rem;
		color: white;
		background: var(--copper);
		border: 0;
		border-radius: 0.45rem;
		font-weight: 700;
	}
	.submit-button:hover {
		background: var(--copper-dark);
	}
	.submit-button:disabled {
		cursor: wait;
		opacity: 0.65;
	}
	.submit-button span {
		font-size: 1.2rem;
	}
	.privacy-note {
		margin: 1.5rem 0 0;
		color: #7a858d;
		font-size: 0.68rem;
		line-height: 1.5;
		text-align: center;
	}
	@media (max-width: 760px) {
		.login-page {
			grid-template-columns: 1fr;
		}
		.login-introduction {
			min-height: auto;
			padding: 1.5rem;
		}
		.login-introduction > div {
			padding: 4rem 0 3rem;
		}
		.login-introduction h1 {
			font-size: clamp(2.5rem, 12vw, 4rem);
		}
		.hosting-note {
			display: none;
		}
		.login-panel {
			padding: 3rem 0 4rem;
		}
	}
</style>
