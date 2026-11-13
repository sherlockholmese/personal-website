<!--
	@component
	Small bordered label, like the `404` status code. Reserve it for exceptions; plain
	text or `TagList` suits ordinary metadata. Use `prefix="#"` for tags.
	`variant="solid"` fills with the tone color.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { toneColor, type Tone } from '../tone';

	let {
		tone = 'accent',
		variant = 'outline',
		prefix,
		class: className = '',
		children
	}: {
		tone?: Tone;
		variant?: 'outline' | 'solid' | 'text';
		prefix?: string;
		class?: string;
		children: Snippet;
	} = $props();
</script>

<span class={['ui-badge', `ui-badge-${variant}`, className]} style:--ui-tone={toneColor[tone]}>
	{#if prefix}<span class="ui-badge-prefix" aria-hidden="true">{prefix}</span
		>{/if}{@render children()}
</span>

<style>
	.ui-badge {
		display: inline-flex;
		align-items: center;
		padding: var(--space-half) var(--space-1);
		border: 1px solid var(--ui-tone);
		color: var(--ui-tone);
		font-size: var(--text-caption);
		font-weight: 700;
		line-height: 1.1;
		overflow-wrap: anywhere;
	}

	.ui-badge-solid {
		background: var(--ui-tone);
		color: var(--surface);
	}

	.ui-badge-text {
		padding: 0;
		border: 0;
		font-size: inherit;
		font-weight: 400;
		line-height: inherit;
	}
</style>
