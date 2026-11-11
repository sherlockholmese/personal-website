<script lang="ts">
	import { resolve } from '$app/paths';
	import { KeyValueList, KeyValueRow, Lightbox } from '#lib/ui/index.ts';
	import type { Photograph } from '../../../content/photography';

	let {
		photograph,
		onClose
	}: {
		photograph?: Photograph;
		onClose: () => void;
	} = $props();

	let metadata = $state<Pick<Photograph, 'camera' | 'date' | 'width' | 'height'>>({});
	let metadataUnavailable = $state(false);

	$effect(() => {
		if (!photograph) return;
		metadata = {};
		metadataUnavailable = false;
		const key = photograph.objectKey;
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
</script>

<Lightbox
	image={photograph && {
		...photograph,
		placeholderSrc: photograph.previewSrc ?? photograph.thumbnailSrc
	}}
	label={photograph ? `Photograph: ${photograph.alt}` : 'Photograph viewer'}
	closeLabel="Close photograph"
	errorMessage="Photograph unavailable. Close and reopen it to try again."
	{onClose}
>
	{#snippet footer()}
		{#if metadata.date || metadata.camera}
			<KeyValueList class="photo-metadata" labelWidth="auto" muted>
				{#if metadata.date}
					<KeyValueRow label="Date">{metadata.date}</KeyValueRow>
				{/if}
				{#if metadata.camera}
					<KeyValueRow label="Camera">{metadata.camera}</KeyValueRow>
				{/if}
			</KeyValueList>
		{:else if metadataUnavailable}
			<span class="photo-metadata-unavailable">Camera details unavailable.</span>
		{/if}
	{/snippet}
</Lightbox>

<style>
	:global(.ui-kv.photo-metadata) {
		--ui-kv-label: var(--text-muted);
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-6);
		margin: 0;
		color: var(--text);
		--ui-kv-columns: auto minmax(0, 1fr);
		--ui-kv-row-gap: var(--space-2);
	}

	/* Details arrive after the bar is drawn; they fade into its reserved line rather than pop in. */
	@media (prefers-reduced-motion: no-preference) {
		:global(.ui-kv.photo-metadata),
		.photo-metadata-unavailable {
			animation: motion-fade var(--motion-normal) var(--ease-standard);
		}
	}
</style>
