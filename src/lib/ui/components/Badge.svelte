<!--
	@component
	Small bordered label, like the `404` status code. Use `prefix="#"` for tags.
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
		min-height: 22px;
		padding: 1px 5px;
		border: 1px solid var(--ui-tone);
		color: var(--ui-tone);
		font-size: 13px;
		font-weight: 700;
		line-height: 1.1;
		white-space: nowrap;
	}

	.ui-badge-solid {
		background: var(--ui-tone);
		color: var(--bg);
	}

	.ui-badge-text {
		min-height: 0;
		padding: 0;
		border: 0;
		font-weight: 400;
	}

	.ui-badge-prefix {
		opacity: 0.7;
	}
</style>
