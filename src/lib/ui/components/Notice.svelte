<!--
	@component
	Floating, non-modal notice card pinned to a viewport corner, in the style of the
	cookie banner. Render it inside a `.workspace` element so it picks up theme tokens.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		open = $bindable(true),
		title,
		position = 'bottom-right',
		dismissLabel = 'Got it',
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
			<h2 id={`${id}-title`}>{title}</h2>
			{@render children()}
		</div>
		<div class="ui-notice-actions">
			{#if actions}
				{@render actions()}
			{:else}
				<button type="button" class="ui-notice-dismiss" onclick={dismiss}>{dismissLabel}</button>
			{/if}
		</div>
	</section>
{/if}

<style>
	.ui-notice {
		position: fixed;
		bottom: max(24px, env(safe-area-inset-bottom));
		z-index: var(--layer-notice, 40);
		display: flex;
		width: min(420px, calc(100% - 48px));
		max-height: calc(100dvh - 48px);
		flex-direction: column;
		gap: 8px;
		padding: 24px;
		border: 1px solid var(--border);
		border-radius: 5px;
		background: var(--bg-2);
		color: var(--tx);
		font-size: 14px;
		line-height: 1.5;
	}

	.ui-notice-bottom-right {
		right: max(24px, env(safe-area-inset-right));
	}

	.ui-notice-bottom-left {
		left: max(24px, env(safe-area-inset-left));
	}

	.ui-notice-content {
		min-height: 0;
		flex: 1;
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	h2 {
		margin: 0 0 8px;
		font-size: 16px;
		font-weight: 700;
	}

	.ui-notice-content :global(p) {
		max-width: 75ch;
		margin: 0;
	}

	.ui-notice-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.ui-notice-dismiss {
		min-height: 44px;
		padding: 8px 24px;
		border: 1px solid var(--hard-border);
		background: var(--bg);
		color: var(--tx);
		font-weight: 700;
		cursor: pointer;
		touch-action: manipulation;
	}

	.ui-notice-dismiss:hover,
	.ui-notice-dismiss:active {
		background: var(--ui-2);
	}

	.ui-notice-dismiss:focus-visible {
		outline: 2px solid var(--tx);
		outline-offset: 4px;
	}

	@media (prefers-reduced-motion: no-preference) {
		.ui-notice {
			animation: motion-rise var(--motion-slow) var(--ease-enter);
		}
	}

	@media (max-width: 760px) {
		.ui-notice {
			bottom: max(16px, env(safe-area-inset-bottom));
			width: min(420px, calc(100% - 32px));
			max-height: calc(100dvh - 32px);
			padding: 16px;
		}

		.ui-notice-bottom-right {
			right: max(16px, env(safe-area-inset-right));
		}

		.ui-notice-bottom-left {
			left: max(16px, env(safe-area-inset-left));
		}
	}
</style>
