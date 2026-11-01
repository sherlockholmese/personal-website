<!--
	@component
	Labelled link listing in the style of the `socials` output: an optional green title,
	then `label  value` rows in cyan that turn accent on hover.
-->
<script lang="ts">
	import type { LinkItem } from '../types';

	let {
		title,
		items,
		labelWidth = '10ch',
		class: className = ''
	}: {
		title?: string;
		items: readonly LinkItem[];
		labelWidth?: string;
		class?: string;
	} = $props();
</script>

<div class={['ui-link-list', className]} style:--ui-label-width={labelWidth}>
	{#if title}<div class="ui-link-list-title">{title}</div>{/if}
	<ul>
		{#each items as item (item.href)}
			<li>
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a
					href={item.href}
					target={item.external ? '_blank' : undefined}
					rel={item.external ? 'external noreferrer' : undefined}
				>
					<span>{item.label}</span>
					<span class="ui-link-list-value">{item.value ?? item.href}</span>
				</a>
			</li>
		{/each}
	</ul>
</div>

<style>
	.ui-link-list {
		display: grid;
		gap: 4px;
		margin: 4px 0 14px;
	}

	.ui-link-list-title {
		color: var(--green);
		font-weight: 700;
		line-height: 1.45;
	}

	ul {
		display: grid;
		gap: 4px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	a {
		display: grid;
		grid-template-columns: var(--ui-label-width) minmax(0, 1fr);
		gap: 10px;
		color: var(--cyan);
		line-height: 1.45;
		text-decoration: none;
	}

	a:hover,
	a:focus-visible {
		color: var(--yellow);
	}

	a:focus-visible {
		outline: 2px solid var(--tx);
		outline-offset: 2px;
	}

	.ui-link-list-value {
		min-width: 0;
		overflow-wrap: anywhere;
	}

	@media (max-width: 760px) {
		a {
			grid-template-columns: minmax(0, 1fr);
			gap: 0;
			padding-block: 5px;
		}
	}
</style>
