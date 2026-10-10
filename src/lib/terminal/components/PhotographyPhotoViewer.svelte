<script lang="ts">
	import { tick } from 'svelte';
	import { resolve } from '$app/paths';
	import type { Photograph } from '../../../content/photography';
	import { centerElementPoint, pointRatio } from '../geometry';
	import { isMobileViewport } from '../media';

	let {
		photograph,
		onClose
	}: {
		photograph?: Photograph;
		onClose: () => void;
	} = $props();

	let photoDialog = $state<HTMLDialogElement>();
	let photoViewerScroll = $state<HTMLDivElement>();
	let photoViewerImage = $state<HTMLImageElement>();
	let photoViewerMeta = $state<HTMLDivElement>();
	let photoViewerClose = $state<HTMLButtonElement>();
	let photoViewerMetaHeight = $state(120);
	let photoZoomed = $state(false);
	let photoDragging = $state(false);
	let photoDragMoved = $state(false);
	let photoDragStartX = 0;
	let photoDragStartY = 0;
	let photoDragScrollLeft = 0;
	let photoDragScrollTop = 0;
	let metadata = $state<Pick<Photograph, 'camera' | 'date' | 'width' | 'height'>>({});
	let metadataUnavailable = $state(false);
	let failedImageSource = $state('');
	let imageFailed = $derived(!!photograph && failedImageSource === photograph.src);

	$effect(() => {
		metadata = {};
		metadataUnavailable = false;
		const key = photograph?.objectKey;
		if (!key) return;
		const controller = new AbortController();
		void fetch(`${resolve('/api/photography-metadata')}?file=${encodeURIComponent(key)}`, {
			signal: controller.signal
		})
			.then(async (response) => {
				if (!response.ok) throw new Error('Metadata unavailable');
				const details = await response.json();
				if (!controller.signal.aborted) metadata = details;
			})
			.catch(() => {
				if (!controller.signal.aborted) metadataUnavailable = true;
			});
		return () => controller.abort();
	});

	$effect(() => {
		if (photograph) {
			failedImageSource = '';
			resetPhotoInteraction();
			void showPhoto();
		} else if (photoDialog?.open) {
			photoDialog.close();
		}
	});

	$effect(() => {
		const meta = photoViewerMeta;
		if (!meta) return;

		const updateHeight = () => {
			photoViewerMetaHeight = Math.ceil(meta.getBoundingClientRect().height);
		};
		const resizeObserver = new ResizeObserver(updateHeight);
		resizeObserver.observe(meta);
		updateHeight();

		return () => resizeObserver.disconnect();
	});

	async function showPhoto() {
		await tick();
		if (photoDialog && !photoDialog.open) {
			photoDialog.showModal();
			photoViewerClose?.focus({ preventScroll: true });
		}
	}

	function resetPhotoInteraction() {
		photoZoomed = false;
		photoDragging = false;
		photoDragMoved = false;
	}

	function closePhoto() {
		photoDialog?.close();
	}

	function handleDialogClose() {
		resetPhotoInteraction();
		onClose();
	}

	function handleDialogClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			closePhoto();
		}
	}

	async function togglePhotoZoom(event: MouseEvent) {
		if (photoDragMoved) {
			photoDragMoved = false;
			return;
		}

		const targetRect = photoViewerImage?.getBoundingClientRect();
		const keyboardActivation = event.detail === 0;
		const point =
			targetRect && !keyboardActivation
				? pointRatio(targetRect, event.clientX, event.clientY)
				: null;

		photoZoomed = !photoZoomed;
		photoDragging = false;
		await tick();
		centerPhotoZoomPoint(point?.x ?? 0.5, point?.y ?? 0.5);
	}

	function handlePhotoPointerDown(event: PointerEvent) {
		if (!photoZoomed || isMobileViewport() || event.button !== 0 || !photoViewerScroll) return;

		photoDragging = true;
		photoDragMoved = false;
		photoDragStartX = event.clientX;
		photoDragStartY = event.clientY;
		photoDragScrollLeft = photoViewerScroll.scrollLeft;
		photoDragScrollTop = photoViewerScroll.scrollTop;
		(event.currentTarget as HTMLButtonElement).setPointerCapture(event.pointerId);
		event.preventDefault();
	}

	function handlePhotoPointerMove(event: PointerEvent) {
		if (!photoDragging || !photoViewerScroll) return;

		const deltaX = event.clientX - photoDragStartX;
		const deltaY = event.clientY - photoDragStartY;
		if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
			photoDragMoved = true;
		}

		photoViewerScroll.scrollLeft = photoDragScrollLeft - deltaX;
		photoViewerScroll.scrollTop = photoDragScrollTop - deltaY;
		event.preventDefault();
	}

	function handlePhotoPointerUp(event: PointerEvent) {
		if (!photoDragging) return;

		photoDragging = false;
		const target = event.currentTarget as HTMLButtonElement;
		if (target.hasPointerCapture(event.pointerId)) {
			target.releasePointerCapture(event.pointerId);
		}
		if (photoDragMoved) {
			requestAnimationFrame(() => {
				photoDragMoved = false;
			});
		}
	}

	function handlePhotoPointerCancel() {
		photoDragging = false;
		photoDragMoved = false;
	}

	function centerPhotoZoomPoint(xRatio: number, yRatio: number) {
		if (!photoViewerScroll || !photoViewerImage) return;
		centerElementPoint(photoViewerScroll, photoViewerImage, xRatio, yRatio);
	}
