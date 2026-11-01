<!--
	@component
	Square-cornered terminal button. Renders an `<a>` when `href` is set.

	| variant   | look                                                     |
	| --------- | -------------------------------------------------------- |
	| `outline` | bordered accent text, as in the mobile shortcut row      |
	| `solid`   | filled accent block, as in command chips                 |
	| `ghost`   | underlined cyan text, as in `retry` actions              |
	| `danger`  | red outline that fills on hover, as in close buttons     |
	| `success` | green outline that fills on hover, as in download blocks |

	Below 760px buttons grow to a 40px (`sm`) or 44px (`md`) touch target.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import type { Size } from '../types';

	type Variant = 'outline' | 'solid' | 'ghost' | 'danger' | 'success';

	let {
		variant = 'outline',
		size = 'md',
		href,
		loading = false,
		disabled = false,
		block = false,
		type = 'button',
		ref = $bindable<HTMLElement | undefined>(),
		class: className = '',
		children,
		...rest
	}: {
		variant?: Variant;
		size?: Size;
		href?: string;
		loading?: boolean;
		disabled?: boolean;
		/** Stretch to the container width. */
		block?: boolean;
		type?: 'button' | 'submit' | 'reset';
		ref?: HTMLElement;
		class?: string;
		children: Snippet;
	} & Omit<HTMLButtonAttributes & HTMLAnchorAttributes, 'type' | 'href' | 'children'> = $props();

	let classes = $derived([
		'ui-button',
		`ui-button-${variant}`,
		`ui-button-${size}`,
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
		{#if loading}<span class="ui-button-spinner" aria-hidden="true"></span>{/if}
		{@render children()}
	</button>
{/if}

<style>
	.ui-button {
		--ui-button-color: var(--yellow);
		display: inline-flex;
		flex: none;
		align-items: center;
		justify-content: center;
		gap: 8px;
		border: 1px solid var(--border);
		border-radius: 0;
		background: var(--bg);
		color: var(--ui-button-color);
		line-height: 1.2;
		text-decoration: none;
		white-space: nowrap;
		cursor: pointer;
		touch-action: manipulation;
	}

	.ui-button-sm {
		min-height: 28px;
		padding: 3px 8px;
		font-size: 14px;
	}

	.ui-button-md {
		min-height: 32px;
		padding: 5px 12px;
	}

	.ui-button-block {
		display: flex;
		width: 100%;
	}

	.ui-button:hover:not(:disabled) {
		background: var(--ui-2);
	}

	.ui-button:focus-visible {
		outline: 2px solid var(--ui-button-color);
		outline-offset: 2px;
	}

	.ui-button:disabled {
		cursor: not-allowed;
		opacity: 0.55;
	}

	.ui-button[aria-busy='true'] {
		cursor: wait;
	}

	.ui-button-solid {
		border-color: var(--yellow);
		background: var(--yellow);
		color: var(--bg);
	}

	.ui-button-solid:hover:not(:disabled) {
		border-color: var(--cyan);
		background: var(--cyan);
	}

	.ui-button-solid:focus-visible {
		outline-color: var(--tx);
	}

	.ui-button-ghost {
		--ui-button-color: var(--cyan);
		min-height: 0;
		padding-inline: 0;
		border-color: transparent;
		background: transparent;
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--cyan) 65%, transparent);
		text-underline-offset: 3px;
	}

	.ui-button-ghost:hover:not(:disabled) {
		background: transparent;
		color: var(--yellow);
	}

	.ui-button-danger,
	.ui-button-success {
		border-color: var(--ui-button-color);
		font-weight: 700;
	}

	.ui-button-danger {
		--ui-button-color: var(--red);
	}

	.ui-button-success {
		--ui-button-color: var(--green);
	}

	.ui-button-danger:hover:not(:disabled),
	.ui-button-success:hover:not(:disabled) {
		background: var(--ui-button-color);
		color: var(--bg);
	}

	.ui-button-spinner {
		width: 1ch;
		text-align: center;
	}

	.ui-button-spinner::before {
		content: '…';
	}

	@media (prefers-reduced-motion: no-preference) {
		.ui-button {
			transition:
				background-color var(--motion-fast) var(--ease-standard),
				color var(--motion-fast) var(--ease-standard);
		}

		.ui-button-spinner::before {
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

	@media (max-width: 760px) {
		.ui-button-sm {
			min-height: 40px;
			padding-inline: 11px;
		}

		.ui-button-md {
			min-height: 44px;
			padding-inline: 14px;
			font-size: 16px;
		}

		.ui-button-ghost {
			min-height: 44px;
		}
	}
</style>
