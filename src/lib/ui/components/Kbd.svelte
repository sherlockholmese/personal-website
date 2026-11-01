<!--
	@component
	Keyboard key hint, for example `<Kbd>tab</Kbd>` or `<Kbd>ctrl</Kbd>+<Kbd>k</Kbd>`.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let { class: className = '', children }: { class?: string; children: Snippet } = $props();
</script>

<kbd class={['ui-kbd', className]}>{@render children()}</kbd>

<style>
	.ui-kbd {
		display: inline-block;
		min-width: 2ch;
		padding: 0 var(--space-1);
		border: 1px solid var(--border);
		background: var(--surface-raised);
		box-shadow: inset 0 -1px 0 var(--control-hover);
		color: var(--text);
		font-size: var(--text-caption);
		line-height: 1.45;
		text-align: center;
		white-space: nowrap;
	}
</style>
