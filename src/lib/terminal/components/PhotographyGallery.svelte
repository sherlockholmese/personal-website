<script lang="ts">
	import { findPhotograph, photographRouteSlug } from '#lib/photography.ts';
	import {
		photographyCollections,
		type Photograph,
		type PhotographyCollection
	} from '../../../content/photography';
	import PhotographyCollectionBrowser from './PhotographyCollectionBrowser.svelte';
	import PhotographyCollectionView from './PhotographyCollectionView.svelte';
	import PhotographyPhotoViewer from './PhotographyPhotoViewer.svelte';

	let {
		initialQuery = '',
		initialCollectionSlug = '',
		initialPhotoSlug = '',
		inputRef = $bindable<HTMLInputElement | undefined>(),
		onClose,
		onCollectionOpen,
		onCollectionClose,
		onPhotoOpen,
		onPhotoClose
	}: {
		initialQuery?: string;
		initialCollectionSlug?: string;
		initialPhotoSlug?: string;
		inputRef?: HTMLInputElement;
		onClose: () => void;
		onCollectionOpen: (collection: PhotographyCollection) => void;
		onCollectionClose: () => void;
		onPhotoOpen: (collection: PhotographyCollection, photograph: Photograph) => void;
		onPhotoClose: (collection: PhotographyCollection) => void;
	} = $props();

	let selectedPhoto = $state<Photograph>();
	let selectedPhotoCollection = $state<PhotographyCollection>();
	let openedRoutePhoto = $state('');
	let suppressPhotoCloseRoute = $state(false);
	let activeCollection = $derived(
		photographyCollections.find((collection) => collection.slug === initialCollectionSlug)
	);

	$effect(() => {
		const photoSlug = initialPhotoSlug;
		if (!photoSlug) {
			openedRoutePhoto = '';
			if (selectedPhoto) {
				suppressPhotoCloseRoute = true;
				selectedPhoto = undefined;
				selectedPhotoCollection = undefined;
			}
			return;
		}
		if (openedRoutePhoto === photoSlug) return;

		const routePhoto = findPhotograph(initialCollectionSlug, photoSlug);
		if (!routePhoto) return;

		openedRoutePhoto = photoSlug;
		selectedPhotoCollection = routePhoto.collection;
		selectedPhoto = routePhoto.photograph;
	});

	function openCollection(collection: PhotographyCollection) {
		onCollectionOpen(collection);
	}

	function closeCollection() {
		onCollectionClose();
	}

	function openPhoto(collection: PhotographyCollection, photograph: Photograph) {
		selectedPhotoCollection = collection;
		selectedPhoto = photograph;
		openedRoutePhoto = photographRouteSlug(photograph);
		onPhotoOpen(collection, photograph);
	}

	function handlePhotoViewerClose() {
		const collection = selectedPhotoCollection;
		selectedPhoto = undefined;
		selectedPhotoCollection = undefined;
		if (collection && !suppressPhotoCloseRoute) {
			onPhotoClose(collection);
		}
		suppressPhotoCloseRoute = false;
	}

	function handleWindowKeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape' || selectedPhoto) return;

		event.preventDefault();
		event.stopPropagation();
		if (activeCollection) {
			closeCollection();
			return;
		}
		onClose();
	}
</script>

<svelte:window onkeydown={handleWindowKeydown} />

{#if activeCollection}
	<PhotographyCollectionView
		collection={activeCollection}
		onPhotoOpen={(photograph) => openPhoto(activeCollection, photograph)}
	/>
{:else}
	<PhotographyCollectionBrowser
		collections={photographyCollections}
		{initialQuery}
		bind:inputRef
		{onClose}
		onCollectionOpen={openCollection}
		onPhotoOpen={openPhoto}
	/>
{/if}

<PhotographyPhotoViewer photograph={selectedPhoto} onClose={handlePhotoViewerClose} />
