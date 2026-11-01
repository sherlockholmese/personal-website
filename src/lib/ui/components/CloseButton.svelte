<!--
	@component
	The red bordered `X` used by the terminal titlebar, panels, and overlays.
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
		width: var(--control-close);
		height: var(--control-close);
		padding: 0;
		border: 1px solid var(--danger);
		border-radius: 0;
		background: var(--surface);
		color: var(--danger);
		font-weight: 700;
		line-height: 1;
	}

	.ui-close:active {
		background: color-mix(in srgb, var(--danger) 80%, var(--surface));
		color: var(--surface);
		transition-duration: 0ms;
	}

	@media (hover: hover) {
		.ui-close:hover:not(:active) {
			background: var(--danger);
			color: var(--surface);
		}
	}

	@media (prefers-reduced-motion: no-preference) {
		.ui-close {
			transition:
				background-color var(--motion-press) var(--ease-standard),
				color var(--motion-press) var(--ease-standard);
		}
	}
</style>
