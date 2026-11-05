import { json } from '@sveltejs/kit';
import { fetchPhotoMetadata, type ImageMetadata } from '#lib/server/image-metadata.ts';
import { validObjectPath } from '#lib/server/r2.ts';
import type { RequestHandler } from './$types';

const cache = new Map<string, { expires: number; metadata: ImageMetadata }>();

export const GET: RequestHandler = async ({ url, request }) => {
	const key = url.searchParams.get('file');
	if (!validObjectPath(key ?? undefined) || !/\.(jpe?g|png|webp|avif|gif)$/i.test(key!)) {
		return json(
			{ message: 'Photograph not found' },
			{ status: 404, headers: { 'Cache-Control': 'no-store' } }
		);
	}
	const cached = cache.get(key!);
	if (cached && cached.expires > Date.now())
		return json(cached.metadata, { headers: { 'Cache-Control': 'public, max-age=3600' } });
	try {
		const metadata = await fetchPhotoMetadata(
			key!,
			AbortSignal.any([request.signal, AbortSignal.timeout(10_000)])
		);
		if (!metadata) {
			return json(
				{ message: 'Metadata unavailable' },
				{ status: 404, headers: { 'Cache-Control': 'no-store' } }
			);
		}
		if (cache.size >= 256) cache.delete(cache.keys().next().value!);
		cache.set(key!, { expires: Date.now() + 3600_000, metadata });
		return json(metadata, { headers: { 'Cache-Control': 'public, max-age=3600' } });
	} catch {
		return json(
			{ message: 'Metadata unavailable' },
			{ status: 503, headers: { 'Cache-Control': 'no-store' } }
		);
	}
};
