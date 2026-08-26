<script lang="ts">
	import { onMount } from 'svelte';
	import LiveResourceList from '$lib/components/resources/LiveResourceList.svelte';
	import { authSession } from '$lib/auth/session';
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
		<p class="eyebrow">{m.workspace_eyebrow()}</p>
		<h1>{greeting}</h1>
		<p class="intro">{m.workspace_intro()}</p>
	</header>

	{#if $projectContext.current}
		<LiveResourceList project={$projectContext.current.projectShortName} />
	{/if}
</div>

<style>
	.page-shell {
		max-width: 112rem;
		margin: auto;
		padding: clamp(1.8rem, 4vw, 3.2rem) clamp(1.1rem, 3vw, 3.5rem) 4rem;
	}
	.page-heading {
		max-width: 58rem;
		margin-bottom: 2rem;
	}
	.eyebrow {
		margin: 0 0 0.45rem;
		color: var(--copper-dark);
		font-size: 0.68rem;
		font-weight: 750;
		letter-spacing: 0.13em;
		text-transform: uppercase;
	}
	h1 {
		margin: 0;
		color: var(--navy);
		font-family: Georgia, 'Times New Roman', serif;
		font-size: clamp(2.2rem, 5vw, 4rem);
		font-weight: 500;
		letter-spacing: -0.04em;
		line-height: 1.03;
	}
	.intro {
		max-width: 48rem;
		margin: 0.75rem 0 0;
		color: var(--muted);
		font-size: clamp(0.9rem, 1.5vw, 1.05rem);
		line-height: 1.55;
	}
</style>
