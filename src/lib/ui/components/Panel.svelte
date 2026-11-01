<!--
	@component
	Titled container matching the `help`, `projects`, and blog browser panels: a
	`--bg-2` header bar with an accent title on the left and muted metadata on the right.

	- `variant="ruled"` (default) draws top and bottom rules for inline scrollback output.
	- `variant="boxed"` draws a full hard border for standalone tools and browsers.

	Compose with `PanelSection` for labelled rows.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import CloseButton from './CloseButton.svelte';

	let {
		title,
		meta,
		variant = 'ruled',
		headingLevel = 2,
		onClose,
		closeLabel = 'Close panel',
		class: className = '',
		children,
		footer
	}: {
		title: string;
		/** Right-aligned header text, for example `3 repos`. */
		meta?: string | Snippet;
		variant?: 'ruled' | 'boxed';
		headingLevel?: 2 | 3 | 4 | 5 | 6;
		onClose?: () => void;
		closeLabel?: string;
		class?: string;
		children: Snippet;
		footer?: Snippet;
	} = $props();

	const id = $props.id();
</script>

<section class={['ui-panel', `ui-panel-${variant}`, className]} aria-labelledby={`${id}-title`}>
	<header class="ui-panel-header" class:ui-panel-header-closable={onClose}>
		<svelte:element this={`h${headingLevel}`} id={`${id}-title`} class="ui-panel-title">
			{title}
		</svelte:element>
		{#if meta}
			<span class="ui-panel-meta">
				{#if typeof meta === 'string'}{meta}{:else}{@render meta()}{/if}
			</span>
		{/if}
		{#if onClose}
			<CloseButton label={closeLabel} onclick={onClose} />
		{/if}
	</header>
	<div class="ui-panel-body">
		{@render children()}
	</div>
	{#if footer}
		<footer class="ui-panel-footer">{@render footer()}</footer>
	{/if}
</section>

<style>
	.ui-panel {
		margin: 12px 0;
		background: var(--bg);
	}

	.ui-panel-ruled {
		border-block: 1px solid var(--hard-border);
	}

	.ui-panel-boxed {
		border: 1px solid var(--hard-border);
	}

	.ui-panel-header {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: 12px;
		padding: 6px 8px;
		border-bottom: 1px solid var(--border);
		background: var(--bg-2);
		color: var(--yellow);
		font-weight: 700;
	}

	.ui-panel-header-closable {
		grid-template-columns: minmax(0, 1fr) auto auto;
		padding-block: 4px;
	}

	.ui-panel-title {
		margin: 0;
		overflow: hidden;
		font-size: inherit;
		line-height: 1.4;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.ui-panel-meta {
		color: var(--tx-2);
		font-weight: 400;
		text-align: right;
		white-space: nowrap;
	}

	.ui-panel-footer {
		padding: 6px 8px;
		border-top: 1px solid var(--border);
		color: var(--tx-2);
	}

	@media (max-width: 760px) {
		.ui-panel {
			margin: 10px 0;
		}

		.ui-panel-header {
			gap: 8px;
			padding: 7px 12px;
		}

		.ui-panel-footer {
			padding: 8px 12px;
		}
	}
</style>
