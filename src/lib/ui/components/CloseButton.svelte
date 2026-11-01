<!--
	@component
	The red bordered `X` used by the terminal titlebar, panels, and overlays. Grows to a
	40px touch target below the 760px breakpoint.
-->
<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';

	let {
		label = 'Close',
		ref = $bindable<HTMLButtonElement | undefined>(),
		class: className = '',
		...rest
	}: { label?: string; ref?: HTMLButtonElement; class?: string } & Omit<
		HTMLButtonAttributes,
		'children'
	> = $props();
</script>

<button bind:this={ref} type="button" class={['ui-close', className]} aria-label={label} {...rest}>
	X
</button>

<style>
	.ui-close {
		display: inline-flex;
		flex: none;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		padding: 0;
		border: 1px solid var(--red);
		border-radius: 0;
		background: var(--bg);
		color: var(--red);
		font-weight: 700;
		line-height: 1;
		cursor: pointer;
		touch-action: manipulation;
	}

	.ui-close:hover,
	.ui-close:focus-visible {
		background: var(--red);
		color: var(--bg);
		outline: none;
	}

	@media (max-width: 760px) {
		.ui-close {
			width: 40px;
			height: 40px;
			font-size: 18px;
		}
	}
</style>
