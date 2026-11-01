<!--
	@component
	Theme scope for UI components. Every library component reads its colors from the
	Flexoki tokens declared on `.workspace`, so render them inside this wrapper (or any
	element that already carries the `workspace` class, such as `TerminalPage`).

	`theme` forces a palette; leave it unset to follow the site-wide `data-theme`.
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

<svelte:element
	this={as}
	class={['workspace ui-workspace', theme === 'light' && 'light', className]}
	{...rest}
>
	{@render children()}
</svelte:element>

<style>
	.ui-workspace {
		background: var(--bg);
		color: var(--tx);
	}
</style>
