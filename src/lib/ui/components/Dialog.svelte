<!--
	@component
	Modal dialog built on the native `<dialog>` element, so focus trapping, Escape, and
	the top layer come from the browser. Styled as a small terminal window with a legend
	title and red close button; clicking the backdrop closes it.

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

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === dialog) dialog?.close();
	}
</script>

<dialog
	bind:this={dialog}
	class={['ui-dialog', `ui-dialog-${size}`, className]}
	aria-labelledby={`${id}-title`}
	onclose={handleClose}
	onclick={handleBackdropClick}
>
	<div class="ui-dialog-frame">
		<div class="ui-dialog-titlebar">
			<h2 id={`${id}-title`} class="ui-dialog-title">{title}</h2>
			<CloseButton label={closeLabel} onclick={() => dialog?.close()} />
		</div>
		<div class="ui-dialog-body">{@render children()}</div>
		{#if footer}<div class="ui-dialog-footer">{@render footer()}</div>{/if}
	</div>
</dialog>

<style>
	.ui-dialog {
		width: min(var(--ui-dialog-width), calc(100vw - 32px));
		max-width: none;
		max-height: calc(100dvh - 48px);
		/* Tailwind preflight clears the UA auto margins that center modal dialogs. */
		margin: auto;
		padding: 14px 0 0;
		overflow: visible;
		border: 0;
		background: transparent;
		color: var(--tx);
	}

	.ui-dialog-sm {
		--ui-dialog-width: 420px;
	}

	.ui-dialog-md {
		--ui-dialog-width: 640px;
	}

	.ui-dialog-lg {
		--ui-dialog-width: 960px;
	}

	.ui-dialog::backdrop {
		background: rgba(16, 15, 15, 0.88);
	}

	.ui-dialog-frame {
		position: relative;
		display: flex;
		max-height: calc(100dvh - 62px);
		flex-direction: column;
		border: 2px solid var(--yellow);
		border-radius: 5px;
		background: var(--bg);
		box-shadow: 0 18px 44px rgba(0, 0, 0, 0.45);
	}

	.ui-dialog-titlebar {
		position: absolute;
		top: 0;
		right: 8px;
		left: 8px;
		display: flex;
		align-items: center;
		gap: 6px;
		transform: translateY(-50%);
	}

	.ui-dialog-title {
		max-width: 75%;
		margin: 0;
		padding: 0 7px;
		overflow: hidden;
		background: var(--bg);
		color: var(--yellow);
		font-size: 15px;
		font-weight: 700;
		line-height: 1.2;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.ui-dialog-titlebar :global(.ui-close) {
		margin-left: auto;
	}

	.ui-dialog-body {
		min-height: 0;
		padding: 22px 16px 16px;
		overflow: auto;
		scrollbar-width: thin;
		scrollbar-color: var(--border) transparent;
	}

	.ui-dialog-footer {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 8px;
		padding: 10px 16px;
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
			width: calc(100vw - 20px);
		}

		.ui-dialog-frame {
			border-width: 1px;
			border-radius: 3px;
		}

		.ui-dialog-title {
			max-width: calc(100% - 48px);
			font-size: 13px;
		}

		.ui-dialog-body {
			padding: 28px 10px 12px;
		}

		.ui-dialog-footer {
			padding: 10px;
		}
	}
</style>
