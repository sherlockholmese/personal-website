<!--
	@component
	Modal dialog built on the native `<dialog>` element, so focus trapping, Escape, and
	the top layer come from the browser. Styled as a small terminal window with a legend
	title and red close button. A press that starts and ends outside the frame closes it.

	```svelte
	<Dialog bind:open title="confirm">
		<Text>Delete this draft?</Text>
		{#snippet footer()}<Button variant="danger">delete</Button>{/snippet}
	</Dialog>
	```
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import CloseButton from './CloseButton.svelte';

	let {
		open = $bindable(false),
		title,
		size = 'md',
		closeLabel = 'Close dialog',
		onClose,
		class: className = '',
		children,
		footer
	}: {
		open?: boolean;
		title: string;
		size?: 'sm' | 'md' | 'lg';
		closeLabel?: string;
		onClose?: () => void;
		class?: string;
		children: Snippet;
		footer?: Snippet;
	} = $props();

	const id = $props.id();
	let dialog = $state<HTMLDialogElement>();
	let frame = $state<HTMLDivElement>();
	let pressStartedOutside = false;

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		else if (!open && dialog.open) dialog.close();
	});

	function handleClose() {
		if (!open) return;
		open = false;
		onClose?.();
	}

	function isOutside(event: MouseEvent) {
		if (event.target !== dialog || !frame) return false;
		const rect = frame.getBoundingClientRect();
		return (
			event.clientX < rect.left ||
			event.clientX > rect.right ||
			event.clientY < rect.top ||
			event.clientY > rect.bottom
		);
	}

	function handleClick(event: MouseEvent) {
		if (pressStartedOutside && isOutside(event)) dialog?.close();
		pressStartedOutside = false;
	}
</script>

<dialog
	bind:this={dialog}
	class={['ui-dialog', `ui-dialog-${size}`, className]}
	aria-labelledby={`${id}-title`}
	onclose={handleClose}
	onpointerdown={(event) => (pressStartedOutside = isOutside(event))}
	onclick={handleClick}
>
	<div bind:this={frame} class="ui-dialog-frame">
		<div class="ui-dialog-titlebar">
			<h2 id={`${id}-title`} class="ui-dialog-title" {title}>{title}</h2>
			<CloseButton label={closeLabel} onclick={() => dialog?.close()} />
		</div>
		<div class="ui-dialog-body ui-scroll">{@render children()}</div>
		{#if footer}<div class="ui-dialog-footer">{@render footer()}</div>{/if}
	</div>
</dialog>

<style>
	.ui-dialog {
		--ui-dialog-offset: calc(var(--control-close) / 2);
		width: min(var(--ui-dialog-width), calc(100vw - 2 * var(--space-4)));
		max-width: none;
		max-height: calc(100dvh - 2 * var(--space-6));
		/* Tailwind preflight clears the UA auto margins that center modal dialogs. */
		margin: auto;
		padding: var(--ui-dialog-offset) 0 0;
		overflow: visible;
		border: 0;
		background: transparent;
		color: var(--text);
	}

	.ui-dialog-sm {
		--ui-dialog-width: var(--overlay-sm);
	}

	.ui-dialog-md {
		--ui-dialog-width: var(--overlay-md);
	}

	.ui-dialog-lg {
		--ui-dialog-width: var(--overlay-lg);
	}

	.ui-dialog::backdrop {
		background: var(--scrim);
	}

	.ui-dialog-frame {
		position: relative;
		display: flex;
		max-height: calc(100dvh - 2 * var(--space-6) - var(--ui-dialog-offset));
		flex-direction: column;
		border: var(--border-frame) solid var(--accent);
		border-radius: var(--radius-frame);
		background: var(--surface);
		box-shadow: var(--shadow-overlay);
	}

	.ui-dialog-titlebar {
		position: absolute;
		top: 0;
		right: var(--space-2);
		left: var(--space-2);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		transform: translateY(-50%);
	}

	.ui-dialog-title {
		min-width: 0;
		margin: 0;
		padding: 0 var(--space-2);
		overflow: hidden;
		background: var(--surface);
		color: var(--accent);
		font-size: var(--text-body);
		font-weight: 700;
		line-height: 1.2;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.ui-dialog-body {
		min-height: 0;
		padding: calc(var(--ui-dialog-offset) + var(--space-2)) var(--space-4) var(--space-4);
		overflow: auto;
	}

	.ui-dialog-footer {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-4);
		border-top: 1px solid var(--border);
	}

	@media (prefers-reduced-motion: no-preference) {
		.ui-dialog,
		.ui-dialog::backdrop {
			opacity: 0;
			transition:
				opacity var(--motion-exit) var(--ease-exit),
				display var(--motion-exit) allow-discrete,
				overlay var(--motion-exit) allow-discrete;
		}

		.ui-dialog[open],
		.ui-dialog[open]::backdrop {
			opacity: 1;
			transition:
				opacity var(--motion-normal) var(--ease-enter),
				display var(--motion-normal) allow-discrete,
				overlay var(--motion-normal) allow-discrete;
		}

		@starting-style {
			.ui-dialog[open],
			.ui-dialog[open]::backdrop {
				opacity: 0;
			}
		}
	}

	@media (max-width: 760px) {
		.ui-dialog {
			width: calc(100vw - 2 * var(--space-2));
		}

		.ui-dialog-body {
			padding-inline: var(--space-3);
		}

		.ui-dialog-footer {
			padding-inline: var(--space-3);
		}

		.ui-dialog-footer :global(.ui-button) {
			flex: 1;
		}
	}
</style>
