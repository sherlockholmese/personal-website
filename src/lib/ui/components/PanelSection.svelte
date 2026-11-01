<!--
	@component
	A labelled row inside a `Panel`, matching the grouped layout of the help panel: a
	cyan label column on the left and content on the right, stacked on mobile.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label,
		labelWidth = '120px',
		headingLevel = 3,
		class: className = '',
		children
	}: {
		label?: string;
		/** Any CSS length for the label column. */
		labelWidth?: string;
		headingLevel?: 2 | 3 | 4 | 5 | 6;
		class?: string;
		children: Snippet;
	} = $props();
</script>

<div
	class={['ui-panel-section', !label && 'ui-panel-section-unlabelled', className]}
	style:--ui-label-width={labelWidth}
>
	{#if label}
		<svelte:element this={`h${headingLevel}`} class="ui-panel-section-label">
			{label}
		</svelte:element>
	{/if}
	<div class="ui-panel-section-body">{@render children()}</div>
</div>

<style>
	.ui-panel-section {
		display: grid;
		grid-template-columns: var(--ui-label-width) minmax(0, 1fr);
		gap: var(--space-3);
		padding: var(--space-2) var(--ui-panel-inset, var(--space-2));
		border-bottom: 1px solid var(--border);
	}

	.ui-panel-section:last-child {
		border-bottom: 0;
	}

	.ui-panel-section-unlabelled {
		grid-template-columns: minmax(0, 1fr);
	}

	.ui-panel-section-label {
		margin: 0;
		color: var(--info);
		font-size: var(--text-body);
		font-weight: 400;
		line-height: 1.45;
	}

	.ui-panel-section-body {
		display: grid;
		min-width: 0;
		gap: var(--space-1);
	}

	@media (max-width: 760px) {
		.ui-panel-section {
			grid-template-columns: minmax(0, 1fr);
			gap: var(--space-1);
		}
	}
</style>
