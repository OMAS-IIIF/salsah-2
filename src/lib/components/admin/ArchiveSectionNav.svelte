<script lang="ts">
	/** Section navigation keeps its panels mounted so editing and selection state survives. */
	let {
		value = $bindable(),
		items,
		label = 'Archivbereiche'
	}: {
		value: string;
		items: { id: string; label: string }[];
		label?: string;
	} = $props();
</script>

<nav aria-label={label}>
	{#each items as item (item.id)}
		<button type="button" aria-pressed={value === item.id} onclick={() => (value = item.id)}
			>{item.label}</button
		>
	{/each}
</nav>

<style>
	/* A single baseline and an open active edge connect the selected tab to its panel.
    Horizontal scrolling preserves this relationship on narrow screens. */
	nav {
		display: flex;
		align-items: stretch;
		gap: 0.25rem;
		overflow-x: auto;
		padding: 0.25rem 0.15rem 0;
		margin-block: 1rem;
		background: linear-gradient(#cbd5e1, #cbd5e1) left bottom / 100% 1px no-repeat;
	}
	button {
		flex: 0 0 auto;
		padding: 0.75rem 1.15rem;
		border: 1px solid #cbd5e1;
		border-top: 3px solid transparent;
		border-radius: 0.55rem 0.55rem 0 0;
		color: #64748b;
		background: #f1f5f9;
		font-size: 0.95rem;
		font-weight: 600;
		white-space: nowrap;
		cursor: pointer;
	}
	button:hover {
		background: #e8eef3;
		color: #334155;
	}
	button[aria-pressed='true'] {
		background: white;
		color: #0f766e;
		border-top-color: #0f766e;
		border-bottom-color: white;
	}
	button:focus-visible {
		outline: 2px solid #0f766e;
		outline-offset: -5px;
	}
</style>
