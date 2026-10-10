<script lang="ts">
	import { findPhotograph, type Photograph } from '#lib/photography.ts';
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

	let selectedPhoto = $derived(
		findPhotograph(
			[...photographs, ...(headerPhotograph ? [headerPhotograph] : [])],
			initialPhotoSlug
		)
	);

	function handleWindowKeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape' || selectedPhoto || event.defaultPrevented) return;
		event.preventDefault();
		onClose();
	}
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<section class="photography-gallery" aria-labelledby="photography-heading">
	<header class="photography-gallery-header">
		<h1 id="photography-heading">Photography</h1>
	</header>
	<div class="photography-gallery-scroll">
		{#if unavailable}
			<p class="photography-gallery-empty" role="status">
				Photographs are unavailable right now. <button
					type="button"
					class="photography-retry"
					onclick={() => location.reload()}>Try again</button
				>
			</p>
		{/if}
		{#if headerPhotograph}
			<div class="photography-gallery-hero">
				<PhotographyTile
					photograph={headerPhotograph}
					sizes="(max-width: 760px) calc(100vw - 40px), 1080px"
					onOpen={onPhotoOpen}
				/>
			</div>
		{/if}
		{#if photographs.length}
			<div class="photography-gallery-grid">
				{#each photographs as photograph (photograph.id)}
					<PhotographyTile
						{photograph}
						sizes="(max-width: 760px) calc(100vw - 40px), (max-width: 1200px) 50vw, 528px"
						onOpen={onPhotoOpen}
					/>
				{/each}
			</div>
		{:else if !headerPhotograph && !unavailable}
			<p class="photography-gallery-empty">No photographs yet.</p>
		{/if}
	</div>
</section>

<PhotographyPhotoViewer
	photograph={selectedPhoto}
	onClose={() => {
		if (selectedPhoto) onPhotoClose();
	}}
/>
