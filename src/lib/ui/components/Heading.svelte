<!--
	@component
	Section heading following the post tone ladder: h1 accent, h2 orange, h3 green,
	h4+ cyan. `size` decouples the visual scale from the semantic `level`.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { headingTone, toneColor, type Tone } from '../tone';

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
	style:--ui-tone={toneColor[tone ?? headingTone[visualSize]]}
	{...rest}
>
	{@render children()}
</svelte:element>

<style>
	.ui-heading {
		margin: 0 0 12px;
		color: var(--ui-tone);
		font-weight: 700;
		line-height: 1.15;
		scroll-margin-top: 22px;
	}

	.ui-heading-1 {
		font-size: 32px;
	}

	.ui-heading-2 {
		font-size: 19px;
	}

	.ui-heading-3 {
		font-size: 17px;
	}

	.ui-heading-4 {
		font-size: 15px;
	}

	@media (max-width: 760px) {
		.ui-heading-1 {
			font-size: clamp(24px, 7vw, 30px);
		}

		.ui-heading-2 {
			font-size: clamp(18px, 5vw, 22px);
		}

		.ui-heading-3 {
			font-size: clamp(17px, 4.6vw, 20px);
		}

		.ui-heading-4 {
			font-size: 16px;
		}
	}
</style>
