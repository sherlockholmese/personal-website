<script lang="ts">
	import { tick } from 'svelte';
	import { Panel, Prose, Select, TagList, TextField, EmptyState } from '#lib/ui/index.ts';
	import { blogSortOptions, type BlogPostMeta, type BlogSort, type MdBlock } from '../types';
	import { formatPostDate } from '../date';
	import { shouldHandleFuzzyPickerKeydown } from '../fuzzy-picker';
	import { isMobileViewport } from '../media';
	import MarkdownBlocks from './MarkdownBlocks.svelte';

	let {
		posts,
		results,
		selectedIndex,
		selectedPost,
		previewBlocks,
		sort,
		query = $bindable(''),
		inputRef = $bindable<HTMLInputElement | undefined>(),
		onQueryInput,
		onKeydown,
		onSortChange,
		onSelect,
		onOpen,
		onClose
	}: {
		posts: BlogPostMeta[];
		results: BlogPostMeta[];
		selectedIndex: number;
		selectedPost: BlogPostMeta;
		previewBlocks: MdBlock[];
		sort: BlogSort;
		query?: string;
		inputRef?: HTMLInputElement;
		onQueryInput: () => void;
		onKeydown: (event: KeyboardEvent) => void;
		onSortChange: (sort: BlogSort) => void;
		onSelect: (index: number) => void;
		onOpen: (index: number) => void;
		onClose: () => void;
	} = $props();

	let resultsViewport = $state<HTMLDivElement>();
	let canScrollUp = $state(false);
	let canScrollDown = $state(false);

	$effect(() => {
		const viewport = resultsViewport;
		const selectedPath = results[selectedIndex]?.path;
		void scrollSelectedResultIntoView(viewport, selectedPath);
	});

	$effect(() => {
		const viewport = resultsViewport;
		if (!viewport) return;

		const resizeObserver = new ResizeObserver(updateScrollIndicators);
		resizeObserver.observe(viewport);
		void tick().then(updateScrollIndicators);

		return () => resizeObserver.disconnect();
	});

	function updateScrollIndicators() {
		const viewport = resultsViewport;
		if (!viewport || !results.length) {
			canScrollUp = false;
			canScrollDown = false;
			return;
		}

		const threshold = 2;
		canScrollUp = viewport.scrollTop > threshold;
		canScrollDown = viewport.scrollTop + viewport.clientHeight < viewport.scrollHeight - threshold;
	}

	async function scrollSelectedResultIntoView(viewport = resultsViewport, selectedPath?: string) {
		if (!viewport || !selectedPath) {
			updateScrollIndicators();
			return;
		}

		await tick();
		const selectedRow = viewport.querySelector<HTMLElement>('.blog-browser-row-selected');
		const header = viewport.querySelector<HTMLElement>('.blog-browser-results-header');
		if (!selectedRow) return;

		const viewportRect = viewport.getBoundingClientRect();
		const rowRect = selectedRow.getBoundingClientRect();
		const topLimit = viewportRect.top + (header?.offsetHeight ?? 0) + 14;
		const bottomLimit = viewportRect.bottom - 30;

		if (rowRect.top < topLimit) {
			viewport.scrollTop -= topLimit - rowRect.top;
		} else if (rowRect.bottom > bottomLimit) {
			viewport.scrollTop += rowRect.bottom - bottomLimit;
		}

		updateScrollIndicators();
	}

	function handleResultClick(index: number) {
		onSelect(index);
		if (isMobileViewport()) {
			onOpen(index);
		}
	}

	function handleWindowKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			if (!event.defaultPrevented) {
				onKeydown(event);
			}
			return;
		}

		if (shouldHandleFuzzyPickerKeydown(event, inputRef)) {
			onKeydown(event);
		}
	}
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<Panel
	class="blog-browser"
	variant="boxed"
	fill
	title="~/blog"
	meta={`${results.length}/${posts.length} posts`}
	closeLabel="close blog browser"
	{onClose}
