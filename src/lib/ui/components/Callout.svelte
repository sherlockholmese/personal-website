<!--
	@component
	Inline message block with a colored left rule, modelled on the 404 panel. Use for
	notes, warnings, errors, and success confirmations. `code` adds a bordered status
	badge before the title (for example `404` or `ok`).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { toneColor, type Tone } from '../tone';
	import Badge from './Badge.svelte';

	let {
		tone = 'info',
		title,
		code,
		role,
		class: className = '',
		children,
		actions
	}: {
		tone?: Tone;
		title?: string;
		code?: string;
		/** Use `alert` for errors that appear in response to an action. */
		role?: 'note' | 'status' | 'alert';
		class?: string;
		children?: Snippet;
		actions?: Snippet;
	} = $props();
</script>

<div
	class={['ui-callout', className]}
	style:--ui-tone={toneColor[tone]}
	role={role ?? (tone === 'danger' ? 'alert' : 'note')}
>
	{#if title || code}
		<div class="ui-callout-title">
			{#if code}<Badge {tone}>{code}</Badge>{/if}
			{#if title}<span>{title}</span>{/if}
		</div>
	{/if}
	{#if children}<div class="ui-callout-body">{@render children()}</div>{/if}
	{#if actions}<div class="ui-callout-actions">{@render actions()}</div>{/if}
</div>

<style>
	.ui-callout {
		display: grid;
		gap: 10px;
		max-width: 86ch;
		margin: 8px 0;
		padding: 11px 12px;
		border-left: 2px solid var(--ui-tone);
		background: color-mix(in srgb, var(--bg-2) 44%, transparent);
	}

	.ui-callout-title {
		display: flex;
		min-width: 0;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
		color: var(--yellow);
		font-size: 17px;
		font-weight: 700;
		line-height: 1.25;
	}

	.ui-callout-body {
		max-width: 68ch;
		color: var(--tx-2);
		font-size: 15px;
		line-height: 1.45;
	}

	.ui-callout-body :global(p) {
		margin: 0;
	}

	.ui-callout-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	@media (max-width: 760px) {
		.ui-callout {
			gap: 9px;
			padding: 10px;
		}

		.ui-callout-body {
			font-size: 16px;
		}
	}
</style>
