<script lang="ts">
	import { findPhotograph, type Photograph } from '#lib/photography.ts';
	import { centeredScrollLeft } from '../geometry';
	import { planeExit, prefersReducedMotion } from '../motion';
	import PhotographyTile from './PhotographyTile.svelte';
	import PhotographyPhotoViewer from './PhotographyPhotoViewer.svelte';

	let {
		photographs,
		headerPhotograph,
		unavailable = false,
		initialPhotoSlug = '',
		onClose,
		onPhotoOpen,
		onPhotoClose
	}: {
		photographs: Photograph[];
		headerPhotograph?: Photograph;
		unavailable?: boolean;
		initialPhotoSlug?: string;
		onClose: () => void;
		onPhotoOpen: (photograph: Photograph) => void;
		onPhotoClose: () => void;
	} = $props();

	// Edge zones cover the outer fifth of the strip; speed ramps in quadratically toward the edge.
	const STRIP_EDGE_RATIO = 0.2;
	const STRIP_EDGE_MIN_PX = 120;
	const STRIP_MAX_SPEED_PX_PER_S = 1100;
	// Exponential smoothing rates (per second) for edge-scroll velocity and eased scrolling.
	const STRIP_ACCELERATION_RATE = 8;
	const WHEEL_RATE = 14;
	const MAX_FRAME_S = 0.05;
	const WHEEL_LINE_PX = 16;
	// Trackpads send small pixel deltas and already feel smooth; only ease larger wheel steps.
	const WHEEL_DIRECT_MAX_PX = 40;
	// How long after the last strip scroll the strip keeps driving the stage.
	const STRIP_DRIVE_HOLD_MS = 250;

	let galleryStage = $state<HTMLDivElement>();
	let galleryStrip = $state<HTMLElement>();
	let activePhotoId = $state('');
	// Shown until the next photograph is completely in view, and only when the stage overflows.
	let stageOverflows = $state(false);
	let nextPhotoShown = $state(false);
	// Fades with scroll progress toward revealing the next photograph.
	let hintOpacity = $state(1);
	let galleryHint = $state<HTMLButtonElement>();
	let stripHovered = false;
	let stripPointer: { x: number; y: number } | undefined;
	let stripHoveredPhotoId = '';
	let savedStageScroll = 0;

	let orderedPhotographs = $derived([
		...(headerPhotograph ? [headerPhotograph] : []),
		...photographs
	]);
	let selectedPhoto = $derived(findPhotograph(orderedPhotographs, initialPhotoSlug));
	// Alternate photographs between two rows so left-to-right order roughly matches the strip.
	// Desktop and short stages flatten them back into one ordered row in CSS.
	let galleryRows = $derived(
		[0, 1].map((row) =>
			photographs
				.map((photograph, index) => ({ photograph, index }))
				.filter(({ index }) => index % 2 === row)
		)
	);

	/**
	 * Eases an element's scrollLeft toward a target each frame. Keeps a fractional position so slow
	 * easing is not lost to whole-pixel rounding.
	 */
	function createScrollEaser(rate: number) {
		let element: HTMLElement | undefined;
		let frame = 0;
		let frameTime = 0;
		let position = 0;
		let target = 0;

		function step(time: number) {
			frame = 0;
			if (!element) return;
			const seconds = frameSeconds(time, frameTime);
			frameTime = time;
			const distance = target - position;
			if (Math.abs(distance) < 0.5) {
				element.scrollLeft = position = target;
				return;
			}
			position += distance * (1 - Math.exp(-rate * seconds));
			element.scrollLeft = position;
			frame = requestAnimationFrame(step);
		}

		return {
			get active() {
				return frame !== 0;
			},
			get target() {
				return target;
			},
			to(node: HTMLElement, left: number) {
				const range = node.scrollWidth - node.clientWidth;
				target = Math.min(Math.max(left, 0), range);
				if (prefersReducedMotion()) {
					this.stop();
					node.scrollLeft = target;
					return;
				}
				if (!frame || element !== node) {
					cancelAnimationFrame(frame);
					element = node;
					position = node.scrollLeft;
					frameTime = performance.now();
					frame = requestAnimationFrame(step);
				}
			},
			stop() {
				cancelAnimationFrame(frame);
				frame = 0;
			}
		};
	}

	const stageEaser = createScrollEaser(WHEEL_RATE);

	let edgeFrame = 0;
	let edgeFrameTime = 0;
	let edgeVelocity = 0;
	let edgePosition = 0;
	let syncFrame = 0;
	let stripSyncFrame = 0;
	let stripDrivenUntil = 0;
	let lastStripWrite = Number.NaN;

	$effect(() => {
		if (galleryStage && orderedPhotographs.length) syncWithStage();
		return () => {
			cancelAnimationFrame(syncFrame);
			cancelAnimationFrame(stripSyncFrame);
			cancelAnimationFrame(edgeFrame);
			stageEaser.stop();
		};
	});

	// Wheel listeners must be non-passive to turn vertical wheel movement into horizontal travel.
	$effect(() => {
		const stage = galleryStage;
		if (!stage) return;
		stage.addEventListener('wheel', handleStageWheel, { passive: false });
		return () => stage.removeEventListener('wheel', handleStageWheel);
	});

	function frameSeconds(time: number, previous: number) {
		return Math.min(Math.max(time - previous, 0) / 1000, MAX_FRAME_S);
	}

	function handleWindowKeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape' || selectedPhoto || event.defaultPrevented) return;
		event.preventDefault();
		onClose();
	}

	function handleStageWheel(event: WheelEvent) {
		if (!galleryStage || event.ctrlKey) return;
		if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
		event.preventDefault();
		const delta =
			event.deltaMode === WheelEvent.DOM_DELTA_LINE
				? event.deltaY * WHEEL_LINE_PX
				: event.deltaMode === WheelEvent.DOM_DELTA_PAGE
					? event.deltaY * galleryStage.clientWidth
					: event.deltaY;
		if (Math.abs(delta) <= WHEEL_DIRECT_MAX_PX && !stageEaser.active) {
			galleryStage.scrollLeft += delta;
			return;
		}
		const from = stageEaser.active ? stageEaser.target : galleryStage.scrollLeft;
		stageEaser.to(galleryStage, from + delta);
	}

	function photoFrame(container: HTMLElement | undefined, photograph: Photograph) {
		return container?.querySelector<HTMLElement>(`[data-photo-id="${CSS.escape(photograph.id)}"]`);
	}

	function scrollToPhoto(photograph: Photograph) {
		const frame = photoFrame(galleryStage, photograph);
		if (!galleryStage || !frame) return;
		activePhotoId = photograph.id;
		stageEaser.to(galleryStage, centeredScrollLeft(galleryStage, frame));
	}

	// Glide on until the third photograph under the hint is completely in view, so the hint's
	// scroll-synced fade plays out during the glide.
	function showNextPhoto() {
		const range = galleryStage && hintFadeRange(galleryStage.getBoundingClientRect());
		if (!galleryStage || !range) return;
		stageEaser.to(galleryStage, range.end + 1);
	}

	function openPhoto(photograph: Photograph) {
		savedStageScroll = galleryStage?.scrollLeft ?? 0;
		onPhotoOpen(photograph);
	}

	// Navigation and dialog focus return can jump the gallery; put it back where it was.
	function closePhoto() {
		if (!selectedPhoto) return;
		const stageLeft = savedStageScroll;
		const restore = () => {
			if (galleryStage) galleryStage.scrollLeft = stageLeft;
		};
		restore();
		onPhotoClose();
		requestAnimationFrame(() => requestAnimationFrame(restore));
	}

	function hoverStripPhoto(photograph: Photograph) {
		if (stripHoveredPhotoId === photograph.id) return;
		stripHoveredPhotoId = photograph.id;
		scrollToPhoto(photograph);
	}

	function handleThumbnailPointerEnter(event: PointerEvent, photograph: Photograph) {
		if (event.pointerType === 'mouse') hoverStripPhoto(photograph);
	}

	// Only a mouse hovers; touches must not pause the strip's tracking of the stage.
	function handleStripPointerEnter(event: PointerEvent) {
		if (event.pointerType === 'mouse') stripHovered = true;
	}

	function handleStripPointerMove(event: PointerEvent) {
		if (event.pointerType !== 'mouse') return;
		stripPointer = { x: event.clientX, y: event.clientY };
		if (!edgeFrame && galleryStrip) {
			edgePosition = galleryStrip.scrollLeft;
			edgeFrameTime = performance.now();
			edgeFrame = requestAnimationFrame(edgeScrollStrip);
		}
	}

	function handleStripPointerLeave() {
		stripHovered = false;
		stripPointer = undefined;
		stripHoveredPhotoId = '';
		edgeVelocity = 0;
		cancelAnimationFrame(edgeFrame);
		edgeFrame = 0;
	}

	function edgeSpeed(rect: DOMRect, x: number) {
		const zone = Math.min(
			Math.max(STRIP_EDGE_MIN_PX, rect.width * STRIP_EDGE_RATIO),
			rect.width / 2
		);
		const intoStart = 1 - (x - rect.left) / zone;
		const intoEnd = 1 - (rect.right - x) / zone;
		if (intoStart > 0) return -STRIP_MAX_SPEED_PX_PER_S * Math.min(intoStart, 1) ** 2;
		if (intoEnd > 0) return STRIP_MAX_SPEED_PX_PER_S * Math.min(intoEnd, 1) ** 2;
		return 0;
	}

	// Scroll the strip while the pointer is in an edge zone, easing velocity in and out.
	function edgeScrollStrip(time: number) {
		edgeFrame = 0;
		if (!galleryStrip || !stripPointer) return;
		const seconds = frameSeconds(time, edgeFrameTime);
		edgeFrameTime = time;
		const targetSpeed = edgeSpeed(galleryStrip.getBoundingClientRect(), stripPointer.x);
		edgeVelocity +=
			(targetSpeed - edgeVelocity) * (1 - Math.exp(-STRIP_ACCELERATION_RATE * seconds));
		if (!targetSpeed && Math.abs(edgeVelocity) < 4) {
			edgeVelocity = 0;
			return;
		}

		const range = galleryStrip.scrollWidth - galleryStrip.clientWidth;
		edgePosition = Math.min(Math.max(edgePosition + edgeVelocity * seconds, 0), range);
		setStripScroll(edgePosition);
		if (edgePosition === 0 || edgePosition === range) edgeVelocity = 0;

		const thumbnail = document
			.elementFromPoint(stripPointer.x, stripPointer.y)
			?.closest<HTMLElement>('.photography-gallery-thumbnail');
		const photograph = orderedPhotographs.find((photo) => photo.id === thumbnail?.dataset.photoId);
		if (photograph) hoverStripPhoto(photograph);
		edgeFrame = requestAnimationFrame(edgeScrollStrip);
	}

	function handleStageScroll() {
		cancelAnimationFrame(syncFrame);
		syncFrame = requestAnimationFrame(syncWithStage);
	}

	// The stage and strip scroll in lockstep. Each has a reading point that sweeps from its left edge
	// to its right edge as it scrolls end to end, so the first and last photographs are reachable on
	// both. The reading point's fractional position between photograph centers is shared: scrolling
	// either one moves the other to the same position, and the nearest photograph is highlighted.
	function syncWithStage() {
		if (!galleryStage) return;
		const stageRect = galleryStage.getBoundingClientRect();
		stageOverflows = galleryStage.scrollWidth > galleryStage.clientWidth;
		if (!nextPhotoShown) updateHint(stageRect);

		const position = readingPosition(galleryStage, stageFrames());
		if (position === undefined) return;
		activePhotoId = orderedPhotographs[Math.round(position)].id;
		if (!galleryStrip || stripHovered || performance.now() < stripDrivenUntil) return;
		const left = scrollForPosition(galleryStrip, stripThumbnails(), position);
		if (left !== undefined) setStripScroll(left);
	}

	function handleStripScroll() {
		if (!galleryStrip || Math.abs(galleryStrip.scrollLeft - lastStripWrite) < 1) return;
		// The person is scrolling the strip; drive the stage from it and stop writing to the strip so a
		// fling's momentum is not interrupted.
		stripDrivenUntil = performance.now() + STRIP_DRIVE_HOLD_MS;
		cancelAnimationFrame(stripSyncFrame);
		stripSyncFrame = requestAnimationFrame(syncWithStrip);
	}

	function syncWithStrip() {
		if (!galleryStage || !galleryStrip) return;
		const position = readingPosition(galleryStrip, stripThumbnails());
		if (position === undefined) return;
		activePhotoId = orderedPhotographs[Math.round(position)].id;
		const left = scrollForPosition(galleryStage, stageFrames(), position);
		if (left === undefined) return;
		stageEaser.stop();
		galleryStage.scrollLeft = left;
	}

	function setStripScroll(left: number) {
		if (!galleryStrip) return;
		galleryStrip.scrollLeft = left;
		lastStripWrite = galleryStrip.scrollLeft;
	}

	function stageFrames() {
		return orderedPhotographs.map((photo) => photoFrame(galleryStage, photo));
	}

	function stripThumbnails() {
		return orderedPhotographs.map((photo) => photoFrame(galleryStrip, photo));
	}

	function centerOf(rect: DOMRect) {
		return rect.left + rect.width / 2;
	}

	// Horizontal centers in viewport coordinates, made non-decreasing so two-row layouts, where
	// neighbours can overlap, still map in order.
	function frameCenters(frames: (HTMLElement | null | undefined)[]) {
		const centers: number[] = [];
		for (const frame of frames) {
			if (!frame) return;
			centers.push(Math.max(centerOf(frame.getBoundingClientRect()), centers.at(-1) ?? -Infinity));
		}
		return centers.length ? centers : undefined;
	}

	function readingPosition(container: HTMLElement, frames: (HTMLElement | null | undefined)[]) {
		const centers = frameCenters(frames);
		if (!centers) return;
		const rect = container.getBoundingClientRect();
		const range = container.scrollWidth - container.clientWidth;
		const point = rect.left + rect.width * (range > 0 ? container.scrollLeft / range : 0);
		if (point <= centers[0]) return 0;
		for (let index = 0; index < centers.length - 1; index++) {
			const span = centers[index + 1] - centers[index];
			if (point < centers[index + 1]) {
				return index + (span > 0 ? (point - centers[index]) / span : 1);
			}
		}
		return centers.length - 1;
	}

	// The scrollLeft at which the container's reading point lands on `position`. The reading point
	// sits at width * scrollLeft / range from the left edge, so solving scrollLeft + that offset =
	// target content x gives scrollLeft = x / (1 + width / range).
	function scrollForPosition(
		container: HTMLElement,
		frames: (HTMLElement | null | undefined)[],
		position: number
	) {
		const centers = frameCenters(frames);
		const range = container.scrollWidth - container.clientWidth;
		if (!centers || range <= 0) return;
		const index = Math.floor(position);
		const before = centers[index];
		const after = centers[Math.min(index + 1, centers.length - 1)];
		const rect = container.getBoundingClientRect();
		const target =
			container.scrollLeft + before + (after - before) * (position - index) - rect.left;
		return Math.min(Math.max(target / (1 + container.clientWidth / range), 0), range);
	}

	// Photographs that pass beneath the hint, left to right. With two rows that is the hint's row
	// (plus the header photograph spanning both), not the overall photograph order.
	function hintLane() {
		if (!galleryStage || !galleryHint) return [];
		const hintRect = galleryHint.getBoundingClientRect();
		const y = hintRect.top + hintRect.height / 2;
		return [...galleryStage.querySelectorAll<HTMLElement>('.photography-gallery-frame')]
			.map((frame) => frame.getBoundingClientRect())
			.filter((rect) => rect.top <= y && rect.bottom >= y)
			.sort((a, b) => a.left - b.left);
	}

	// Scroll positions bounding the hint's fade: it begins when the second photograph's trailing edge
	// reaches the hint's leading edge, so the fade plays over the third photograph, and ends once the
	// third photograph is completely in view (or the stage reaches its end).
	function hintFadeRange(stageRect: DOMRect) {
		const [, secondRect, thirdRect] = hintLane();
		if (!galleryStage || !galleryHint || !secondRect) return;
		const scrollLeft = galleryStage.scrollLeft;
		const maxScroll = galleryStage.scrollWidth - galleryStage.clientWidth;
		const end = Math.min(
			thirdRect ? scrollLeft + thirdRect.right - stageRect.right : maxScroll,
			maxScroll
		);
		const start = Math.min(
			scrollLeft + secondRect.right - galleryHint.getBoundingClientRect().left,
			end
		);
		return { start, end };
	}

	function updateHint(stageRect: DOMRect) {
		const range = hintFadeRange(stageRect);
		if (!range || !galleryStage) return;
		const scrollLeft = galleryStage.scrollLeft;
		if (scrollLeft >= range.end - 1) {
			hintOpacity = 0;
			nextPhotoShown = true;
			return;
		}
		const span = range.end - range.start;
		hintOpacity = span > 0 ? Math.min(Math.max((range.end - scrollLeft) / span, 0), 1) : 1;
	}
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<section class="photography-gallery" aria-labelledby="photography-heading" out:planeExit>
	<header class="photography-gallery-header">
		<h1 id="photography-heading">Photography (?)</h1>
	</header>
	<div bind:this={galleryStage} class="photography-gallery-stage" onscroll={handleStageScroll}>
		{#if unavailable}
			<p class="photography-gallery-empty" role="status">
				Photographs are unavailable right now. <button
					type="button"
					class="photography-retry"
					onclick={() => location.reload()}>Try again</button
				>
			</p>
		{:else if !orderedPhotographs.length}
			<p class="photography-gallery-empty">No photographs yet.</p>
		{/if}
		{#if orderedPhotographs.length}
			<div class="photography-gallery-track">
				{#if headerPhotograph}
					<div class="photography-gallery-cell">
						<PhotographyTile photograph={headerPhotograph} sizes="100vh" onOpen={openPhoto} />
					</div>
				{/if}
				<div class="photography-gallery-rows">
					{#each galleryRows as row, rowIndex (rowIndex)}
						<div class="photography-gallery-row">
							{#each row as { photograph, index } (photograph.id)}
								<div class="photography-gallery-cell" style:order={index + 1}>
									<PhotographyTile {photograph} sizes="50vh" onOpen={openPhoto} />
								</div>
							{/each}
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
	{#if orderedPhotographs.length > 1}
		<button
			type="button"
			bind:this={galleryHint}
			class="photography-gallery-hint"
			class:photography-gallery-hint-hidden={!stageOverflows || nextPhotoShown}
			style:opacity={hintOpacity}
			aria-label="Next photograph"
			onclick={showNextPhoto}
		>
			<span class="photography-gallery-hint-touch">swipe</span><span
				class="photography-gallery-hint-pointer">scroll</span
			> →
		</button>
		<nav
			bind:this={galleryStrip}
			class="photography-gallery-strip"
			aria-label="Photograph previews"
			onpointerenter={handleStripPointerEnter}
			onpointermove={handleStripPointerMove}
			onpointerleave={handleStripPointerLeave}
			onscroll={handleStripScroll}
		>
			{#each orderedPhotographs as photograph (photograph.id)}
				<button
					type="button"
					class="photography-gallery-thumbnail"
					class:photography-gallery-thumbnail-active={activePhotoId === photograph.id}
					data-photo-id={photograph.id}
					aria-label={`Show photograph: ${photograph.alt}`}
					aria-current={activePhotoId === photograph.id ? 'true' : undefined}
					onpointerenter={(event) => handleThumbnailPointerEnter(event, photograph)}
					onfocus={() => scrollToPhoto(photograph)}
					onclick={() => scrollToPhoto(photograph)}
				>
					<img
						src={photograph.thumbnailSrc ?? photograph.src}
						srcset={photograph.thumbnailSrcset}
						sizes="72px"
						alt=""
						width={photograph.width ?? 1280}
						height={photograph.height ?? 960}
						loading="lazy"
						decoding="async"
					/>
				</button>
			{/each}
		</nav>
	{/if}
</section>

<PhotographyPhotoViewer photograph={selectedPhoto} onClose={closePhoto} />
