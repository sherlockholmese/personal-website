<!--
	@component
	Square-cornered terminal button. Renders an `<a>` when `href` is set.

	| variant   | use                                                      |
	| --------- | -------------------------------------------------------- |
	| `outline` | default action                                           |
	| `solid`   | the one primary action in a region                       |
	| `ghost`   | low-weight text action such as `retry`                   |
	| `overlay` | translucent action floating over media                   |
	| `danger`  | destructive action                                       |
	| `success` | constructive action such as a download                   |

	Pass `loading` as a boolean for async actions: the indicator's slot is reserved
	while idle, so the button keeps its width. Controls reach 44px on touch and below 760px.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import type { Size } from '../types';

	type Variant = 'outline' | 'solid' | 'ghost' | 'overlay' | 'danger' | 'success';

	let {
		variant = 'outline',
		size = 'md',
		href,
		loading,
		disabled = false,
		block = false,
		align = 'center',
		type = 'button',
		ref = $bindable<HTMLElement | undefined>(),
		class: className = '',
		children,
		...rest
	}: {
		variant?: Variant;
		size?: Size;
		href?: string;
		/** Leave unset for actions that are never busy. */
		loading?: boolean;
		disabled?: boolean;
		/** Stretch to the container width. Long labels wrap. */
		block?: boolean;
		align?: 'center' | 'start';
		type?: 'button' | 'submit' | 'reset';
		ref?: HTMLElement;
		class?: string;
		children: Snippet;
	} & Omit<HTMLButtonAttributes & HTMLAnchorAttributes, 'type' | 'href' | 'children'> = $props();

	let classes = $derived([
		'ui-button',
		`ui-button-${variant}`,
		`ui-button-${size}`,
		`ui-button-align-${align}`,
		block && 'ui-button-block',
		className
	]);
</script>

{#if href && !disabled}
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
	<a bind:this={ref} {href} class={classes} {...rest}>
		{@render children()}
	</a>
{:else}
	<button
		bind:this={ref}
		{type}
		class={classes}
		disabled={disabled || loading}
		aria-busy={loading || undefined}
		{...rest}
	>
		{#if loading !== undefined}
			<span class="ui-button-spinner" class:ui-button-spinner-active={loading} aria-hidden="true"
			></span>
		{/if}
		{@render children()}
	</button>
{/if}

<style>
	.ui-button {
		--ui-button-color: var(--accent);
		display: inline-flex;
		flex: none;
		align-items: center;
		gap: var(--space-2);
		border: 1px solid var(--border-control);
		border-radius: 0;
		background: var(--surface);
		color: var(--ui-button-color);
		line-height: 1.2;
		text-decoration: none;
		white-space: nowrap;
	}

	.ui-button-align-center {
		justify-content: center;
	}

	.ui-button-align-start {
		justify-content: flex-start;
		text-align: start;
	}

	.ui-button-sm {
		min-height: var(--control-sm);
		padding: var(--space-half) var(--space-2);
		font-size: var(--text-caption);
	}

	.ui-button-md {
		min-height: var(--control-md);
		padding: var(--space-1) var(--space-3);
	}

	.ui-button-block {
		display: flex;
		width: 100%;
		white-space: normal;
		overflow-wrap: anywhere;
	}

	/* Accent text falls under 4.5:1 on the hover and pressed fills, so those states use body text. */
	.ui-button:active:not(:disabled) {
		background: var(--control-active);
		color: var(--text);
		transition-duration: 0ms;
	}

	.ui-button:disabled {
		opacity: var(--disabled-opacity);
	}

	.ui-button[aria-busy='true'] {
		cursor: wait;
	}

	.ui-button-solid {
		border-color: var(--accent);
		background: var(--accent);
		color: var(--on-accent);
	}

	.ui-button-solid:active:not(:disabled) {
		border-color: var(--accent-hover);
		background: var(--accent-hover);
		color: var(--on-accent);
	}

	.ui-button-ghost {
		--ui-button-color: var(--link);
		min-height: var(--target-min);
		padding: 0;
		border: 0;
		background: transparent;
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--link) 65%, transparent);
		text-underline-offset: var(--underline-offset);
	}

	.ui-button-ghost:active:not(:disabled) {
		background: transparent;
		color: var(--accent);
	}

	.ui-button-overlay {
		--ui-button-color: var(--text);
		border-color: transparent;
		background: color-mix(in srgb, var(--surface) 80%, transparent);
	}

	.ui-button-danger,
	.ui-button-success {
		border-color: var(--ui-button-color);
		font-weight: 700;
	}

	.ui-button-danger {
		--ui-button-color: var(--danger);
	}

	.ui-button-success {
		--ui-button-color: var(--success);
	}

	.ui-button-danger:active:not(:disabled),
	.ui-button-success:active:not(:disabled) {
		background: color-mix(in srgb, var(--ui-button-color) 80%, var(--surface));
		color: var(--surface);
	}

	@media (hover: hover) {
		.ui-button:hover:not(:disabled, :active) {
			background: var(--control-hover);
			color: var(--text);
		}

		.ui-button-solid:hover:not(:disabled, :active) {
			border-color: var(--accent-hover);
			background: var(--accent-hover);
			color: var(--on-accent);
		}

		.ui-button-ghost:hover:not(:disabled, :active) {
			background: transparent;
			color: var(--accent);
		}

		.ui-button-danger:hover:not(:disabled, :active),
		.ui-button-success:hover:not(:disabled, :active) {
			background: var(--ui-button-color);
			color: var(--surface);
		}
	}

	.ui-button-spinner {
		flex: none;
		width: 1ch;
		text-align: center;
	}

	.ui-button-spinner-active::before {
		content: '…';
	}

	@media (prefers-reduced-motion: no-preference) {
		.ui-button {
			transition:
				background-color var(--motion-press) var(--ease-standard),
				color var(--motion-press) var(--ease-standard);
		}

		.ui-button-spinner-active::before {
			content: '|';
			animation: ui-button-spin 480ms steps(1) infinite;
		}
	}

	@keyframes ui-button-spin {
		0% {
			content: '|';
		}
		25% {
			content: '/';
		}
		50% {
			content: '-';
		}
		75% {
			content: '\\';
		}
	}
</style>
