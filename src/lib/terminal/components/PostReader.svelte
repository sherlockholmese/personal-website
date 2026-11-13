<script lang="ts">
	import { tick } from 'svelte';
	import {
		Button,
		Chevron,
		Heading,
		KeyValueList,
		KeyValueRow,
		Lightbox,
		Prose,
		TagList,
		Text,
		type LightboxImage
	} from '#lib/ui/index.ts';
	import type { BlogPost, MdBlock } from '../types';
	import { formatPostDate } from '../date';
	import { pointRatio } from '../geometry';
	import { prefersReducedMotion } from '../motion';
	import MarkdownBlocks from './MarkdownBlocks.svelte';

	type TocItem = {
		id: string;
		level: number;
		text: string;
	};

	let { post, blocks }: { post: BlogPost; blocks: MdBlock[] } = $props();
	let contentViewport = $state<HTMLDivElement>();
	let mobileTocOpen = $state(false);
	let zoomedImage = $state<LightboxImage>();
	let headingElements = $state<HTMLElement[]>([]);
	let headingOffsets = $state<number[]>([]);
	let scrollFrame: number | undefined;
	let toc = $derived<TocItem[]>([
		{ id: 'post-top', level: 1, text: post.title },
		...blocks
			.filter((block) => block.type === 'heading')
			.map((heading) => ({
				id: heading.id,
				level: heading.level,
				text: heading.text
			}))
	]);
	let activeHeading = $derived(toc[0]?.id ?? '');
	// The window title already names the post, so the bar only reports sections below it.
	let currentSection = $derived(
		activeHeading === toc[0]?.id ? '' : toc.find((item) => item.id === activeHeading)?.text
	);
	let tocToggle = $state<HTMLElement>();
	let tocNav = $state<HTMLElement>();

	function handleScroll() {
		if (scrollFrame !== undefined) return;

		scrollFrame = requestAnimationFrame(() => {
			scrollFrame = undefined;
			updateActiveHeading();
		});
	}

	function scrollToHeading(id: string) {
		const heading = contentViewport?.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
		if (heading && contentViewport) {
			const viewportTop = contentViewport.getBoundingClientRect().top;
			const headingTop = heading.getBoundingClientRect().top - viewportTop;
			const top = Math.max(0, contentViewport.scrollTop + headingTop - headingScrollOffset());
			contentViewport.scrollTo({ top });
		}
		mobileTocOpen = false;
	}

	function handleTocKeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape' || !mobileTocOpen) return;
		event.preventDefault();
		mobileTocOpen = false;
		tocToggle?.focus();
	}

	function headingScrollOffset() {
		if (!contentViewport) return 0;

		const scrollPaddingTop = getComputedStyle(contentViewport).scrollPaddingTop;
		return Number.parseFloat(scrollPaddingTop) || 0;
	}

	function tocDepth(level: number) {
		return Math.min(3, Math.max(0, level - 1));
	}
	$effect(() => {
		const viewport = contentViewport;
		const currentBlocks = blocks;
		if (!viewport) return;

		let cancelled = false;
		let resizeObserver: ResizeObserver | undefined;
		void tick().then(() => {
			if (cancelled || contentViewport !== viewport || blocks !== currentBlocks) return;
			headingElements = Array.from(viewport.querySelectorAll<HTMLElement>('[data-heading-id]'));
			updateHeadingOffsets();
			decorateMarkdownImages();
			updateActiveHeading();

			const content = viewport.querySelector<HTMLElement>('.post-content');
			if (content) {
				resizeObserver = new ResizeObserver(() => {
					updateHeadingOffsets();
					updateActiveHeading();
				});
				resizeObserver.observe(content);
			}
		});

		return () => {
			cancelled = true;
			resizeObserver?.disconnect();
		};
	});

	// Keep the current section in view when the contents list is taller than its rail.
	$effect(() => {
		const nav = tocNav;
		const id = activeHeading;
		// Opening the docked list also lands it on the current section.
		void mobileTocOpen;
		if (!nav) return;
		void tick().then(() => {
			if (nav.scrollHeight <= nav.clientHeight) return;
			const item = nav.querySelector<HTMLElement>(`[data-toc-id="${CSS.escape(id)}"]`);
			const margin = nav.clientHeight / 4;
			let top = nav.scrollTop;
			if (!item) top = 0;
			else if (item.offsetTop < nav.scrollTop + margin) top = item.offsetTop - margin;
			else if (item.offsetTop + item.offsetHeight > nav.scrollTop + nav.clientHeight - margin) {
				top = item.offsetTop + item.offsetHeight - nav.clientHeight + margin;
			}
			if (Math.abs(top - nav.scrollTop) >= 1) {
				nav.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
			}
		});
	});

	$effect(() => {
		return () => {
			if (scrollFrame !== undefined) {
				cancelAnimationFrame(scrollFrame);
			}
		};
	});

	$effect(() => {
		const viewport = contentViewport;
		if (!viewport) return;

		viewport.addEventListener('click', handleContentClick);
		viewport.addEventListener('keydown', handleContentKeydown);

		return () => {
			viewport.removeEventListener('click', handleContentClick);
			viewport.removeEventListener('keydown', handleContentKeydown);
		};
	});

	function updateActiveHeading() {
		if (!contentViewport) return;

		const targetOffset = contentViewport.scrollTop + headingScrollOffset() + 1;
		let low = 0;
		let high = headingOffsets.length - 1;
		let currentIndex = -1;

		while (low <= high) {
			const middle = Math.floor((low + high) / 2);
			if (headingOffsets[middle] <= targetOffset) {
				currentIndex = middle;
				low = middle + 1;
			} else {
				high = middle - 1;
			}
		}

		const nextHeading = headingElements[currentIndex]?.dataset.headingId ?? toc[0]?.id ?? '';

		if (nextHeading !== activeHeading) {
			activeHeading = nextHeading;
		}
	}

	function updateHeadingOffsets() {
		if (!contentViewport) return;

		const viewportTop = contentViewport.getBoundingClientRect().top;
		headingOffsets = headingElements.map(
			(heading) => contentViewport!.scrollTop + heading.getBoundingClientRect().top - viewportTop
		);
	}

	function decorateMarkdownImages() {
		if (!contentViewport || !blocks.length) return;

		const images = contentViewport.querySelectorAll<HTMLImageElement>('.ui-prose-body img');
		for (const image of images) {
			image.tabIndex = 0;
			image.setAttribute('role', 'button');
			image.setAttribute('aria-label', image.alt ? `Zoom image: ${image.alt}` : 'Zoom image');
		}
	}

	function imageFromTarget(target: EventTarget | null) {
		if (!(target instanceof Element)) return null;
		return target.closest<HTMLImageElement>('.ui-prose-body img');
	}

	function openImageZoom(image: HTMLImageElement, x = 0.5, y = 0.5) {
		zoomedImage = {
			src: image.currentSrc || image.src,
			alt: image.alt || 'Zoomed post image',
			origin: { x, y }
		};
	}

	function handleContentClick(event: MouseEvent) {
		const image = imageFromTarget(event.target);
		if (!image) return;

		event.preventDefault();
		const rect = image.getBoundingClientRect();
		const point = pointRatio(rect, event.clientX, event.clientY);
		openImageZoom(image, point.x, point.y);
	}

	function handleContentKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter' && event.key !== ' ') return;

		const image = imageFromTarget(event.target);
		if (!image) return;

		event.preventDefault();
		openImageZoom(image);
	}
