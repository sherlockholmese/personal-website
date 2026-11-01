<!--
	@component
	One row of a `KeyValueList`. Use `label` for text, or the `term` snippet for a rich
	term such as inline code. The value is the row's children.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label,
		class: className = '',
		term,
		children
	}: { label?: string; class?: string; term?: Snippet; children: Snippet } = $props();
</script>

<div class={['ui-kv-row', className]}>
	<dt class:ui-kv-term={term}>
		{#if term}{@render term()}{:else}{label}{/if}
	</dt>
	<dd>{@render children()}</dd>
</div>

<style>
	.ui-kv-row {
		display: grid;
		grid-template-columns: var(--ui-kv-columns, var(--ui-label-width) minmax(0, 1fr));
		align-items: start;
		gap: var(--ui-kv-row-gap, var(--space-2) var(--space-3));
		line-height: 1.45;
	}

	dt {
		color: var(--ui-kv-label, var(--accent));
		font-weight: 700;
	}

	.ui-kv-term {
		font-weight: 400;
	}

	dd {
		min-width: 0;
		margin: 0;
		color: inherit;
		overflow-wrap: anywhere;
	}
</style>
