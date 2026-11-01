<!--
	@component
	Label/value rows with a fixed accent label column, as in the welcome summary and post
	metadata. Stacks on mobile. Supply `items`, or a `value` snippet to render rich values.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { KeyValueItem } from '../types';

	let {
		items,
		labelWidth = '8ch',
		muted = false,
		class: className = '',
		value: valueSnippet
	}: {
		items: readonly KeyValueItem[];
		/** Any CSS length for the label column. */
		labelWidth?: string;
		/** Use the secondary text color for values. */
		muted?: boolean;
		class?: string;
		value?: Snippet<[KeyValueItem]>;
	} = $props();
</script>

<dl class={['ui-kv', className]} class:ui-kv-muted={muted} style:--ui-label-width={labelWidth}>
	{#each items as item (item.label)}
		<div class="ui-kv-row">
			<dt>{item.label}</dt>
			<dd>
				{#if valueSnippet}{@render valueSnippet(item)}{:else}{item.value}{/if}
			</dd>
		</div>
	{/each}
</dl>

<style>
	.ui-kv {
		display: grid;
		gap: 3px;
		margin: 0 0 12px;
	}

	.ui-kv-row {
		display: grid;
		grid-template-columns: var(--ui-label-width) minmax(0, 1fr);
		align-items: start;
		gap: 10px;
		line-height: 1.45;
	}

	dt {
		color: var(--yellow);
		font-weight: 700;
	}

	dd {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		min-width: 0;
		margin: 0;
		color: var(--tx);
		overflow-wrap: anywhere;
	}

	.ui-kv-muted dd {
		color: var(--tx-2);
	}

	@media (max-width: 760px) {
		.ui-kv {
			gap: 6px;
		}

		.ui-kv-row {
			grid-template-columns: minmax(0, 1fr);
			gap: 1px;
		}
	}
</style>
