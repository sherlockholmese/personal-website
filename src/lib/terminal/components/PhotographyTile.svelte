<script lang="ts">
	import type { Photograph } from '../../../content/photography';

	let {
		photograph,
		sizes,
		onOpen
	}: {
		photograph: Photograph;
		sizes: string;
		onOpen: (photograph: Photograph) => void;
	} = $props();

	let failedSource = $state('');
	let imageFailed = $derived(failedSource === (photograph.thumbnailSrc ?? photograph.src));
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
			<img
				src={photograph.thumbnailSrc ?? photograph.src}
				srcset={photograph.thumbnailSrcset}
				{sizes}
				alt={photograph.alt}
				width={photograph.width ?? 1280}
				height={photograph.height ?? 960}
				loading="lazy"
				decoding="async"
				onerror={() => {
					failedSource = photograph.thumbnailSrc ?? photograph.src;
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
		display: block;
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

	.photography-gallery-image img {
		display: block;
		width: auto;
		max-width: none;
		height: 100%;
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
