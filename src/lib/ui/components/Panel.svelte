<!--
	@component
	Titled container matching the `help`, `projects`, and blog browser panels: a raised
	header bar with an accent title on the left and muted metadata on the right.

	- `variant="ruled"` (default) draws top and bottom rules for inline scrollback output.
	- `variant="boxed"` draws a full border for standalone tools and browsers.
	- `fill` lets the body take the panel's remaining height, for panels sized by their parent.

	Compose with `PanelSection` for labelled rows.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import CloseButton from './CloseButton.svelte';

	let {
		title,
		meta,
		variant = 'ruled',
		fill = false,
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
		fill?: boolean;
		headingLevel?: 2 | 3 | 4 | 5 | 6;
		onClose?: () => void;
		closeLabel?: string;
		class?: string;
		children: Snippet;
		footer?: Snippet;
	} = $props();

	const id = $props.id();
</script>

<section
	class={['ui-panel', `ui-panel-${variant}`, className]}
	class:ui-panel-fill={fill}
	aria-labelledby={`${id}-title`}
>
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
		--ui-panel-inset: var(--space-2);
		margin-block: var(--space-3);
		background: var(--surface);
	}

	.ui-panel-ruled {
		border-block: 1px solid var(--border-strong);
	}

	.ui-panel-boxed {
		border: 1px solid var(--border-strong);
	}

	.ui-panel-fill {
		display: flex;
		min-height: 0;
		flex-direction: column;
	}

	.ui-panel-fill .ui-panel-body {
		display: flex;
		min-height: 0;
		flex: 1;
		flex-direction: column;
	}

	.ui-panel-header {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-1) var(--ui-panel-inset);
		border-bottom: 1px solid var(--border);
		background: var(--surface-raised);
		color: var(--accent);
		font-weight: 700;
	}

	.ui-panel-header-closable {
		grid-template-columns: minmax(0, 1fr) auto auto;
	}

	.ui-panel-title {
		margin: 0;
		font-size: inherit;
		line-height: 1.4;
		overflow-wrap: anywhere;
	}

	.ui-panel-meta {
		color: var(--text-muted);
		font-weight: 400;
		text-align: right;
		white-space: nowrap;
	}

	.ui-panel-footer {
		padding: var(--space-1) var(--ui-panel-inset);
		border-top: 1px solid var(--border);
		color: var(--text-muted);
	}

	@media (max-width: 760px) {
		.ui-panel {
			--ui-panel-inset: var(--space-3);
		}
	}
</style>
