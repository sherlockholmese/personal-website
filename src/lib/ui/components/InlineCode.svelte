<!--
	@component
	Inline code span matching post inline code: square corners, `--bg-2` fill, accent text.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let { class: className = '', children }: { class?: string; children: Snippet } = $props();
</script>

<code class={['ui-inline-code', className]}>{@render children()}</code>

<style>
	.ui-inline-code {
		padding: 0 var(--space-1);
		border-radius: 0;
		background: var(--surface-raised);
		color: var(--accent);
		font-size: 0.92em;
		overflow-wrap: anywhere;
	}
</style>
