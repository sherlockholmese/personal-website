<!--
	@component
	The bordered terminal frame used across the site: a legend-style title cut into the
	top border, an optional red close button, and a scrolling viewport. Titles too long
	for the frame shorten to `title[...]` once the font has loaded.

	Set `padded={false}` and render a `TerminalViewport` or your own scroll container
	when the body should own its scrolling (like the blog reader or photography gallery).
-->
<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { isMobileViewport } from '#lib/terminal/media.ts';
	import CloseButton from './CloseButton.svelte';
	import TerminalViewport from './TerminalViewport.svelte';

	const TRUNCATION_SUFFIX = '[...]';
	const MOBILE_CLOSE_RESERVE_PX = 52;
	const DESKTOP_TITLE_RATIO = 0.75;

	let {
		title,
		onClose,
		closeLabel = 'Close',
		closeRef = $bindable<HTMLButtonElement | undefined>(),
		padded = true,
		class: className = '',
		actions,
		children
	}: {
		title: string;
		onClose?: () => void;
		closeLabel?: string;
		closeRef?: HTMLButtonElement;
		/** Wrap content in the standard terminal viewport and scrollback. */
		padded?: boolean;
		class?: string;
		/** Extra titlebar controls rendered before the close button. */
		actions?: Snippet;
		children: Snippet;
	} = $props();

	let titleElement = $state<HTMLSpanElement>();
	let titlebarWidth = $state(0);
	let fontsReady = $state(false);
	let shortenedTitle = $state<string>();
	let measureContext: CanvasRenderingContext2D | null | undefined;
	let displayedTitle = $derived(shortenedTitle ?? title);

	onMount(() => {
		let cancelled = false;
		void document.fonts?.ready.then(() => {
			if (!cancelled) fontsReady = true;
		});
		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		if (fontsReady) shortenedTitle = shorten(title, titlebarWidth);
	});

	function shorten(text: string, width: number) {
		if (width <= 0 || !titleElement) return text;
		const style = getComputedStyle(titleElement);
		measureContext ??= document.createElement('canvas').getContext('2d');
		if (!measureContext) return text;
		measureContext.font = style.font;
		const padding = Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight);
		const measure = (value: string) =>
			Math.ceil(measureContext!.measureText(value).width + padding);

		const maxWidth = isMobileViewport()
			? Math.max(0, width - MOBILE_CLOSE_RESERVE_PX)
			: width * DESKTOP_TITLE_RATIO;
		if (measure(text) <= maxWidth) return text;
		if (measure(TRUNCATION_SUFFIX) > maxWidth) return TRUNCATION_SUFFIX;

		let low = 0;
		let high = text.length;
		while (low < high) {
			const middle = Math.ceil((low + high) / 2);
			if (measure(`${text.slice(0, middle).trimEnd()}${TRUNCATION_SUFFIX}`) <= maxWidth) {
				low = middle;
			} else {
				high = middle - 1;
			}
		}
		return `${text.slice(0, low).trimEnd()}${TRUNCATION_SUFFIX}`;
	}
</script>

<article class={['ui-window', className]}>
	<div class="ui-window-titlebar" bind:clientWidth={titlebarWidth}>
		<span bind:this={titleElement} class="ui-window-title" {title}>{displayedTitle}</span>
		{#if actions || onClose}
			<span class="ui-window-actions">
				{@render actions?.()}
				{#if onClose}
					<CloseButton bind:ref={closeRef} label={closeLabel} onclick={onClose} />
				{/if}
			</span>
		{/if}
	</div>
	{#if padded}
		<TerminalViewport>
			{@render children()}
		</TerminalViewport>
	{:else}
		{@render children()}
	{/if}
</article>

<style>
	.ui-window {
		position: relative;
		display: flex;
		min-width: 0;
		min-height: 0;
		flex-direction: column;
		border: var(--border-frame) solid var(--accent);
		border-radius: var(--radius-frame);
		background: var(--surface);
		font-size: var(--text-body);
	}

	.ui-window-titlebar {
		position: absolute;
		top: 0;
		right: var(--space-2);
		left: var(--space-2);
		z-index: var(--layer-titlebar);
		display: flex;
		align-items: center;
		gap: var(--space-2);
		line-height: 1.2;
		transform: translateY(-50%);
	}

	.ui-window-title {
		display: inline-flex;
		max-width: 75%;
		padding-inline: var(--space-2);
		overflow: hidden;
		background: var(--surface);
		color: var(--accent);
		font-weight: 700;
		white-space: nowrap;
	}

	.ui-window-actions {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		margin-left: auto;
	}

	@media (max-width: 760px) {
		.ui-window-titlebar {
			font-size: var(--text-caption);
		}

		.ui-window-title {
			max-width: calc(100% - var(--control-close) - var(--space-2));
		}
	}
</style>
