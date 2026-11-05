import { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } from '$app/env/private';
import { PHOTOGRAPH_VARIANT_WIDTHS } from '../photography';
import { r2ObjectPrefix, r2Url, validObjectPath } from './r2';
import { signObjectRequest } from './s3-signature';

// Resized WebP copies of R2 photographs, so the gallery never downloads full-size originals.
// Bun's built-in `Bun.Image` does the work; under Node (the Vite dev server) there is no
// resizer, and callers fall back to serving the original.

type BunImage = {
	resize(width: number, height?: number, options?: object): BunImage;
	webp(options?: { quality?: number }): BunImage;
	bytes(): Promise<Uint8Array>;
};
type BunImageConstructor = new (
	input: Uint8Array,
	options?: { maxPixels?: number; autoOrient?: boolean }
) => BunImage;

const ImageClass = (globalThis as { Bun?: { Image?: BunImageConstructor } }).Bun?.Image;

export const photoVariantsSupported = !!ImageClass;

export type PhotoVariant = { bytes: Uint8Array; etag: string };

const MAX_CACHE_BYTES = 96 * 1024 * 1024;
// Decoding a large original needs a few hundred megabytes; keep only a couple in flight.
const MAX_CONCURRENT_RESIZES = 2;
const MAX_SOURCE_BYTES = 64 * 1024 * 1024;

const cache = new Map<string, PhotoVariant>();
let cacheBytes = 0;
const pending = new Map<string, Promise<PhotoVariant | undefined>>();
let activeResizes = 0;
const resizeQueue: (() => void)[] = [];

/** The URL-safe version token for an R2 ETag. */
export function photoVersion(etag: string) {
	return etag.replace(/[^\w-]/g, '');
}

export function isVariantWidth(width: number) {
	return (PHOTOGRAPH_VARIANT_WIDTHS as readonly number[]).includes(width);
}

/**
 * Returns the resized photograph, or undefined if the original does not exist. A cached copy is
 * revalidated with a conditional request, so a replaced photograph never serves stale pixels.
 */
export function loadPhotoVariant(
	path: string,
	width: number,
	version?: string
): Promise<PhotoVariant | undefined> {
	if (!ImageClass) throw new Error('Image resizing is unavailable');
	if (!validObjectPath(path) || !isVariantWidth(width)) return Promise.resolve(undefined);
	const id = `${width}:${path}`;
	// A versioned URL names the original's ETag; a matching copy needs no round trip to R2.
	const cached = cache.get(id);
	if (cached && version && photoVersion(cached.etag) === version) {
		touch(id, cached);
		return Promise.resolve(cached);
	}
	let request = pending.get(id);
	if (!request) {
		// Shared by concurrent requests, so one visitor leaving must not cancel it for the others.
		request = buildVariant(id, path, width).finally(() => pending.delete(id));
		pending.set(id, request);
	}
	return request;
}

async function buildVariant(id: string, path: string, width: number) {
	const cached = cache.get(id);
	const key = [r2ObjectPrefix('photography'), path].filter(Boolean).join('/');
	const url = r2Url(key);
	const headers = new Headers();
	if (cached) headers.set('if-none-match', cached.etag);
	signObjectRequest(url, 'GET', headers, R2_ACCESS_KEY_ID!, R2_SECRET_ACCESS_KEY!);
	const response = await fetch(url, {
		method: 'GET',
		headers,
		redirect: 'error',
		signal: AbortSignal.timeout(30_000)
	});
	if (response.status === 304 && cached) {
		touch(id, cached);
		return cached;
	}
	if (response.status === 404) {
		await response.body?.cancel();
		forget(id);
		return undefined;
	}
	const etag = response.headers.get('etag');
	const size = Number(response.headers.get('content-length') ?? 0);
	if (!response.ok || !etag || size > MAX_SOURCE_BYTES) {
		await response.body?.cancel();
		throw new Error('R2 photograph unavailable');
	}
	const source = new Uint8Array(await response.arrayBuffer());
	const bytes = await withResizeSlot(() =>
		new ImageClass!(source, { maxPixels: 120_000_000 })
			.resize(width, undefined, { fit: 'inside', withoutEnlargement: true })
			.webp({ quality: width <= 480 ? 72 : 80 })
			.bytes()
	);
	const variant = { bytes, etag };
	touch(id, variant);
	return variant;
}

async function withResizeSlot<T>(task: () => Promise<T>) {
	if (activeResizes >= MAX_CONCURRENT_RESIZES)
		await new Promise<void>((resolve) => resizeQueue.push(resolve));
	activeResizes++;
	try {
		return await task();
	} finally {
		activeResizes--;
		resizeQueue.shift()?.();
	}
}

// Least-recently-used: Map iteration order is insertion order, so re-inserting marks it recent.
function touch(id: string, variant: PhotoVariant) {
	forget(id);
	if (variant.bytes.byteLength > MAX_CACHE_BYTES / 8) return;
	cache.set(id, variant);
	cacheBytes += variant.bytes.byteLength;
	for (const [oldest, entry] of cache) {
		if (cacheBytes <= MAX_CACHE_BYTES) break;
		cache.delete(oldest);
		cacheBytes -= entry.bytes.byteLength;
	}
}

function forget(id: string) {
	const entry = cache.get(id);
	if (!entry) return;
	cache.delete(id);
	cacheBytes -= entry.bytes.byteLength;
}
