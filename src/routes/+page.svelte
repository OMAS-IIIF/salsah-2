<script lang="ts">
	import { m } from '$lib/paraglide/messages';
</script>

<div class="route-loading" role="status"><span></span>{m.project_context_loading()}</div>

<style>
	.route-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.7rem;
		min-height: calc(100vh - 5rem);
		color: var(--muted);
		font-size: 0.8rem;
	}
	.route-loading span {
		width: 1rem;
		height: 1rem;
		border: 2px solid #c7cfce;
		border-top-color: var(--teal);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
