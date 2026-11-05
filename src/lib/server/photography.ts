import { PHOTOGRAPHY_CDN_URL, PHOTOGRAPHY_HEADER_KEY } from '$app/env/private';
import type { Photograph } from '../../content/photography';
import { photographVariants } from '../photography';
import { fetchPhotoMetadata } from './image-metadata';
import { photoVersion } from './photo-variants';
import { fetchR2List, r2ObjectPrefix, r2Url, validObjectPath } from './r2';
import { encodeObjectPath } from './s3-signature';

export type PhotographyCatalog = {
	photographs: Photograph[];
	headerPhotograph?: Photograph;
	photographyUnavailable: boolean;
};

// Every page's layout loads the catalog, so after the first load it is served from memory and
// refreshed in the background rather than making a visitor wait on R2.
const FRESH_MS = 60_000;
const UNAVAILABLE_RETRY_MS = 10_000;
// On a cold start, wait this long for photograph dimensions before rendering without them.
const DIMENSION_WAIT_MS = 1_500;
const DIMENSION_CONCURRENCY = 8;

let cachedCatalog: PhotographyCatalog | undefined;
let refreshAt = 0;
let pendingCatalog: Promise<PhotographyCatalog> | undefined;

type Dimensions = { width: number; height: number };
// Keyed by object key and ETag, so a replaced photograph is measured again.
const dimensions = new Map<string, Dimensions | null>();
let pendingDimensions: Promise<void> | undefined;

export function loadPhotographyCatalog(): Promise<PhotographyCatalog> {
	if (cachedCatalog && Date.now() < refreshAt) return Promise.resolve(cachedCatalog);
	pendingCatalog ??= readCatalog()
		.then((catalog) => {
			cachedCatalog = catalog;
			refreshAt = Date.now() + (catalog.photographyUnavailable ? UNAVAILABLE_RETRY_MS : FRESH_MS);
			return catalog;
		})
		.finally(() => {
			pendingCatalog = undefined;
		});
	return cachedCatalog ? Promise.resolve(cachedCatalog) : pendingCatalog;
}

async function readCatalog(): Promise<PhotographyCatalog> {
	try {
		const prefix = r2ObjectPrefix('photography');
		const objectPrefix = prefix ? `${prefix}/` : '';
		const photos: Photograph[] = [];
		const seenTokens = new Set<string>();
		let token = '';
		const signal = AbortSignal.timeout(15_000);
		do {
			const url = r2Url();
			url.searchParams.set('list-type', '2');
			url.searchParams.set('prefix', objectPrefix);
			url.searchParams.set('encoding-type', 'url');
			url.searchParams.set('max-keys', '1000');
			if (token) url.searchParams.set('continuation-token', token);
			const response = await fetchR2List(url, signal);
			if (!response.ok) {
				await response.body?.cancel();
				throw new Error('R2 listing failed');
			}
			const xml = await response.text();
			if (!xml.includes('<ListBucketResult')) throw new Error('Invalid R2 listing');
			for (const entry of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
				const key = decodeURIComponent(xmlValue(entry[1], 'Key'));
				if (!key.startsWith(objectPrefix)) continue;
				const relativeKey = key.slice(objectPrefix.length);
				if (
					!validObjectPath(relativeKey) ||
					!/\.(jpe?g|png|webp|avif|gif)$/i.test(relativeKey) ||
					Number(xmlValue(entry[1], 'Size')) <= 0
				)
					continue;
				photos.push({
					id: relativeKey,
					objectKey: relativeKey,
					src: photoSource(relativeKey, photoVersion(xmlValue(entry[1], 'ETag'))),
					alt: 'Photograph'
				});
			}
			if (xmlValue(xml, 'IsTruncated') !== 'true') break;
			token = xmlValue(xml, 'NextContinuationToken');
			if (!token || seenTokens.has(token)) throw new Error('Invalid R2 continuation token');
			seenTokens.add(token);
		} while (token);
		const headerKey = (PHOTOGRAPHY_HEADER_KEY ?? 'DSC02177_watermark.jpg').replace(
			/^photography\//,
			''
		);
		await measurePhotographs(photos);
		const headerPhotograph = photos.find((photo) => photo.objectKey === headerKey);
		return {
			photographs: photos.filter((photo) => photo !== headerPhotograph),
			headerPhotograph,
			photographyUnavailable: false
		};
	} catch {
		return {
			photographs: cachedCatalog?.photographs ?? [],
			headerPhotograph: cachedCatalog?.headerPhotograph,
			photographyUnavailable: true
		};
	}
}

function photoSource(key: string, version: string) {
	const base = PHOTOGRAPHY_CDN_URL?.replace(/\/+$/, '') || '/media/photography';
	if (PHOTOGRAPHY_CDN_URL) {
		const url = new URL(base);
		if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash)
			throw new Error('Invalid photography CDN URL');
	}
	return `${base}/${encodeObjectPath(key)}${version ? `?v=${version}` : ''}`;
}

function dimensionKey(photo: Photograph) {
	return `${photo.objectKey}|${photo.src}`;
}

/**
 * Adds dimensions and resized sources. Unmeasured photographs are read from R2 in the background;
 * a cold start waits briefly for them, and later catalogs pick up the rest.
 */
async function measurePhotographs(photos: Photograph[]) {
	const unmeasured = photos.filter((photo) => !dimensions.has(dimensionKey(photo)));
	if (unmeasured.length && !pendingDimensions) {
		pendingDimensions = measure(unmeasured).finally(() => {
			pendingDimensions = undefined;
			// Publish the new dimensions on the next request.
			refreshAt = 0;
		});
	}
	if (pendingDimensions && !cachedCatalog)
		await Promise.race([
			pendingDimensions,
			new Promise((resolve) => setTimeout(resolve, DIMENSION_WAIT_MS))
		]);
	for (const photo of photos) {
		const size = dimensions.get(dimensionKey(photo));
		if (size) Object.assign(photo, size);
		Object.assign(photo, photographVariants(photo.src, size?.width));
	}
}

async function measure(photos: Photograph[]) {
	const queue = [...photos];
	const signal = AbortSignal.timeout(30_000);
	await Promise.all(
		Array.from({ length: Math.min(DIMENSION_CONCURRENCY, queue.length) }, async () => {
			for (let photo = queue.shift(); photo; photo = queue.shift()) {
				try {
					const metadata = await fetchPhotoMetadata(photo.objectKey!, signal);
					dimensions.set(
						dimensionKey(photo),
						metadata?.width && metadata.height
							? { width: metadata.width, height: metadata.height }
							: null
					);
				} catch {
					// Leave it unmeasured; the next catalog refresh tries again.
				}
			}
		})
	);
}

function xmlValue(xml: string, name: string) {
	const value = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1] ?? '';
	return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity: string) => {
		const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
		if (entity.startsWith('#'))
			return String.fromCodePoint(
				entity[1].toLowerCase() === 'x'
					? parseInt(entity.slice(2), 16)
					: parseInt(entity.slice(1), 10)
			);
		return named[entity] ?? '';
	});
}
