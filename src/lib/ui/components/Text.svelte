<!--
	@component
	Body text with tone, size, and the justified reading style used in posts. Defaults
	to a `<p>`; use `as="span"` inline.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { toneColor, type Tone } from '../tone';

	let {
		as = 'p',
		tone = 'neutral',
		size = 'md',
		justify = false,
		bold = false,
		measure = false,
		class: className = '',
		children,
		...rest
	}: {
		as?: 'p' | 'span' | 'div' | 'small' | 'strong';
		tone?: Tone;
		size?: 'sm' | 'md' | 'lg';
		justify?: boolean;
		bold?: boolean;
		/** Limit line length to a comfortable reading width. */
		measure?: boolean;
		class?: string;
		children: Snippet;
	} & HTMLAttributes<HTMLElement> = $props();
</script>

<svelte:element
	this={as}
	class={['ui-text', `ui-text-${size}`, className]}
	class:ui-text-justify={justify}
	class:ui-text-bold={bold}
	class:ui-text-measure={measure}
	style:--ui-tone={toneColor[tone]}
	{...rest}
>
	{@render children()}
</svelte:element>

<style>
	.ui-text {
		margin: 0;
		color: var(--ui-tone);
		font-weight: 400;
	}

	p.ui-text,
	div.ui-text {
		margin-bottom: var(--space-3);
	}

	.ui-text-sm {
		font-size: var(--text-caption);
		line-height: 1.45;
	}

	.ui-text-md {
		font-size: var(--text-body);
		line-height: 1.5;
	}

	.ui-text-lg {
		font-size: var(--text-reading);
		line-height: 1.58;
	}

	.ui-text-justify {
		text-align: justify;
		text-justify: inter-word;
		hyphens: none;
		overflow-wrap: break-word;
	}

	.ui-text-bold {
		font-weight: 700;
	}

	.ui-text-measure {
		max-width: 75ch;
	}
</style>
