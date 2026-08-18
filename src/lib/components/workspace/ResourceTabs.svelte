<script lang="ts">
	export interface ResourceTab {
		id: string;
		label: string;
		closeable: boolean;
		color?: 'copper' | 'navy' | 'teal';
	}

	interface Props {
		initialTabs: readonly ResourceTab[];
		ariaLabel: string;
		closeLabel: string;
	}

	let { initialTabs, ariaLabel, closeLabel }: Props = $props();
	let closedIds = $state<Set<string>>(new Set());
	let selectedId = $state<string | null>(null);
	let tabs = $derived(initialTabs.filter((tab) => !closedIds.has(tab.id)));
	let activeId = $derived(
		selectedId && tabs.some((tab) => tab.id === selectedId) ? selectedId : (tabs[0]?.id ?? '')
	);

	function closeTab(event: MouseEvent, id: string): void {
		event.stopPropagation();
		const closingIndex = tabs.findIndex((tab) => tab.id === id);
		const remainingTabs = tabs.filter((tab) => tab.id !== id);
		closedIds = new Set([...closedIds, id]);

		if (activeId === id) {
			selectedId = remainingTabs[Math.max(0, closingIndex - 1)]?.id ?? remainingTabs[0]?.id ?? null;
		}
	}
</script>

<nav class="resource-tabs" aria-label={ariaLabel}>
	{#each tabs as tab (tab.id)}
		<div class:active={tab.id === activeId} class="tab">
			<button class="tab-label" type="button" onclick={() => (selectedId = tab.id)}>
				{#if tab.color}<i class={tab.color}></i>{/if}
				{tab.label}
			</button>
			{#if tab.closeable}
				<button
					class="tab-close"
					type="button"
					aria-label={`${closeLabel}: ${tab.label}`}
					onclick={(event) => closeTab(event, tab.id)}>×</button
				>
			{/if}
		</div>
	{/each}
</nav>

<style>
	.resource-tabs {
		display: flex;
		overflow-x: auto;
		border-bottom: 1px solid var(--line);
	}
	.tab {
		display: flex;
		align-items: center;
		min-width: max-content;
		color: var(--muted);
		border-bottom: 2px solid transparent;
	}
	.tab:hover,
	.tab.active {
		color: var(--navy);
	}
	.tab.active {
		border-bottom-color: var(--teal);
	}
	.tab-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.8rem 0 0.8rem 1.15rem;
		color: inherit;
		background: transparent;
		border: 0;
		font-size: 0.8rem;
		font-weight: 650;
	}
	.tab:not(:has(.tab-close)) .tab-label {
		padding-right: 1.15rem;
	}
	.tab-label i {
		width: 0.55rem;
		height: 0.7rem;
		border-radius: 0.08rem;
	}
	.tab-close {
		width: 2rem;
		height: 2rem;
		margin-right: 0.3rem;
		padding: 0;
		color: #8a959c;
		background: transparent;
		border: 0;
		border-radius: 50%;
		font-size: 1rem;
	}
	.tab-close:hover {
		color: var(--navy);
		background: #e8e3da;
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
	@media (max-width: 520px) {
		.tab-label {
			padding-left: 0.8rem;
		}
		.tab:not(:has(.tab-close)) .tab-label {
			padding-right: 0.8rem;
		}
	}
</style>
