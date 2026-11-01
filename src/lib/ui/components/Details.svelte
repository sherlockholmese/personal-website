<!--
	@component
	Native disclosure (`<details>`) with a rotating marker and accent summary.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Chevron from './Chevron.svelte';

	let {
		summary,
		open = $bindable(false),
		class: className = '',
		children
	}: {
		summary: string;
		open?: boolean;
		class?: string;
		children: Snippet;
	} = $props();
</script>

<details class={['ui-details', className]} bind:open>
	<summary>
		<Chevron direction="right" {open} />
		{summary}
	</summary>
	<div class="ui-details-body">{@render children()}</div>
</details>

<style>
	summary {
		display: flex;
		width: fit-content;
		min-height: max(var(--control-sm), var(--target-min));
		align-items: center;
		gap: var(--space-2);
		color: var(--accent);
		list-style: none;
	}

	summary::-webkit-details-marker {
		display: none;
	}

	@media (hover: hover) {
		summary:hover {
			color: var(--accent-hover);
		}
	}

	.ui-details-body {
		margin: var(--space-1) 0 var(--space-2) var(--space-half);
		padding-left: var(--space-3);
		border-left: 1px solid var(--border);
	}
</style>
