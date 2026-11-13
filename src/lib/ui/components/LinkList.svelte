<!--
	@component
	Labelled link listing in the style of the `socials` output: an optional title, then
	`label  value` rows. `quiet` uses neutral text for scannable lists such as latest posts.

	An item without `href` renders through the `row` snippet, for a non-link value in the
	same grid. An item with `value: ''` shows only its label.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LinkItem } from '../types';

	let {
		title,
		items,
		labelWidth = '10ch',
		quiet = false,
		class: className = '',
		row
	}: {
		title?: string;
		items: readonly LinkItem[];
		labelWidth?: string;
		quiet?: boolean;
		class?: string;
		row?: Snippet<[LinkItem]>;
	} = $props();
</script>

<div
	class={['ui-link-list', className]}
	class:ui-link-list-quiet={quiet}
	style:--ui-label-width={labelWidth}
>
	{#if title}<div class="ui-link-list-title">{title}</div>{/if}
	<ul>
		{#each items as item, index (`${item.label}:${index}`)}
			{@const value = item.value ?? item.href}
			<li>
				{#if item.href}
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
					<a
						class="ui-link-list-row"
						href={item.href}
						target={item.external ? '_blank' : undefined}
						rel={item.external ? 'external noreferrer' : undefined}
					>
						<span class="ui-link-list-label">{item.label}</span>
						{#if value}<span class="ui-link-list-value">{value}</span>{/if}
					</a>
				{:else}
					<div class="ui-link-list-row">
						<span class="ui-link-list-label">{item.label}</span>
						<div class="ui-link-list-value">{@render row?.(item)}</div>
					</div>
				{/if}
			</li>
		{/each}
	</ul>
</div>

<style>
	.ui-link-list {
		display: grid;
		gap: var(--space-1);
		margin-block: var(--space-1) var(--space-3);
	}

	.ui-link-list-title {
		color: var(--heading-3);
		font-weight: 700;
		line-height: 1.45;
		overflow-wrap: anywhere;
	}

	ul {
		display: grid;
		gap: var(--space-1);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.ui-link-list-row {
		display: grid;
		min-height: var(--target-min);
		grid-template-columns: var(--ui-label-width) minmax(0, 1fr);
		align-content: center;
		gap: 0 var(--space-3);
		color: var(--link);
		line-height: 1.45;
		text-decoration: none;
	}

	a.ui-link-list-row:not(:has(.ui-link-list-value)) {
		display: flex;
		align-items: center;
	}

	a.ui-link-list-row:focus-visible,
	a.ui-link-list-row:active {
		color: var(--accent);
	}

	@media (hover: hover) {
		a.ui-link-list-row:hover {
			color: var(--accent);
		}
	}

	.ui-link-list-value {
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.ui-link-list-quiet .ui-link-list-row {
		color: var(--text);
	}

	.ui-link-list-quiet .ui-link-list-label {
		color: var(--text-muted);
	}

	@media (max-width: 760px) {
		.ui-link-list-row {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
