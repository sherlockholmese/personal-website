<script lang="ts">
	import { findPhotograph, type Photograph } from '#lib/photography.ts';
	import { Button, EmptyState, Heading, revealImage } from '#lib/ui/index.ts';
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
	let galleryTrack = $state<HTMLDivElement>();
	let galleryStrip = $state<HTMLElement>();
	let activePhotoId = $state('');
	// Shown until the next photograph is completely in view, and only when the stage overflows.
	let stageOverflows = $state(false);
	let nextPhotoShown = $state(false);
	// Fades with scroll progress toward revealing the next photograph.
	let hintOpacity = $state(1);
	let galleryHint = $state<HTMLElement>();
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

	/**
	 * Photograph positions along a scroller, in scroll-content pixels so they hold at any scroll
	 * position. Measured once per layout change; scrolling then needs no DOM reads.
	 */
	type Track = {
		starts: number[];
		ends: number[];
		/** Made non-decreasing so two-row layouts, where neighbours overlap, still map in order. */
		centers: number[];
		width: number;
		range: number;
	};

	let stageTrack: Track | undefined;
	let stripTrack: Track | undefined;
	/** Scroll positions over which the hint fades out. */
	let hintRange: { start: number; end: number } | undefined;

	// Measure whenever the stage, its photographs, or the strip change size, including the first
	// layout. Recreated when the photographs change so new elements are measured.
	$effect(() => {
		const elements = [galleryStage, galleryTrack, galleryStrip].filter((element) => !!element);
		if (!elements.length || !orderedPhotographs.length) return;
		const observer = new ResizeObserver(measure);
		for (const element of elements) observer.observe(element);
		return () => {
			observer.disconnect();
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

	function measure() {
		if (!galleryStage) return;
		const stageRect = galleryStage.getBoundingClientRect();
		const frames = itemRects(galleryStage, '.photography-gallery-frame');
		stageTrack = measureTrack(galleryStage, stageRect, frames);
		hintRange = measureHint(stageRect, frames);
		stripTrack =
			galleryStrip &&
			measureTrack(
				galleryStrip,
				galleryStrip.getBoundingClientRect(),
				itemRects(galleryStrip, '.photography-gallery-thumbnail')
			);
		stageOverflows = !!stageTrack && stageTrack.range > 0;
		syncWithStage();
	}

	function itemRects(container: HTMLElement, selector: string) {
		return new Map(
			[...container.querySelectorAll<HTMLElement>(selector)].map((element) => [
				element.dataset.photoId ?? '',
				element.getBoundingClientRect()
			])
		);
	}

	function measureTrack(
		container: HTMLElement,
		rect: DOMRect,
		items: Map<string, DOMRect>
	): Track | undefined {
		const origin = rect.left - container.scrollLeft;
		const track: Track = {
			starts: [],
			ends: [],
			centers: [],
			width: container.clientWidth,
			range: container.scrollWidth - container.clientWidth
		};
		for (const photograph of orderedPhotographs) {
			const item = items.get(photograph.id);
			if (!item) return;
			track.starts.push(item.left - origin);
			track.ends.push(item.right - origin);
			track.centers.push(
				Math.max(item.left + item.width / 2 - origin, track.centers.at(-1) ?? -Infinity)
			);
		}
		return track.centers.length ? track : undefined;
	}

	// The hint fades over the photographs passing beneath it: from when the second one's trailing
	// edge reaches the hint until the third is completely in view (or the stage reaches its end).
	// With two rows those are the hint's row, plus the header photograph spanning both.
	function measureHint(stageRect: DOMRect, frames: Map<string, DOMRect>) {
		if (!galleryStage || !galleryHint) return;
		const hintRect = galleryHint.getBoundingClientRect();
		const y = hintRect.top + hintRect.height / 2;
		const [, second, third] = [...frames.values()]
			.filter((rect) => rect.top <= y && rect.bottom >= y)
			.sort((a, b) => a.left - b.left);
		if (!second) return;
		const origin = stageRect.left - galleryStage.scrollLeft;
		const maxScroll = galleryStage.scrollWidth - galleryStage.clientWidth;
		const end = Math.min(third ? third.right - origin - stageRect.width : maxScroll, maxScroll);
		const start = Math.min(second.right - origin - (hintRect.left - stageRect.left), end);
		return { start, end };
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

	function scrollToPhoto(photograph: Photograph) {
		const index = orderedPhotographs.indexOf(photograph);
		if (!galleryStage || !stageTrack || index < 0) return;
		activePhotoId = photograph.id;
		const center = (stageTrack.starts[index] + stageTrack.ends[index]) / 2;
		stageEaser.to(galleryStage, center - stageTrack.width / 2);
	}

	// Glide on until the third photograph under the hint is completely in view, so the hint's
	// scroll-synced fade plays out during the glide.
	function showNextPhoto() {
		if (galleryStage && hintRange) stageEaser.to(galleryStage, hintRange.end + 1);
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
		if (!galleryStrip || !stripPointer || !stripTrack) return;
		const seconds = frameSeconds(time, edgeFrameTime);
		edgeFrameTime = time;
		const rect = galleryStrip.getBoundingClientRect();
		const targetSpeed = edgeSpeed(rect, stripPointer.x);
		edgeVelocity +=
			(targetSpeed - edgeVelocity) * (1 - Math.exp(-STRIP_ACCELERATION_RATE * seconds));
		if (!targetSpeed && Math.abs(edgeVelocity) < 4) {
			edgeVelocity = 0;
			return;
		}

		edgePosition = Math.min(Math.max(edgePosition + edgeVelocity * seconds, 0), stripTrack.range);
		setStripScroll(edgePosition);
		if (edgePosition === 0 || edgePosition === stripTrack.range) edgeVelocity = 0;

		// The thumbnail now under the pointer, from measured positions rather than hit testing.
		const x = lastStripWrite + stripPointer.x - rect.left;
		const index = stripTrack.starts.findIndex(
			(start, i) => x >= start && x <= (stripTrack?.ends[i] ?? start)
		);
		if (index >= 0) hoverStripPhoto(orderedPhotographs[index]);
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
		if (!galleryStage || !stageTrack) return;
		const stageLeft = galleryStage.scrollLeft;
		if (!nextPhotoShown) updateHint(stageLeft);
		const position = readingPosition(stageTrack, stageLeft);
		activePhotoId = orderedPhotographs[Math.round(position)].id;
		if (!stripTrack || stripHovered || performance.now() < stripDrivenUntil) return;
		const left = scrollForPosition(stripTrack, position);
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
		if (!galleryStage || !galleryStrip || !stageTrack || !stripTrack) return;
		const position = readingPosition(stripTrack, galleryStrip.scrollLeft);
		activePhotoId = orderedPhotographs[Math.round(position)].id;
		const left = scrollForPosition(stageTrack, position);
		if (left === undefined) return;
		stageEaser.stop();
		galleryStage.scrollLeft = left;
	}

	function setStripScroll(left: number) {
		if (!galleryStrip) return;
		galleryStrip.scrollLeft = left;
		lastStripWrite = galleryStrip.scrollLeft;
	}

	function readingPosition({ centers, width, range }: Track, scrollLeft: number) {
		const point = scrollLeft + width * (range > 0 ? scrollLeft / range : 0);
		if (point <= centers[0]) return 0;
		for (let index = 0; index < centers.length - 1; index++) {
			const span = centers[index + 1] - centers[index];
			if (point < centers[index + 1]) {
				return index + (span > 0 ? (point - centers[index]) / span : 1);
			}
		}
		return centers.length - 1;
	}

	// The scrollLeft at which the reading point lands on `position`. The reading point sits at
	// width * scrollLeft / range past scrollLeft, so solving scrollLeft + that offset = target x gives
	// scrollLeft = x / (1 + width / range).
	function scrollForPosition({ centers, width, range }: Track, position: number) {
		if (range <= 0) return;
		const index = Math.floor(position);
		const before = centers[index];
		const after = centers[Math.min(index + 1, centers.length - 1)];
		const target = before + (after - before) * (position - index);
		return Math.min(Math.max(target / (1 + width / range), 0), range);
	}

	function updateHint(scrollLeft: number) {
		if (!hintRange) return;
		if (scrollLeft >= hintRange.end - 1) {
			hintOpacity = 0;
			nextPhotoShown = true;
			return;
		}
		const span = hintRange.end - hintRange.start;
		hintOpacity = span > 0 ? Math.min(Math.max((hintRange.end - scrollLeft) / span, 0), 1) : 1;
	}
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<section class="photography-gallery" aria-labelledby="photography-heading" out:planeExit>
	<header class="photography-gallery-header">
		<Heading level={1} id="photography-heading">Photography (?)</Heading>
	</header>
	<div bind:this={galleryStage} class="photography-gallery-stage" onscroll={handleStageScroll}>
		{#if unavailable}
			<EmptyState message="Photographs are unavailable right now." align="center">
				{#snippet actions()}
					<Button variant="ghost" onclick={() => location.reload()}>Try again</Button>
				{/snippet}
			</EmptyState>
		{:else if !orderedPhotographs.length}
			<EmptyState message="No photographs yet." align="center" />
		{/if}
		{#if orderedPhotographs.length}
			<div bind:this={galleryTrack} class="photography-gallery-track">
				{#if headerPhotograph}
					<div class="photography-gallery-cell">
						<PhotographyTile
							photograph={headerPhotograph}
							height="100vh"
							priority
							onOpen={openPhoto}
						/>
					</div>
				{/if}
				<div class="photography-gallery-rows">
					{#each galleryRows as row, rowIndex (rowIndex)}
						<div class="photography-gallery-row">
							{#each row as { photograph, index } (photograph.id)}
								<div class="photography-gallery-cell" style:order={index + 1}>
									<PhotographyTile
										{photograph}
										height="100vh"
										mobileHeight="50vh"
										priority={!headerPhotograph && index === 0}
										onOpen={openPhoto}
									/>
								</div>
							{/each}
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
	{#if orderedPhotographs.length > 1}
		<Button
			bind:ref={galleryHint}
			variant="overlay"
			size="sm"
			class={[
				'photography-gallery-hint',
				(!stageOverflows || nextPhotoShown) && 'photography-gallery-hint-hidden'
			]
				.filter(Boolean)
				.join(' ')}
			style={`opacity: ${hintOpacity}`}
			aria-label="Next photograph"
			onclick={showNextPhoto}
		>
			<span class="photography-gallery-hint-touch">swipe</span><span
				class="photography-gallery-hint-pointer">scroll</span
			> →
		</Button>
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
						data-reveal
						{@attach revealImage(photograph.thumbnailSrc ?? photograph.src)}
					/>
				</button>
			{/each}
		</nav>
	{/if}
</section>

<PhotographyPhotoViewer photograph={selectedPhoto} onClose={closePhoto} />

<style>
	/* A fixed header, a horizontal stage of photographs, and a preview strip that scrubs it. */
	.photography-gallery {
		--content-inline-padding: var(--space-4);
		--photography-gap: var(--space-4);
		--photography-stage-bottom: var(--space-4);
		/* The stage clips vertically, so it must hold the outline drawn outside each photograph. */
		--photography-ring-room: calc(var(--focus-width) + var(--focus-offset));
		--photography-header-gap: var(--space-4);
		position: absolute;
		inset: 0;
		z-index: var(--layer-panel);
		display: grid;
		min-height: 0;
		grid-template-rows: auto minmax(0, 1fr) auto;
		overflow: hidden;
		background: var(--surface);
	}

	.photography-gallery-header {
		grid-row-start: 1;
		/* Align the title with the photo edges rather than the padded box. */
		width: calc(100% - 2 * var(--content-inline-padding));
		margin: 0 auto calc(var(--photography-header-gap) - var(--photography-ring-room));
		padding-top: var(--space-4);
		flex: none;
	}

	.photography-gallery-header :global(.ui-heading) {
		margin: 0;
	}

	.photography-gallery-stage {
		grid-row-start: 2;
		grid-column-start: 1;
		min-height: 0;
		padding-top: var(--photography-ring-room);
		padding-bottom: var(--photography-stage-bottom);
		overflow: auto hidden;
		container: photography-stage / size;
		overscroll-behavior-x: contain;
		scrollbar-width: none;
	}

	.photography-gallery-track {
		display: flex;
		width: max-content;
		height: 100%;
		gap: var(--photography-gap);
		padding-inline: var(--content-inline-padding);
	}

	/* One row by default: rows flatten and cells keep their order through flex order. */
	.photography-gallery-rows,
	.photography-gallery-row {
		display: contents;
	}

	/* Explicit stage-relative heights keep each photograph's intrinsic width correct. */
	.photography-gallery-cell {
		height: 100cqh;
		flex: none;
	}

	/* Two continuous rows on tall narrow stages; the header photograph spans both. */
	@media (max-width: 760px) {
		@container photography-stage (min-height: 480px) {
			.photography-gallery-rows {
				display: flex;
				flex-direction: column;
				gap: var(--photography-gap);
			}

			.photography-gallery-row {
				display: flex;
				gap: var(--photography-gap);
			}

			.photography-gallery-row .photography-gallery-cell {
				height: calc((100cqh - var(--photography-gap)) / 2);
			}
		}
	}

	/* Overlays the stage's bottom-right corner, sharing its grid cell rather than scrolling with it. */
	:global(.ui-button.photography-gallery-hint) {
		grid-row-start: 2;
		grid-column-start: 1;
		align-self: end;
		justify-self: end;
		margin: 0 calc(var(--content-inline-padding) + var(--space-2))
			calc(var(--photography-stage-bottom) + var(--space-2)) 0;
	}

	/* Opacity follows scroll progress inline; once hidden the hint also leaves the tab order. */
	:global(.ui-button.photography-gallery-hint-hidden) {
		visibility: hidden;
		pointer-events: none;
	}

	.photography-gallery-hint-touch {
		display: none;
	}

	@media (pointer: coarse) {
		.photography-gallery-hint-touch {
			display: inline;
		}

		.photography-gallery-hint-pointer {
			display: none;
		}
	}

	.photography-gallery-strip {
		display: flex;
		flex: none;
		grid-row-start: 3;
		gap: var(--space-2);
		padding: var(--space-2) var(--content-inline-padding)
			max(var(--space-2), env(safe-area-inset-bottom));
		overflow: auto hidden;
		border-top: 1px solid var(--border);
		scrollbar-width: none;
	}

	.photography-gallery-thumbnail {
		display: block;
		height: 48px;
		flex: none;
		padding: 0;
		border: 0;
		background: var(--surface-raised);
		opacity: 0.5;
		outline: 1px solid transparent;
		outline-offset: var(--focus-offset);
	}

	.photography-gallery-thumbnail:hover,
	.photography-gallery-thumbnail:focus-visible,
	.photography-gallery-thumbnail-active {
		opacity: 1;
	}

	.photography-gallery-thumbnail-active {
		outline-color: var(--accent);
	}

	.photography-gallery-thumbnail:focus-visible {
		outline: var(--focus-width) solid var(--focus);
	}

	.photography-gallery-thumbnail img {
		display: block;
		width: auto;
		height: 100%;
		aspect-ratio: 1;
		object-fit: cover;
	}

	@media (max-width: 760px) {
		.photography-gallery {
			--content-inline-padding: var(--space-2);
			--photography-gap: var(--space-2);
			--photography-stage-bottom: var(--space-3);
			--photography-header-gap: var(--space-3);
		}

		.photography-gallery-header {
			padding-top: var(--space-3);
		}
	}

	@media (prefers-reduced-motion: no-preference) {
		.photography-gallery {
			animation: motion-rise var(--motion-normal) var(--ease-enter);
		}

		.photography-gallery-thumbnail {
			transition:
				outline-color var(--motion-fast) var(--ease-standard),
				opacity var(--motion-fast) var(--ease-standard);
		}
	}
</style>
