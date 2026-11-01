<!--
	@component
	The bordered terminal frame used across the site: a legend-style title cut into the
	top border, an optional red close button, and a scrolling viewport. Reuses the global
	`.terminal-*` classes so new pages match the main shell exactly, including the mobile
	scrollback behavior.

	Set `padded={false}` and render your own scroll container when the body should own
	its scrolling (like the blog reader or photography gallery).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import CloseButton from './CloseButton.svelte';

	let {
		title,
		onClose,
		closeLabel = 'Close',
		padded = true,
		class: className = '',
		actions,
		children
	}: {
		title: string;
		onClose?: () => void;
		closeLabel?: string;
		/** Wrap content in the standard terminal viewport and scrollback. */
		padded?: boolean;
		class?: string;
		/** Extra titlebar controls rendered before the close button. */
		actions?: Snippet;
		children: Snippet;
	} = $props();
</script>

<article class={['terminal-window', className]}>
	<div class="terminal-titlebar">
		<span class="terminal-title" {title}>{title}</span>
		{#if actions || onClose}
			<span class="ui-window-actions">
				{@render actions?.()}
				{#if onClose}
					<CloseButton label={closeLabel} onclick={onClose} />
				{/if}
			</span>
		{/if}
	</div>
	{#if padded}
		<div class="terminal-viewport">
			<div class="terminal-scrollback">
				{@render children()}
			</div>
		</div>
	{:else}
		{@render children()}
	{/if}
</article>

<style>
	.ui-window-actions {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-left: auto;
	}
</style>
