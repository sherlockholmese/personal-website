import {
	isVariantWidth,
	loadPhotoVariant,
	photoVariantsSupported,
	photoVersion
} from '#lib/server/photo-variants.ts';
import { serveR2Object } from '#lib/server/r2.ts';
import type { RequestHandler } from './$types';

const contentTypes: Record<string, string> = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.avif': 'image/avif',
	'.gif': 'image/gif'
};

// Catalog URLs carry `v=<ETag>`, so a matching response never changes and can be cached forever.
const IMMUTABLE = 'public, max-age=31536000, immutable';
const SHORT = 'public, max-age=3600';

const photograph: RequestHandler = async ({ params, request, url }) => {
	const file = params.file ?? '';
	const contentType = contentTypes[file.slice(file.lastIndexOf('.')).toLowerCase()];
	if (!contentType) return failure(request, 404, 'Photograph not found');
	const version = url.searchParams.get('v') ?? undefined;
	const width = url.searchParams.get('w');

	// Animated GIFs would lose their frames, and Node (the dev server) cannot resize.
	if (width !== null && photoVariantsSupported && contentType !== 'image/gif') {
		if (!isVariantWidth(Number(width))) return failure(request, 404, 'Photograph not found');
		return serveVariant(request, file, Number(width), version);
	}

	const response = await serveR2Object(request, 'photography', file, contentType);
	const etag = response.headers.get('etag');
	if (response.ok && version && etag && photoVersion(etag) === version)
		response.headers.set('Cache-Control', IMMUTABLE);
	return response;
};

async function serveVariant(request: Request, file: string, width: number, version?: string) {
	try {
		const variant = await loadPhotoVariant(file, width, version);
		if (!variant) return failure(request, 404, 'Photograph not found');
		const etag = `"${photoVersion(variant.etag)}-w${width}"`;
		const headers = new Headers({
			'Cache-Control': version === photoVersion(variant.etag) ? IMMUTABLE : SHORT,
			'Content-Type': 'image/webp',
			'X-Content-Type-Options': 'nosniff',
			ETag: etag
		});
		if (request.headers.get('if-none-match') === etag)
			return new Response(null, { status: 304, headers });
		headers.set('Content-Length', String(variant.bytes.byteLength));
		return new Response(request.method === 'HEAD' ? null : (variant.bytes as BodyInit), {
			headers
		});
	} catch {
		console.error('Failed to resize R2 photograph');
		return failure(request, 502, 'Photograph unavailable');
	}
}

function failure(request: Request, status: number, message: string) {
	return new Response(request.method === 'HEAD' ? null : message, {
		status,
		headers: {
			'Cache-Control': 'no-store',
			'Content-Type': 'text/plain; charset=utf-8',
			'X-Content-Type-Options': 'nosniff'
		}
	});
}

export const GET = photograph;
export const HEAD = photograph;
