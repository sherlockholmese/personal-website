<!--
	@component
	Long-form content wrapper applying the blog post typography (`styles/prose.css`).
	Use it around hand-written HTML or `MarkdownBlocks` output; headings, lists,
	blockquotes, links, inline code, and images pick up the post styles.

	`variant="preview"` is the denser style used by the blog browser preview pane.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		as = 'div',
		variant = 'body',
		class: className = '',
		children
	}: {
		as?: 'div' | 'article' | 'section';
		variant?: 'body' | 'preview';
		class?: string;
		children: Snippet;
	} = $props();
</script>

<svelte:element
	this={as}
	class={['ui-prose', variant === 'body' ? 'ui-prose-body' : 'ui-prose-preview', className]}
>
	{@render children()}
</svelte:element>
