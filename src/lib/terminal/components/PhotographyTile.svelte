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

<figure class="photography-gallery-frame">
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
