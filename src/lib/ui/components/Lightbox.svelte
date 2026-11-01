<!--
	@component
	Full-screen image viewer on the native `<dialog>`, so focus trapping, focus return,
	Escape, and the top layer come from the browser. Click the image to zoom; drag or
	scroll to pan. Setting `image` opens it, clearing `image` closes it, and the last
	image stays rendered for the exit transition.

	`footer` renders a bar pinned below the image, such as photo metadata.
-->
<script lang="ts">
	import { tick, type Snippet } from 'svelte';
	import { centerElementPoint, pointRatio } from '#lib/terminal/geometry.ts';
	import { isMobileViewport } from '#lib/terminal/media.ts';
	import type { LightboxImage } from '../types';
	import CloseButton from './CloseButton.svelte';

	const DRAG_THRESHOLD_PX = 4;

	let {
		image,
		label,
		closeLabel = 'Close image',
		errorMessage = 'Image unavailable. Close and reopen it to try again.',
		onClose,
		footer
	}: {
		image?: LightboxImage;
		/** Accessible dialog name. */
		label: string;
		closeLabel?: string;
		errorMessage?: string;
		onClose: () => void;
		footer?: Snippet;
	} = $props();

	let dialog = $state<HTMLDialogElement>();
	let scroller = $state<HTMLDivElement>();
	let imageElement = $state<HTMLImageElement>();
	let footerElement = $state<HTMLDivElement>();
	let closeButton = $state<HTMLButtonElement>();
	let footerHeight = $state(0);
	let zoomed = $state(false);
	let dragging = $state(false);
	let dragMoved = false;
	let dragStart = { x: 0, y: 0, left: 0, top: 0 };
	let failedSource = $state('');
	let shown = $state<LightboxImage>();
	let failed = $derived(!!shown && failedSource === shown.src);

	$effect(() => {
		if (image) {
			shown = image;
			failedSource = '';
			zoomed = !!image.origin;
			dragging = false;
			dragMoved = false;
			void show(image);
		} else if (dialog?.open) {
			dialog.close();
		}
	});

	$effect(() => {
		const element = footerElement;
		if (!element) return;
		const observer = new ResizeObserver(() => {
			footerHeight = Math.ceil(element.getBoundingClientRect().height);
		});
		observer.observe(element);
		return () => observer.disconnect();
	});

	async function show(next: LightboxImage) {
		await tick();
		if (dialog && !dialog.open) {
			dialog.showModal();
			closeButton?.focus({ preventScroll: true });
		}
		if (next.origin) centerPoint(next.origin.x, next.origin.y);
	}

	function centerPoint(xRatio: number, yRatio: number) {
		if (scroller && imageElement) centerElementPoint(scroller, imageElement, xRatio, yRatio);
	}

	function handleClose() {
		zoomed = false;
		dragging = false;
		onClose();
	}

	function handleDialogClick(event: MouseEvent) {
		if (event.target === event.currentTarget) dialog?.close();
	}

	async function toggleZoom(event: MouseEvent) {
		if (dragMoved) {
			dragMoved = false;
			return;
		}
		const rect = imageElement?.getBoundingClientRect();
		const keyboard = event.detail === 0;
		const point = rect && !keyboard ? pointRatio(rect, event.clientX, event.clientY) : null;
		zoomed = !zoomed;
		dragging = false;
		await tick();
		centerPoint(point?.x ?? 0.5, point?.y ?? 0.5);
	}

	function handlePointerDown(event: PointerEvent) {
		if (!zoomed || isMobileViewport() || event.button !== 0 || !scroller) return;
		dragging = true;
		dragMoved = false;
		dragStart = {
			x: event.clientX,
			y: event.clientY,
			left: scroller.scrollLeft,
			top: scroller.scrollTop
		};
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		event.preventDefault();
	}

	function handlePointerMove(event: PointerEvent) {
		if (!dragging || !scroller) return;
		const deltaX = event.clientX - dragStart.x;
		const deltaY = event.clientY - dragStart.y;
		if (Math.abs(deltaX) > DRAG_THRESHOLD_PX || Math.abs(deltaY) > DRAG_THRESHOLD_PX) {
			dragMoved = true;
		}
		scroller.scrollLeft = dragStart.left - deltaX;
		scroller.scrollTop = dragStart.top - deltaY;
		event.preventDefault();
	}

	function handlePointerUp(event: PointerEvent) {
		if (!dragging) return;
		dragging = false;
		const target = event.currentTarget as HTMLElement;
		if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
		if (dragMoved) requestAnimationFrame(() => (dragMoved = false));
	}

	function handlePointerCancel() {
		dragging = false;
		dragMoved = false;
	}
</script>

<dialog
	bind:this={dialog}
	class="ui-lightbox"
	aria-label={label}
	onclose={handleClose}
	onclick={handleDialogClick}
