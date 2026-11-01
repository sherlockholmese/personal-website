<!--
	@component
	Section heading following the post color ladder, which indexes document depth. `size`
	decouples the visual scale from the semantic `level`; `tone` overrides the color.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { headingColor, toneColor, type Tone } from '../tone';

	type Level = 1 | 2 | 3 | 4 | 5 | 6;

	let {
		level = 2,
		size,
		tone,
		class: className = '',
		children,
		...rest
	}: {
		level?: Level;
		/** Visual scale; defaults to `level`. */
		size?: Level;
		tone?: Tone;
		class?: string;
		children: Snippet;
	} & HTMLAttributes<HTMLHeadingElement> = $props();

	let visualSize = $derived(size ?? level);
</script>

<svelte:element
	this={`h${level}`}
	class={['ui-heading', `ui-heading-${Math.min(visualSize, 4)}`, className]}
	style:--ui-tone={tone ? toneColor[tone] : headingColor[visualSize]}
	{...rest}
>
	{@render children()}
</svelte:element>

<style>
	.ui-heading {
		margin: 0 0 var(--space-3);
		color: var(--ui-tone);
		font-weight: 700;
		line-height: 1.15;
		scroll-margin-top: var(--ui-anchor-offset, var(--space-6));
	}

	.ui-heading-1 {
		font-size: var(--text-display);
	}

	.ui-heading-2 {
		font-size: var(--text-title);
	}

	.ui-heading-3 {
		font-size: var(--text-reading);
	}

	.ui-heading-4 {
		font-size: var(--text-body);
	}
</style>