>
	<div class="blog-browser-toolbar">
		<TextField
			bind:ref={inputRef}
			bind:value={query}
			label="query"
			aria-label="search blog posts"
			placeholder="type to filter posts"
			autocomplete="off"
			autocorrect="off"
			enterkeyhint="search"
			oninput={onQueryInput}
		/>
		<Select label="sort" value={sort} options={blogSortOptions} onChange={onSortChange} />
	</div>
	<div class="blog-browser-grid">
		<div class="blog-browser-results-shell">
			{#if results.length}
				<div class="blog-browser-results-header" aria-hidden="true">
					<span>title</span>
					<span>date</span>
					<span>tags</span>
					<span>path</span>
				</div>
			{/if}
			<div
				bind:this={resultsViewport}
				class="blog-browser-results ui-scroll"
				style="counter-reset: post-row"
				onscroll={updateScrollIndicators}
			>
				{#if results.length}
					{#each results as post, index (post.path)}
						<button
							type="button"
							class="blog-browser-row"
							class:blog-browser-row-selected={index === selectedIndex}
							aria-current={index === selectedIndex ? 'true' : undefined}
							style="counter-increment: post-row"
							onclick={() => handleResultClick(index)}
							ondblclick={() => onOpen(index)}
						>
							<span class="blog-browser-title">{post.title}</span>
							<span class="blog-browser-date">{formatPostDate(post.date)}</span>
							<TagList class="blog-browser-tags" tags={post.tags} />
							<span class="blog-browser-path">{post.path}</span>
						</button>
					{/each}
				{:else}
					<EmptyState message="no matching posts" />
				{/if}
			</div>
			{#if canScrollUp}
				<div class="blog-browser-scroll-hint blog-browser-scroll-hint-top" aria-hidden="true">
					more above ↑
				</div>
			{/if}
			{#if canScrollDown}
				<div class="blog-browser-scroll-hint blog-browser-scroll-hint-bottom" aria-hidden="true">
					more posts below ↓
				</div>
			{/if}
		</div>
		<div class="blog-browser-preview">
			{#if results.length}
				<div class="blog-browser-preview-header">
					<span>preview</span>
					<span>cat {selectedPost.path}</span>
				</div>
				<Prose variant="preview" class="ui-scroll">
					<h1>{selectedPost.title}</h1>
					{#if selectedPost.description}
						<p class="blog-browser-preview-muted">{selectedPost.description}</p>
					{/if}
					<p class="blog-browser-preview-muted blog-browser-preview-meta">
						{formatPostDate(selectedPost.date)}
						<TagList tags={selectedPost.tags} />
					</p>
					{#if previewBlocks.length}
						<MarkdownBlocks blocks={previewBlocks} compactCode />
					{/if}
				</Prose>
			{:else}
				<EmptyState message="adjust query or clear it to see posts" />
			{/if}
		</div>
	</div>
</Panel>

<style>
	:global(.ui-panel.blog-browser) {
		--blog-browser-columns: minmax(0, 1.6fr) 10ch minmax(0, 1fr) minmax(0, 1.15fr);
	}

	.blog-browser-toolbar {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: var(--space-3);
		padding: var(--space-1) var(--ui-panel-inset);
		border-bottom: 1px solid var(--border);
	}

	.blog-browser-grid {
		display: grid;
		height: 380px;
		min-height: 220px;
		grid-template-columns: minmax(360px, 1fr) minmax(220px, 0.55fr);
	}

	.blog-browser-results-shell {
		position: relative;
		display: flex;
		min-width: 0;
		min-height: 0;
		flex-direction: column;
		border-right: 1px solid var(--border);
	}

	.blog-browser-results {
		min-width: 0;
		min-height: 0;
		flex: 1;
		padding: var(--space-1);
		overflow: auto;
		scroll-padding-block: var(--space-3) var(--space-6);
	}

	.blog-browser-results-header {
		z-index: var(--layer-sticky);
		display: grid;
		flex: none;
		grid-template-columns: var(--blog-browser-columns);
		gap: var(--space-3);
		padding: var(--space-1) var(--space-3);
		border-bottom: 1px solid var(--border);
		background: var(--surface);
		color: var(--accent);
		font-weight: 700;
	}

	.blog-browser-row {
		display: grid;
		width: 100%;
		grid-template-columns: var(--blog-browser-columns);
		align-items: start;
		gap: var(--space-3);
		padding: var(--space-1) var(--space-2);
		background: transparent;
		color: var(--text);
		text-align: left;
		scroll-margin-block: var(--space-3) var(--space-6);
	}

	.blog-browser-row:hover {
		background: var(--surface-raised);
	}

	.blog-browser-row:active {
		background: var(--control-hover);
	}

	.blog-browser-row-selected,
	.blog-browser-row-selected:hover,
	.blog-browser-row-selected:active {
		background: var(--accent);
		color: var(--on-accent);
	}

	.blog-browser-title,
	.blog-browser-path {
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.blog-browser-date {
		min-width: 0;
		opacity: 0.85;
	}

	.blog-browser-row :global(.blog-browser-tags) {
		opacity: 0.8;
	}

	.blog-browser-path {
		opacity: 0.7;
	}

	.blog-browser-scroll-hint {
		position: absolute;
		right: var(--space-2);
		z-index: var(--layer-raised);
		padding: var(--space-half) var(--space-1);
		border: 1px solid var(--border);
		background: color-mix(in srgb, var(--surface) 92%, transparent);
		color: var(--accent);
		pointer-events: none;
	}

	.blog-browser-scroll-hint-top {
		top: 36px;
	}

	.blog-browser-scroll-hint-bottom {
		bottom: var(--space-2);
	}

	.blog-browser-preview {
		display: flex;
		min-width: 0;
		min-height: 0;
		flex-direction: column;
		padding: var(--space-1) var(--space-2);
		overflow: hidden;
	}

	.blog-browser-preview-header {
		display: flex;
		justify-content: space-between;
		gap: var(--space-3);
		margin-bottom: var(--space-1);
		color: var(--text-muted);
	}

	.blog-browser-preview-muted {
		color: var(--text-muted);
	}

	.blog-browser-preview-meta {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-half) var(--space-2);
	}

	@media (max-width: 760px) {
		:global(.ui-panel.blog-browser) {
			position: absolute;
			inset: 0;
			z-index: var(--layer-panel);
			margin: 0;
			padding-top: var(--space-4);
			border: 0;
		}

		.blog-browser-toolbar {
			grid-template-columns: minmax(0, 1fr);
			gap: var(--space-2);
			padding-block: var(--space-2);
		}

		.blog-browser-grid {
			height: auto;
			min-height: 0;
			flex: 1;
			grid-template-columns: minmax(0, 1fr);
		}

		.blog-browser-results-shell {
			flex: 1 1 auto;
			overflow: hidden;
			border-right: 0;
		}

		.blog-browser-results {
			height: 100%;
		}

		.blog-browser-results-header,
		.blog-browser-preview {
			display: none;
		}

		.blog-browser-row {
			min-height: 96px;
			grid-template-columns: minmax(0, 1fr);
			gap: var(--space-half);
			padding: var(--space-3) var(--space-2);
			border-bottom: 1px solid var(--border);
		}

		.blog-browser-row::before {
			display: block;
			color: var(--text-muted);
			content: counter(post-row, decimal-leading-zero);
		}

		.blog-browser-row > * {
			pointer-events: none;
		}

		.blog-browser-row-selected,
		.blog-browser-row-selected:hover,
		.blog-browser-row-selected:active {
			background: transparent;
			color: var(--text);
		}

		.blog-browser-title {
			font-weight: 700;
		}

		.blog-browser-path::before {
			content: 'cat ';
		}

		.blog-browser-scroll-hint-top {
			top: var(--space-2);
		}
	}

	@media (prefers-reduced-motion: no-preference) {
		:global(.ui-panel.blog-browser) {
			animation: motion-rise var(--motion-normal) var(--ease-enter);
		}
	}
</style>
