<script lang="ts">
	import { onMount } from 'svelte';
	import LiveResourceList from '$lib/components/resources/LiveResourceList.svelte';
	import ResourceTabs from '$lib/components/workspace/ResourceTabs.svelte';
	import { authSession } from '$lib/auth/session';
	import { demoWorkspace } from '$lib/demo/workspace';
	import { m } from '$lib/paraglide/messages';
	import { projectContext } from '$lib/projects/context';
	import { getGreetingPeriod, type GreetingPeriod } from '$lib/utils/greeting';

	let greetingPeriod = $state<GreetingPeriod | null>(null);
	let greeting = $derived.by(() => {
		const name = $authSession.status === 'authenticated' ? $authSession.user.givenName : '';
		const message = greetingPeriod
			? {
					morning: m.greeting_morning,
					afternoon: m.greeting_afternoon,
					evening: m.greeting_evening
				}[greetingPeriod]
			: m.greeting_welcome;
		return message({ name });
	});

	onMount(() => {
		greetingPeriod = getGreetingPeriod(new Date().getHours());
	});
</script>

<div class="page-shell">
	<header class="page-heading">
		<div>
			<p class="eyebrow">{m.workspace_eyebrow()}</p>
			<h1>{greeting}</h1>
			<p class="intro">{m.workspace_intro()}</p>
		</div>
		<div class="heading-actions">
			<button class="button secondary" type="button"
				><span aria-hidden="true">⇧</span>{m.import_action()}</button
			>
			<button class="button primary" type="button"
				><span aria-hidden="true">＋</span>{m.create_action()}</button
			>
		</div>
	</header>

	<ResourceTabs
		initialTabs={demoWorkspace.tabs}
		ariaLabel={m.open_resources()}
		closeLabel={m.close_tab()}
	/>

	{#if $projectContext.current}
		<LiveResourceList project={$projectContext.current.projectShortName} />
	{/if}

	<div class="content-grid">
		<div class="main-column">
			<section class="stats" aria-label={m.archive_overview()}>
				<article>
					<span class="stat-icon navy">▤</span>
					<div><strong>14’286</strong><small>{m.stat_resources()}</small></div>
					<em>+128 {m.since_last_month()}</em>
				</article>
				<article>
					<span class="stat-icon copper">▰</span>
					<div><strong>37</strong><small>{m.stat_collections()}</small></div>
					<em>4 {m.active_projects()}</em>
				</article>
				<article>
					<span class="stat-icon teal">♙</span>
					<div><strong>8</strong><small>{m.stat_researchers()}</small></div>
					<em>{m.team_activity()}</em>
				</article>
			</section>

			<section class="panel" id="archive">
				<header class="panel-heading">
					<div>
						<p class="kicker">{m.archive_kicker()}</p>
						<h2>{m.archive_title()}</h2>
					</div>
					<a href="#all">{m.show_all()}</a>
				</header>
				<div class="collections">
					<div class="collection open">
						<span class="arrow">⌄</span><span class="folder"></span><span
							><strong>{m.collection_estates()}</strong><small>4’218 {m.objects()}</small></span
						><time>{m.updated_today()}</time>
					</div>
					<div class="children">
						<div class="collection">
							<span class="arrow">›</span><span class="folder small"></span><span
								><strong>Nachlass Jacob Burckhardt</strong><small>1’842 {m.objects()}</small></span
							><time>{m.updated_yesterday()}</time>
						</div>
						<div class="collection">
							<span class="arrow">›</span><span class="folder small"></span><span
								><strong>Familienarchiv Vischer</strong><small>963 {m.objects()}</small></span
							><time>{m.updated_last_week()}</time>
						</div>
					</div>
					<div class="collection">
						<span class="arrow">›</span><span class="folder"></span><span
							><strong>{m.collection_photos()}</strong><small>6’734 {m.objects()}</small></span
						><time>{m.updated_two_days()}</time>
					</div>
					<div class="collection">
						<span class="arrow">›</span><span class="folder"></span><span
							><strong>{m.collection_oral_history()}</strong><small>486 {m.objects()}</small></span
						><time>{m.updated_last_week()}</time>
					</div>
				</div>
			</section>
		</div>

		<aside class="context-column" aria-label={m.context_panel()}>
			<section class="context-card">
				<p class="kicker">{m.context_kicker()}</p>
				<h2>{m.context_title()}</h2>
				<p>{m.context_intro()}</p>
				<div class="activity">
					<div>
						<i class="copper">LR</i>
						<p>
							<strong>{m.activity_you()}</strong>
							{m.activity_edited()}<small>{m.time_minutes()}</small>
						</p>
					</div>
					<div>
						<i class="teal">AM</i>
						<p><strong>Anna Meier</strong> {m.activity_added()}<small>{m.time_hours()}</small></p>
					</div>
					<div>
						<i class="navy">PK</i>
						<p>
							<strong>Peter Keller</strong>
							{m.activity_linked()}<small>{m.time_yesterday()}</small>
						</p>
					</div>
				</div>
			</section>
			<section class="research-note">
				<span>✦</span>
				<p class="kicker">{m.note_kicker()}</p>
				<h3>{m.note_title()}</h3>
				<p>{m.note_text()}</p>
				<a href="#note">{m.open_note()} →</a>
			</section>
		</aside>
	</div>
</div>

<style>
	.page-shell {
		max-width: 112rem;
		margin: auto;
		padding: 2.6rem clamp(1.25rem, 3vw, 3.5rem) 4rem;
	}
	.page-heading {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 2rem;
		margin-bottom: 2rem;
	}
	.eyebrow,
	.kicker {
		margin: 0 0 0.45rem;
		color: var(--copper-dark);
		font-size: 0.68rem;
		font-weight: 750;
		letter-spacing: 0.13em;
		text-transform: uppercase;
	}
	h1,
	h2,
	h3 {
		margin: 0;
		color: var(--navy);
		font-family: Georgia, 'Times New Roman', serif;
		font-weight: 500;
	}
	h1 {
		font-size: clamp(2rem, 4vw, 3.15rem);
		letter-spacing: -0.035em;
		line-height: 1.05;
	}
	h2 {
		font-size: 1.35rem;
	}
	.intro {
		max-width: 43rem;
		margin: 0.65rem 0 0;
		color: var(--muted);
		line-height: 1.55;
	}
	.heading-actions {
		display: flex;
		gap: 0.65rem;
		flex: 0 0 auto;
	}
	.button {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		min-height: 2.8rem;
		padding: 0.65rem 1rem;
		border-radius: 0.45rem;
		font-weight: 680;
	}
	.button.primary {
		color: white;
		background: var(--copper);
		border: 1px solid var(--copper);
	}
	.button.secondary {
		color: var(--navy);
		background: var(--paper);
		border: 1px solid var(--line);
	}
	.button:hover {
		filter: brightness(0.95);
	}
	.content-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 18.5rem;
		gap: 1.5rem;
		margin-top: 1.5rem;
	}
	.main-column {
		display: grid;
		gap: 1.5rem;
		min-width: 0;
	}
	.stats {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1rem;
	}
	.stats article,
	.panel,
	.context-card,
	.research-note {
		background: rgb(255 253 248 / 90%);
		border: 1px solid var(--line);
		border-radius: 0.8rem;
		box-shadow: 0 2px 8px rgb(17 44 70 / 3%);
	}
	.stats article {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.3rem 0.85rem;
		align-items: center;
		padding: 1rem;
	}
	.stat-icon {
		display: grid;
		place-items: center;
		width: 2.8rem;
		height: 2.8rem;
		grid-row: 1/3;
		color: white;
		border-radius: 0.55rem;
		font-family: Georgia, serif;
		font-size: 1.2rem;
	}
	.stats div {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		min-width: 0;
	}
	.stats strong {
		color: var(--navy);
		font-family: Georgia, serif;
		font-size: 1.5rem;
	}
	.stats small {
		overflow: hidden;
		color: var(--muted);
		font-size: 0.74rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.stats em {
		color: var(--teal);
		font-size: 0.67rem;
		font-style: normal;
	}
	.panel {
		overflow: hidden;
	}
	.panel-heading {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.25rem 1.35rem 1rem;
	}
	.panel-heading a,
	.research-note a {
		color: var(--teal);
		font-size: 0.74rem;
		font-weight: 700;
		text-decoration: none;
	}
	.collections {
		border-top: 1px solid #e8e3da;
	}
	.collection {
		display: grid;
		grid-template-columns: 1rem 1.8rem minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.65rem;
		min-height: 4rem;
		padding: 0.55rem 1.25rem;
		border-bottom: 1px solid #ece8e0;
	}
	.collection:hover {
		background: #faf7f1;
	}
	.arrow {
		color: #8c969d;
		font-size: 1.2rem;
	}
	.folder {
		position: relative;
		width: 1.65rem;
		height: 1.2rem;
		background: #d8b189;
		border-radius: 0.15rem;
	}
	.folder::before {
		position: absolute;
		top: -0.25rem;
		left: 0.1rem;
		width: 0.75rem;
		height: 0.35rem;
		background: #c99a70;
		border-radius: 0.12rem 0.12rem 0 0;
		content: '';
	}
	.folder.small {
		transform: scale(0.86);
	}
	.collection > span:nth-child(3) {
		display: grid;
		gap: 0.12rem;
	}
	.collection strong {
		font-family: Georgia, serif;
		font-size: 0.91rem;
		font-weight: 600;
	}
	.collection small,
	.collection time {
		color: var(--muted);
		font-size: 0.67rem;
	}
	.children {
		position: relative;
		padding-left: 1.8rem;
		background: #fcfaf5;
	}
	.children::before {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 2.25rem;
		width: 1px;
		background: #ddd5c9;
		content: '';
	}
	.context-column {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.context-card,
	.research-note {
		padding: 1.25rem;
	}
	.context-card > p:not(.kicker),
	.research-note > p:not(.kicker) {
		color: var(--muted);
		font-size: 0.77rem;
		line-height: 1.55;
	}
	.activity {
		display: grid;
		gap: 1rem;
		margin-top: 1.2rem;
	}
	.activity > div {
		display: grid;
		grid-template-columns: 2rem 1fr;
		gap: 0.65rem;
	}
	.activity i {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		color: white;
		border-radius: 50%;
		font-size: 0.57rem;
		font-style: normal;
		font-weight: 750;
	}
	.activity p {
		margin: 0.05rem 0;
		color: #566673;
		font-size: 0.7rem;
		line-height: 1.35;
	}
	.activity p strong {
		color: var(--navy);
	}
	.activity small {
		display: block;
		margin-top: 0.15rem;
		color: #899298;
	}
	.research-note {
		position: relative;
		overflow: hidden;
		background: #e9e1d4;
		border-color: #d4c7b6;
	}
	.research-note > span {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		margin-bottom: 1rem;
		color: var(--copper-dark);
		background: rgb(255 255 255 / 45%);
		border-radius: 50%;
	}
	.research-note h3 {
		font-size: 1.08rem;
	}
	.copper {
		background: var(--copper);
	}
	.navy {
		background: var(--navy);
	}
	.teal {
		background: var(--teal);
	}
	@media (max-width: 1100px) {
		.content-grid {
			grid-template-columns: 1fr;
		}
		.context-column {
			display: grid;
			grid-template-columns: 1fr 1fr;
		}
	}
	@media (max-width: 780px) {
		.page-shell {
			padding: 1.6rem 1rem 3rem;
		}
		.page-heading {
			align-items: flex-start;
			flex-direction: column;
		}
		.heading-actions {
			width: 100%;
		}
		.button {
			flex: 1;
			justify-content: center;
		}
		.stats {
			grid-template-columns: 1fr;
		}
		.stats article {
			grid-template-columns: auto 1fr auto;
		}
		.stat-icon {
			grid-row: auto;
		}
		.context-column {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 520px) {
		.intro {
			font-size: 0.9rem;
		}
		.collection time {
			display: none;
		}
		.collection {
			grid-template-columns: 1rem 1.8rem minmax(0, 1fr);
			padding-inline: 0.8rem;
		}
		.children {
			padding-left: 0.6rem;
		}
		.children::before {
			left: 1.1rem;
		}
	}
</style>
