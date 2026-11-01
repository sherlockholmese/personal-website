<!--
	@component
	Quiet placeholder for empty lists, failed loads, and zero-result searches.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		message,
		align = 'start',
		class: className = '',
		actions
	}: {
		title?: string;
		message: string;
		align?: 'start' | 'center';
		class?: string;
		actions?: Snippet;
	} = $props();
</script>

<div class={['ui-empty', `ui-empty-${align}`, className]} role="status">
	{#if title}<div class="ui-empty-title">{title}</div>{/if}
	<div>{message}</div>
	{#if actions}<div class="ui-empty-actions">{@render actions()}</div>{/if}
</div>

<style>
	.ui-empty {
		display: grid;
		gap: var(--space-1);
		padding: var(--space-4) var(--space-2);
		color: var(--text-muted);
		line-height: 1.45;
	}

	.ui-empty-center {
		justify-items: center;
		text-align: center;
	}

	.ui-empty-title {
		color: var(--text);
		font-weight: 700;
	}

	.ui-empty-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin-top: var(--space-1);
	}
</style>