</script>

<article class="post-reader">
	{#if toc.length > 1}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="post-toc-region" onkeydown={handleTocKeydown}>
			<div class="post-toc-dock">
				<div class="post-toc-bar">
					<Button
						bind:ref={tocToggle}
						size="sm"
						block
						align="start"
						aria-expanded={mobileTocOpen}
						aria-controls="post-toc"
						onclick={() => (mobileTocOpen = !mobileTocOpen)}
					>
						<span class="post-toc-toggle-label">contents</span>
						{#if currentSection}
							<span class="post-toc-current">{currentSection}</span>
						{/if}
						<Chevron class="post-toc-chevron" open={!mobileTocOpen} />
					</Button>
				</div>

				<!-- The window title and the post's heading already name the post, so the list starts at
				its first section. -->
				<nav
					bind:this={tocNav}
					id="post-toc"
					class:post-toc-open={mobileTocOpen}
					class="post-toc ui-scroll"
					aria-label="Contents"
				>
					{#each toc.slice(1) as heading (heading.id)}
						<button
							type="button"
							class={`post-toc-item post-toc-depth-${tocDepth(heading.level)}`}
							data-toc-id={heading.id}
							aria-current={heading.id === activeHeading ? 'location' : undefined}
							onclick={() => scrollToHeading(heading.id)}
						>
							{heading.text}
						</button>
					{/each}
				</nav>
			</div>
		</div>
	{/if}

	<div
		bind:this={contentViewport}
		class="post-content-viewport ui-scroll"
		role="region"
		aria-label="post content"
		onscroll={handleScroll}
		onpointerdown={() => (mobileTocOpen = false)}
	>
		<div class="post-content">
			<header class="post-header">
				<Heading level={1} id="post-top" data-heading-id="post-top">{post.title}</Heading>
				{#if post.description}
					<Text class="post-description" tone="muted">{post.description}</Text>
				{/if}
				<KeyValueList class="post-meta" muted>
					<KeyValueRow label="date">{formatPostDate(post.date)}</KeyValueRow>
					<KeyValueRow label="tags"><TagList tags={post.tags} /></KeyValueRow>
				</KeyValueList>
			</header>
			<Prose>
				<MarkdownBlocks {blocks} />
			</Prose>
		</div>
	</div>

	<Lightbox
		image={zoomedImage}
		label="Zoomed image"
		closeLabel="Close zoomed image"
		onClose={() => (zoomedImage = undefined)}
	/>
</article>

<style>
	.post-reader {
		--content-inline-padding: var(--space-4);
		--ui-anchor-offset: var(--space-6);
		position: relative;
		display: flex;
		height: 100%;
		min-height: 0;
		flex: 1;
		flex-direction: column;
		overflow: hidden;
	}

	.post-content {
		padding-top: var(--space-4);
	}

	.post-toc-region,
	.post-toc-dock {
		display: contents;
	}

	.post-toc-bar {
		display: none;
	}

	.post-toc-toggle-label {
		flex: none;
	}

	.post-toc-current {
		min-width: 0;
		overflow: hidden;
		color: var(--text-muted);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.post-toc-bar :global(.post-toc-chevron) {
		margin-inline-start: auto;
	}

	/*
	 * A rail in the left margin, centered vertically in the reader. Sections are told apart by
	 * indent and tone in one type size; a continuous guide line marks the current one in accent.
	 * The rail's font size matches the article's, so its `ch` offsets line up with the text column.
	 */
	.post-toc {
		--post-toc-width: 240px;
		--post-toc-gap: var(--space-8);
		position: absolute;
		top: 50%;
		left: max(
			var(--space-4),
			calc(50% - var(--measure) / 2 - var(--post-toc-gap) - var(--post-toc-width))
		);
		z-index: var(--layer-raised);
		width: var(--post-toc-width);
		max-height: calc(100% - 2 * var(--space-4));
		overflow: auto;
		font-size: var(--text-reading);
		overscroll-behavior: contain;
		transform: translateY(-50%);
	}

	.post-toc-item {
		display: block;
		width: 100%;
		min-height: var(--target-min);
		padding: var(--space-1) var(--space-2) var(--space-1) var(--space-3);
		border-left: 1px solid var(--border);
		background: transparent;
		color: var(--text-muted);
		font-size: var(--text-caption);
		line-height: 1.45;
		text-align: left;
	}

	.post-toc-depth-0 {
		color: var(--text);
	}

	.post-toc-depth-2 {
		padding-left: var(--space-6);
	}

	.post-toc-depth-3 {
		padding-left: var(--space-8);
	}

	/* A depth-0 section after a subsection starts a new group. */
	.post-toc-item:not(.post-toc-depth-0) + .post-toc-depth-0 {
		margin-top: var(--space-2);
	}

	@media (hover: hover) {
		.post-toc-item:hover {
			color: var(--text);
		}
	}

	.post-toc-item:active {
		color: var(--accent-hover);
	}

	/* Two pixels wide, overlapping the guide so the column does not shift. */
	.post-toc-item[aria-current='location'] {
		margin-left: -1px;
		border-left: 2px solid var(--accent);
		color: var(--accent);
	}

	@media (prefers-reduced-motion: no-preference) {
		.post-toc-item {
			transition:
				color var(--motion-fast) var(--ease-standard),
				border-color var(--motion-fast) var(--ease-standard);
		}

		.post-toc-item:active {
			transition: none;
		}
	}

	/* Without room for the rail, contents joins the bottom dock, where mobile controls live. */
	@media (max-width: 1400px) {
		.post-toc-region {
			z-index: var(--layer-sticky);
			display: block;
			flex: none;
			order: 1;
			padding: var(--space-2) var(--content-inline-padding)
				max(var(--space-2), env(safe-area-inset-bottom));
			border-top: 1px solid var(--border);
			background: var(--surface);
			font-size: var(--text-reading);
		}

		.post-toc-dock {
			position: relative;
			display: block;
			max-width: var(--measure);
			margin-inline: auto;
		}

		.post-toc-bar {
			display: block;
		}

		.post-toc {
			display: none;
		}

		.post-toc.post-toc-open {
			top: auto;
			right: 0;
			bottom: calc(100% + var(--space-2) + 1px);
			left: 0;
			display: block;
			width: auto;
			max-height: 50vh;
			padding: var(--space-2) var(--space-2) var(--space-2) var(--space-3);
			border: 1px solid var(--border-control);
			border-bottom: 0;
			background: var(--surface-floating);
			box-shadow: var(--shadow-floating);
			transform: none;
		}

		/* The docked list is a touch target list; it reads at body size. */
		.post-toc-item {
			font-size: var(--text-body);
		}

		.post-content {
			/* Clears the close button that overhangs the window border. */
			padding-top: calc(var(--control-close) / 2 + var(--space-2));
		}

		@media (prefers-reduced-motion: no-preference) {
			.post-toc.post-toc-open {
				animation: motion-rise var(--motion-fast) var(--ease-enter);
			}
		}
	}

	.post-content-viewport {
		width: 100%;
		min-width: 0;
		min-height: 0;
		flex: 1;
		overflow: auto;
		padding-bottom: var(--space-8);
		scroll-padding-top: var(--ui-anchor-offset);
	}

	.post-content {
		width: 100%;
		min-width: 0;
		max-width: calc(var(--measure) + 2 * var(--content-inline-padding));
		margin-inline: auto;
		padding-inline: var(--content-inline-padding);
		padding-bottom: var(--space-8);
		font-size: var(--text-reading);
	}

	.post-content :global(.ui-prose-body :where(h1, h2, h3)) {
		scroll-margin-top: var(--ui-anchor-offset);
	}

	.post-header :global(.post-description) {
		font-size: inherit;
	}

	.post-header :global(.post-meta) {
		margin-bottom: var(--space-4);
		font-size: inherit;
	}

	@media (max-width: 760px) {
		.post-reader {
			--content-inline-padding: var(--space-2);
			--ui-anchor-offset: var(--space-4);
		}

		.post-content {
			padding-bottom: var(--space-8);
		}
	}

	@media (prefers-reduced-motion: no-preference) {
		.post-reader {
			animation: motion-rise var(--motion-normal) var(--ease-enter);
		}
	}
</style>
