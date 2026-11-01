<!--
	@component
	Theme scope. Color tokens live on `:root` and follow the site-wide `data-theme`, so
	this wrapper is only needed to force a palette for a subtree with `theme`.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { Theme } from '../types';

	let {
		theme,
		as = 'div',
		class: className = '',
		children,
		...rest
	}: {
		theme?: Theme;
		as?: 'div' | 'main' | 'section' | 'article';
		class?: string;
		children: Snippet;
	} & HTMLAttributes<HTMLElement> = $props();
</script>

<svelte:element this={as} class={['workspace', theme, className]} {...rest}>
	{@render children()}
</svelte:element>
