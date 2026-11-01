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
		padding: 0 5px;
		border: 1px solid var(--border);
		background: var(--bg-2);
		box-shadow: inset 0 -1px 0 var(--ui-2);
		color: var(--tx);
		font-size: 13px;
		line-height: 1.45;
		text-align: center;
		white-space: nowrap;
	}
</style>
