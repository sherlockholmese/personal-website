<!--
	@component
	Inline message block with a colored left rule. Use for notes, warnings, errors, and
	success confirmations. `code` adds a bordered status badge before the title (for
	example `404`). Set `headingLevel` when the title heads the page or a section, and
	`role="alert"` only for messages that appear in response to an action.
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
		headingLevel,
		class: className = '',
		children,
		actions
	}: {
		tone?: Tone;
		title?: string;
		code?: string;
		role?: 'note' | 'status' | 'alert';
		headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
		class?: string;
		children?: Snippet;
		actions?: Snippet;
	} = $props();
</script>

<div class={['ui-callout', className]} style:--ui-tone={toneColor[tone]} {role}>
	{#if title || code}
		<svelte:element this={headingLevel ? `h${headingLevel}` : 'div'} class="ui-callout-title">
			{#if code}<Badge {tone}>{code}</Badge>{/if}
			{#if title}<span>{title}</span>{/if}
		</svelte:element>
	{/if}
	{#if children}<div class="ui-callout-body">{@render children()}</div>{/if}
	{#if actions}<div class="ui-callout-actions">{@render actions()}</div>{/if}
</div>

<style>
	.ui-callout {
		display: grid;
		gap: var(--space-2);
		max-width: 86ch;
		margin-block: var(--space-2);
		padding: var(--space-3);
		border-left: var(--border-frame) solid var(--ui-tone);
		background: color-mix(in srgb, var(--surface-raised) 44%, transparent);
	}

	.ui-callout-title {
		display: flex;
		min-width: 0;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		margin: 0;
		color: var(--accent);
		font-size: var(--text-title);
		font-weight: 700;
		line-height: 1.25;
	}

	.ui-callout-body {
		display: grid;
		gap: var(--space-2);
		max-width: 68ch;
		color: var(--text-muted);
		font-size: var(--text-body);
		line-height: 1.45;
	}

	.ui-callout-body :global(p) {
		margin: 0;
	}

	.ui-callout-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}
</style>
