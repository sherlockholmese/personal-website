<!--
	@component
	Disclosure chevron drawn as SVG, so it centers exactly regardless of font metrics.
	`open` turns it to show the expanded state.
-->
<script lang="ts">
	let {
		direction = 'down',
		open = false,
		class: className = ''
	}: { direction?: 'down' | 'right'; open?: boolean; class?: string } = $props();
</script>

<svg
	class={['ui-chevron', `ui-chevron-${direction}`, className]}
	class:ui-chevron-open={open}
	viewBox="0 0 10 10"
	aria-hidden="true"
>
	<path d="M1 3l4 4 4-4" />
</svg>

<style>
	.ui-chevron {
		flex: none;
		width: 10px;
		height: 10px;
		fill: none;
		stroke: currentcolor;
		stroke-linecap: square;
		stroke-width: 1.5;
	}

	.ui-chevron-right {
		transform: rotate(-90deg);
	}

	.ui-chevron-down.ui-chevron-open {
		transform: rotate(180deg);
	}

	.ui-chevron-right.ui-chevron-open {
		transform: none;
	}

	@media (prefers-reduced-motion: no-preference) {
		.ui-chevron {
			transition: transform var(--motion-fast) var(--ease-standard);
		}
	}
</style>
