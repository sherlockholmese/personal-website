<!--
	@component
	Native disclosure (`<details>`) with a `▸` / `▾` marker and accent summary.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

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
		<span class="ui-details-marker" aria-hidden="true">{open ? '▾' : '▸'}</span>
		{summary}
	</summary>
	<div class="ui-details-body">{@render children()}</div>
</details>

<style>
	summary {
		display: flex;
		width: fit-content;
		min-height: 28px;
		align-items: center;
		gap: 1ch;
		color: var(--yellow);
		cursor: pointer;
		list-style: none;
		touch-action: manipulation;
	}

	summary::-webkit-details-marker {
		display: none;
	}

	summary:hover {
		color: var(--cyan);
	}

	summary:focus-visible {
		outline: 2px solid var(--tx);
		outline-offset: 2px;
	}

	.ui-details-body {
		margin: 4px 0 8px 2ch;
		padding-left: 10px;
		border-left: 1px solid var(--border);
	}

	@media (max-width: 760px) {
		summary {
			min-height: 44px;
		}
	}
</style>
