import { json } from '@sveltejs/kit';
import { readImageMetadata, type ImageMetadata } from '#lib/server/image-metadata.ts';
import { fetchR2PhotoHeader, validObjectPath } from '#lib/server/r2.ts';
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
		const response = await fetchR2PhotoHeader(
			key!,
			AbortSignal.any([request.signal, AbortSignal.timeout(10_000)])
		);
		if (!response.ok || !response.body) {
			await response.body?.cancel();
			return json(
				{ message: 'Metadata unavailable' },
				{ status: response.status === 404 ? 404 : 503, headers: { 'Cache-Control': 'no-store' } }
			);
		}
		const reader = response.body.getReader();
		const buffer = new Uint8Array(262144);
		let length = 0;
		try {
			while (length < buffer.length) {
				const { value, done } = await reader.read();
				if (done) break;
				const chunk = value.subarray(0, buffer.length - length);
				buffer.set(chunk, length);
				length += chunk.length;
			}
		} finally {
			await reader.cancel();
		}
		const metadata = readImageMetadata(buffer.subarray(0, length));
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
