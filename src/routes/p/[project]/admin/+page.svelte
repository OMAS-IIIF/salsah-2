<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages';
	import { projectAdministrationPath } from '$lib/projects/context';

	let project = $derived(page.params.project ?? '');
</script>

<svelte:head><title>{m.admin_title()} · SALSAH 2.0</title></svelte:head>

<div class="admin-page">
	<header>
		<p>{m.admin_kicker()}</p>
		<h1>{m.admin_title()}</h1>
		<span>{m.admin_intro()}</span>
	</header>

	<section class="module-grid" aria-label={m.admin_modules()}>
		<a
			class="module active"
			href={resolve(projectAdministrationPath(project, 'archive') as Pathname)}
			><i aria-hidden="true">▤</i>
			<div>
				<small>{m.admin_available()}</small>
				<h2>{m.archive_admin_title()}</h2>
				<p>{m.archive_admin_intro()}</p>
			</div>
			<b aria-hidden="true">→</b></a
		>
		<a
			class="module active"
			href={resolve(projectAdministrationPath(project, 'stories') as Pathname)}
		>
			<i aria-hidden="true">¶</i>
			<div>
				<small>{m.admin_available()}</small>
				<h2>{m.admin_stories_title()}</h2>
				<p>{m.admin_stories_description()}</p>
			</div>
			<b aria-hidden="true">→</b>
		</a>

		<a
			class="module active"
			href={resolve(projectAdministrationPath(project, 'staging') as Pathname)}
		>
			<i aria-hidden="true">▰</i>
			<div>
				<small>{m.admin_available()}</small>
				<h2>{m.admin_staging_title()}</h2>
				<p>{m.admin_staging_description()}</p>
			</div>
			<b aria-hidden="true">→</b>
		</a>

		<a
			class="module active"
			href={resolve(projectAdministrationPath(project, 'resources') as Pathname)}
		>
			<i aria-hidden="true">▦</i>
			<div>
				<small>{m.admin_available()}</small>
				<h2>{m.admin_resources_title()}</h2>
				<p>{m.admin_resources_description()}</p>
			</div>
			<b aria-hidden="true">→</b>
		</a>

		<div class="module planned">
			<i aria-hidden="true">◇</i>
			<div>
				<small>{m.admin_planned()}</small>
				<h2>{m.admin_access_title()}</h2>
				<p>{m.admin_access_description()}</p>
			</div>
		</div>
	</section>
</div>

<style>
	.admin-page {
		max-width: 86rem;
		margin: auto;
		padding: clamp(2rem, 5vw, 4.5rem) clamp(1.1rem, 4vw, 4rem);
	}
	header {
		max-width: 58rem;
		margin-bottom: 2.5rem;
	}
	header > p,
	.module small {
		margin: 0 0 0.5rem;
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
		font-size: clamp(2.5rem, 6vw, 4.8rem);
		letter-spacing: -0.045em;
		line-height: 1;
	}
	header > span {
		display: block;
		max-width: 50rem;
		margin-top: 1rem;
		color: var(--muted);
		font-size: 1.02rem;
		line-height: 1.65;
	}
	.module-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 1rem;
	}
	.module {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: start;
		gap: 1rem;
		min-height: 12rem;
		padding: 1.35rem;
		color: inherit;
		background: rgb(255 253 248 / 94%);
		border: 1px solid var(--line);
		border-radius: 0.7rem;
		box-shadow: 0 3px 16px rgb(17 44 70 / 4%);
		text-decoration: none;
	}
	.module > i {
		display: grid;
		place-items: center;
		width: 3rem;
		height: 3rem;
		color: white;
		background: var(--navy);
		border-radius: 0.55rem;
		font-family: Georgia, serif;
		font-size: 1.3rem;
		font-style: normal;
	}
	.module h2 {
		font-size: 1.5rem;
	}
	.module p {
		margin: 0.65rem 0 0;
		color: var(--muted);
		font-size: 0.82rem;
		line-height: 1.55;
	}
	.module > b {
		color: var(--teal);
	}
	.module.active:hover {
		border-color: var(--teal);
		box-shadow: 0 8px 25px rgb(17 44 70 / 10%);
	}
	.module.planned {
		opacity: 0.68;
	}
	.module.planned > i {
		background: #6d7a84;
	}
	@media (max-width: 68rem) {
		.module-grid {
			grid-template-columns: 1fr;
		}
		.module {
			min-height: 0;
		}
	}
</style>