</script>

<dialog
	bind:this={photoDialog}
	class="photography-photo-viewer"
	aria-label={photograph ? `Photograph: ${photograph.alt}` : 'Photograph viewer'}
	onclose={handleDialogClose}
	onclick={handleDialogClick}
>
	{#if photograph}
		<div
			class="photography-photo-viewer-stage"
			style={`--photography-meta-height: ${photoViewerMetaHeight}px`}
		>
			<div bind:this={photoViewerScroll} class="photography-photo-viewer-scroll">
				<div class="photography-photo-viewer-image-stage">
					{#if imageFailed}
						<p class="photography-image-error" role="status">
							Photograph unavailable. Close and reopen it to try again.
						</p>
					{:else}
						<button
							type="button"
							class={`photography-photo-viewer-image-button ${photoZoomed ? 'photography-photo-viewer-image-button-zoomed' : ''} ${photoDragging ? 'photography-photo-viewer-image-button-dragging' : ''}`}
							aria-label={photoZoomed
								? 'Drag photograph to pan; click to zoom out'
								: 'Zoom photograph in'}
							onclick={togglePhotoZoom}
							onpointerdown={handlePhotoPointerDown}
							onpointermove={handlePhotoPointerMove}
							onpointerup={handlePhotoPointerUp}
							onpointercancel={handlePhotoPointerCancel}
						>
							<img
								bind:this={photoViewerImage}
								src={photograph.src}
								alt={photograph.alt}
								width={photograph.width}
								height={photograph.height}
								draggable={false}
								class="photography-photo-viewer-image"
								onerror={() => {
									failedImageSource = photograph?.src ?? '';
								}}
							/>
						</button>
					{/if}
				</div>
			</div>
			<div bind:this={photoViewerMeta} class="photography-photo-viewer-meta">
				{#if metadata.date || metadata.camera}
					<dl>
						{#if metadata.date}
							<div>
								<dt>Date</dt>
								<dd>{metadata.date}</dd>
							</div>
						{/if}
						{#if metadata.camera}
							<div>
								<dt>Camera</dt>
								<dd>{metadata.camera}</dd>
							</div>
						{/if}
					</dl>
				{:else if metadataUnavailable}
					<span>Camera details unavailable.</span>
				{/if}
			</div>
			<button
				bind:this={photoViewerClose}
				type="button"
				class="photography-photo-viewer-close"
				aria-label="Close photograph"
				onclick={closePhoto}
			>
				X
			</button>
		</div>
	{/if}
</dialog>
