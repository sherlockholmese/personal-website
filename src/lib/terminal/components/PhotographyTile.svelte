<script lang="ts">
	import { revealImage } from '#lib/ui/index.ts';
	import type { Photograph } from '../../../content/photography';

	let {
		photograph,
		height,
		mobileHeight,
		priority = false,
		onOpen
	}: {
		photograph: Photograph;
		/** The tile's rendered height as a CSS length; `srcset` widths follow from it. */
		height: string;
		/** The rendered height at the 760px mobile breakpoint, when it differs. */
		mobileHeight?: string;
		/** Load immediately and ahead of other images, for the first photograph in view. */
		priority?: boolean;
		onOpen: (photograph: Photograph) => void;
	} = $props();

	let failedSource = $state('');
	let source = $derived(photograph.thumbnailSrc ?? photograph.src);
	let imageFailed = $derived(failedSource === source);
	// Tiles are sized by height, so their width is the aspect ratio times that height.
	let aspectRatio = $derived(
		photograph.width && photograph.height ? photograph.width / photograph.height : 1.5
	);
	let sizes = $derived.by(() => {
		const width = (tileHeight: string) => `calc(${aspectRatio.toFixed(3)} * ${tileHeight})`;
		return mobileHeight
			? `(max-width: 760px) ${width(mobileHeight)}, ${width(height)}`
			: width(height);
	});
</script>

<figure class="photography-gallery-frame" data-photo-id={photograph.id}>
	<button
		type="button"
		class="photography-gallery-image"
		aria-label={`View photograph: ${photograph.alt}`}
		onclick={() => onOpen(photograph)}
	>
		{#if imageFailed}
			<span class="photography-image-error"
				>Photograph unavailable. Select to try the full-size image.</span
			>
		{:else}
			{#if photograph.previewSrc}
				<!-- The strip's thumbnail file, so it is usually cached and arrives first. -->
				<img
					class="photography-tile-preview"
					src={photograph.previewSrc}
					alt=""
					aria-hidden="true"
					loading={priority ? 'eager' : 'lazy'}
					decoding="async"
					data-reveal
					{@attach revealImage(photograph.previewSrc)}
				/>
			{/if}
			<img
				class="photography-tile-image"
				src={source}
				srcset={photograph.thumbnailSrcset}
				{sizes}
				alt={photograph.alt}
				width={photograph.width ?? 1280}
				height={photograph.height ?? 960}
				loading={priority ? 'eager' : 'lazy'}
				fetchpriority={priority ? 'high' : 'auto'}
				decoding="async"
				data-reveal
				{@attach revealImage(source)}
				onerror={() => {
					failedSource = source;
				}}
			/>
		{/if}
	</button>
</figure>

<style>
	.photography-gallery-frame {
		height: 100%;
		margin: 0;
	}

	.photography-gallery-image {
		/* Holds the blurred preview inside the frame; the outline is drawn outside and stays visible. */
		position: relative;
		display: block;
		overflow: hidden;
		width: auto;
		height: 100%;
		padding: 0;
		border: 0;
		background: var(--surface-raised);
		cursor: zoom-in;
		outline: 1px solid transparent;
		outline-offset: var(--focus-offset);
	}

	.photography-gallery-image:hover {
		outline-color: var(--accent);
	}

	.photography-gallery-image:focus-visible {
		outline: var(--focus-width) solid var(--focus);
	}

	.photography-gallery-image:active {
		opacity: 0.8;
	}

	.photography-tile-image {
		position: relative;
		display: block;
		width: auto;
		max-width: none;
		height: 100%;
	}

	/* Fills the frame behind the photograph; scaled so the blur's soft edge falls outside it. */
	.photography-tile-preview {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		filter: blur(24px);
		transform: scale(1.08);
	}

	/* Stop painting the blur once the photograph has finished fading in over it. */
	.photography-gallery-image:has(.photography-tile-image:global([data-loaded]))
		.photography-tile-preview {
		visibility: hidden;
		transition: visibility 0s linear var(--motion-slow);
	}

	.photography-image-error {
		display: block;
		padding: var(--space-4);
		color: var(--text-muted);
		text-align: center;
	}

	@media (prefers-reduced-motion: no-preference) {
		.photography-gallery-image {
			transition:
				outline-color var(--motion-fast) var(--ease-standard),
				opacity var(--motion-fast) var(--ease-standard);
		}
	}
</style>
