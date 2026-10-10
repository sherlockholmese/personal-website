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

const photograph: RequestHandler = async ({ params, request }) => {
	const file = params.file ?? '';
	const contentType = contentTypes[file.slice(file.lastIndexOf('.')).toLowerCase()];
	if (!contentType) {
		return new Response(request.method === 'HEAD' ? null : 'Photograph not found', {
			status: 404,
			headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
		});
	}
	return serveR2Object(request, 'photography', file, contentType);
};

export const GET = photograph;
export const HEAD = photograph;