>
	{#if shown}
		<div class="ui-lightbox-stage" style:--ui-lightbox-footer={`${footerHeight}px`}>
			<div bind:this={scroller} class="ui-lightbox-scroll ui-scroll">
				<div class="ui-lightbox-canvas">
					{#if failed}
						<p class="ui-lightbox-error" role="status">{errorMessage}</p>
					{:else}
						<button
							type="button"
							class="ui-lightbox-zoom"
							class:ui-lightbox-zoomed={zoomed}
							class:ui-lightbox-dragging={dragging}
							aria-label={zoomed ? 'Drag to pan; click to zoom out' : 'Zoom in'}
							onclick={toggleZoom}
							onpointerdown={handlePointerDown}
							onpointermove={handlePointerMove}
							onpointerup={handlePointerUp}
							onpointercancel={handlePointerCancel}
						>
							<img
								bind:this={imageElement}
								src={shown.src}
								alt={shown.alt}
								width={shown.width}
								height={shown.height}
								draggable={false}
								onerror={() => (failedSource = shown?.src ?? '')}
							/>
						</button>
					{/if}
				</div>
			</div>
			{#if footer}
				<div bind:this={footerElement} class="ui-lightbox-footer">{@render footer()}</div>
			{/if}
			<CloseButton
				bind:ref={closeButton}
				class="ui-lightbox-close"
				label={closeLabel}
				onclick={() => dialog?.close()}
			/>
		</div>
	{/if}
</dialog>

<style>
	.ui-lightbox {
		--ui-lightbox-inset: var(--space-6);
		--ui-lightbox-zoom-width: min(2200px, 180vw);
		width: 100vw;
		height: 100dvh;
		max-width: none;
		max-height: none;
		margin: 0;
		padding: 0;
		overflow: hidden;
		border: 0;
		background: color-mix(in srgb, var(--surface) 92%, transparent);
		color: var(--text);
	}

	.ui-lightbox::backdrop {
		background: var(--surface);
	}

	.ui-lightbox-stage {
		position: relative;
		width: 100%;
		height: 100%;
	}

	.ui-lightbox-scroll {
		position: absolute;
		inset: 0;
		padding: var(--ui-lightbox-inset) var(--ui-lightbox-inset)
			calc(var(--ui-lightbox-footer) + var(--ui-lightbox-inset));
		overflow: auto;
	}

	.ui-lightbox-canvas {
		display: grid;
		width: max-content;
		min-width: 100%;
		min-height: calc(100dvh - var(--ui-lightbox-footer) - 2 * var(--ui-lightbox-inset));
		place-items: center;
	}

	.ui-lightbox-zoom {
		padding: 0;
		background: transparent;
		cursor: zoom-in;
	}

	.ui-lightbox-zoom img {
		display: block;
		width: auto;
		height: auto;
		max-width: calc(100vw - 2 * var(--ui-lightbox-inset));
		max-height: calc(100dvh - var(--ui-lightbox-footer) - 2 * var(--ui-lightbox-inset));
		object-fit: contain;
	}

	.ui-lightbox-zoomed {
		cursor: grab;
		user-select: none;
	}

	.ui-lightbox-dragging {
		cursor: grabbing;
	}

	.ui-lightbox-zoomed img {
		width: var(--ui-lightbox-zoom-width);
		max-width: none;
		max-height: none;
	}

	.ui-lightbox-error {
		padding: var(--space-4);
		color: var(--text-muted);
		text-align: center;
	}

	.ui-lightbox-footer {
		position: absolute;
		right: 0;
		bottom: 0;
		left: 0;
		padding: var(--space-3) var(--space-4) max(var(--space-3), env(safe-area-inset-bottom));
		border-top: 1px solid var(--border);
		background: color-mix(in srgb, var(--surface) 88%, transparent);
		font-size: var(--text-caption);
		pointer-events: none;
	}

	.ui-lightbox-stage :global(.ui-lightbox-close) {
		position: absolute;
		top: max(var(--ui-lightbox-inset), env(safe-area-inset-top));
		right: max(var(--ui-lightbox-inset), env(safe-area-inset-right));
		z-index: var(--layer-raised);
	}

	@media (prefers-reduced-motion: no-preference) {
		/* Closed state carries the exit timing; [open] carries the enter timing. */
		.ui-lightbox,
		.ui-lightbox::backdrop {
			opacity: 0;
			transition:
				opacity var(--motion-exit) var(--ease-exit),
				display var(--motion-exit) allow-discrete,
				overlay var(--motion-exit) allow-discrete;
		}

		.ui-lightbox-canvas {
			transform: scale(0.985);
			transition: transform var(--motion-exit) var(--ease-exit);
		}

		.ui-lightbox[open],
		.ui-lightbox[open]::backdrop {
			opacity: 1;
			transition:
				opacity var(--motion-normal) var(--ease-enter),
				display var(--motion-normal) allow-discrete,
				overlay var(--motion-normal) allow-discrete;
		}

		.ui-lightbox[open] .ui-lightbox-canvas {
			transform: none;
			transition: transform var(--motion-normal) var(--ease-enter);
		}

		@starting-style {
			.ui-lightbox[open],
			.ui-lightbox[open]::backdrop {
				opacity: 0;
			}

			.ui-lightbox[open] .ui-lightbox-canvas {
				transform: scale(0.985);
			}
		}
	}

	@media (max-width: 760px) {
		.ui-lightbox {
			--ui-lightbox-inset: var(--space-2);
			--ui-lightbox-zoom-width: 230vw;
		}

		.ui-lightbox-footer {
			padding-inline: var(--space-3);
		}
	}
</style>
