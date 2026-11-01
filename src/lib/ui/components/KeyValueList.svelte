<!--
	@component
	Label/value rows with a fixed accent label column, as in the welcome summary and post
	metadata. Rows stack on mobile, or always with `stacked`.

	Supply plain `items`, or `KeyValueRow` children for rich values.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { KeyValueItem } from '../types';
	import KeyValueRow from './KeyValueRow.svelte';

	let {
		items = [],
		labelWidth = '8ch',
		muted = false,
		stacked = false,
		class: className = '',
		children
	}: {
		items?: readonly KeyValueItem[];
		/** Any CSS grid track size for the label column. */
		labelWidth?: string;
		/** Use the secondary text color for values. */
		muted?: boolean;
		/** Keep labels above values at every width. */
		stacked?: boolean;
		class?: string;
		children?: Snippet;
	} = $props();
</script>

<dl
	class={['ui-kv', className]}
	class:ui-kv-muted={muted}
	class:ui-kv-stacked={stacked}
	style:--ui-label-width={labelWidth}
>
	{#each items as item, index (`${item.label}:${index}`)}
		<KeyValueRow label={item.label}>{item.value}</KeyValueRow>
	{/each}
	{@render children?.()}
</dl>

<style>
	.ui-kv {
		display: grid;
		gap: var(--space-1);
		margin: 0 0 var(--space-3);
		color: var(--text);
	}

	.ui-kv-muted {
		color: var(--text-muted);
	}

	.ui-kv-stacked {
		gap: var(--space-4);
		--ui-kv-columns: minmax(0, 1fr);
		--ui-kv-row-gap: var(--space-1);
		--ui-kv-label: var(--text);
	}

	@media (max-width: 760px) {
		.ui-kv {
			gap: var(--space-2);
			--ui-kv-columns: minmax(0, 1fr);
			--ui-kv-row-gap: var(--space-half);
		}
	}
</style>
