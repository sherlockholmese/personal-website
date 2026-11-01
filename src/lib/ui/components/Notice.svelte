<!--
	@component
	Floating, non-modal notice card pinned to a viewport corner. Use `bind:titleRef` to
	move focus to the title when reopening it from a command.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from './Button.svelte';

	let {
		open = $bindable(true),
		title,
		position = 'bottom-right',
		dismissLabel = 'Got it',
		titleRef = $bindable<HTMLHeadingElement | undefined>(),
		onDismiss,
		class: className = '',
		children,
		actions
	}: {
		open?: boolean;
		title: string;
		position?: 'bottom-right' | 'bottom-left';
		/** Text for the default dismiss button; ignored when `actions` is supplied. */
		dismissLabel?: string;
		titleRef?: HTMLHeadingElement;
		onDismiss?: () => void;
		class?: string;
		children: Snippet;
		actions?: Snippet;
	} = $props();

	const id = $props.id();

	function dismiss() {
		open = false;
		onDismiss?.();
	}
</script>

{#if open}
	<section
		class={['ui-notice', `ui-notice-${position}`, className]}
		aria-labelledby={`${id}-title`}
	>
		<div class="ui-notice-content">
			<h2 id={`${id}-title`} tabindex="-1" bind:this={titleRef}>{title}</h2>
			{@render children()}
		</div>
		<div class="ui-notice-actions">
			{#if actions}
				{@render actions()}
			{:else}
				<Button block onclick={dismiss}>{dismissLabel}</Button>
			{/if}
		</div>
	</section>
{/if}

<style>
	.ui-notice {
		--ui-notice-inset: var(--space-6);
		position: fixed;
		bottom: max(var(--ui-notice-inset), env(safe-area-inset-bottom));
		z-index: var(--layer-notice);
		display: flex;
		width: min(420px, calc(100% - 2 * var(--ui-notice-inset)));
		max-height: calc(100dvh - 2 * var(--ui-notice-inset));
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--ui-notice-inset);
		border: 1px solid var(--border);
		border-radius: var(--radius-frame);
		background: var(--surface-raised);
		color: var(--text);
		font-size: var(--text-caption);
		line-height: 1.5;
	}

	.ui-notice-bottom-right {
		right: max(var(--ui-notice-inset), env(safe-area-inset-right));
	}

	.ui-notice-bottom-left {
		left: max(var(--ui-notice-inset), env(safe-area-inset-left));
	}

	.ui-notice-content {
		min-height: 0;
		flex: 1;
		/* Room for focus rings inside the scroll clip. */
		margin: calc(-1 * var(--space-1));
		padding: var(--space-1);
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	h2 {
		margin: 0 0 var(--space-2);
		font-size: var(--text-reading);
		font-weight: 700;
	}

	.ui-notice-content :global(p) {
		max-width: 75ch;
		margin: 0;
	}

	.ui-notice-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	@media (prefers-reduced-motion: no-preference) {
		.ui-notice {
			animation: motion-rise var(--motion-slow) var(--ease-enter);
		}
	}

	@media (max-width: 760px) {
		.ui-notice {
			--ui-notice-inset: var(--space-4);
		}
	}
</style>
