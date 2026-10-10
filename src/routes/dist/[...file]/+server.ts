import { DOWNLOAD_ACCESS_COOKIE, hasValidDownloadAccess } from '#lib/server/download-access.ts';
import { serveR2Object } from '#lib/server/r2.ts';
import type { RequestHandler } from './$types';

const contentTypes: Record<string, string> = {
	'.7z': 'application/x-7z-compressed',
	'.gz': 'application/gzip',
	'.pdf': 'application/pdf',
	'.tar': 'application/x-tar',
	'.tgz': 'application/gzip',
	'.txt': 'text/plain; charset=utf-8',
	'.zip': 'application/zip'
};

const download: RequestHandler = async ({ params, request, cookies }) => {
	if (!hasValidDownloadAccess(cookies.get(DOWNLOAD_ACCESS_COOKIE))) {
		return new Response(
			request.method === 'HEAD' ? null : 'Complete verification before downloading',
			{
				status: 403,
				headers: {
					'Cache-Control': 'private, no-store, max-age=0',
					'Content-Type': 'text/plain; charset=utf-8',
					'X-Content-Type-Options': 'nosniff'
				}
			}
		);
	}
	const file = params.file ?? '';
	const extension = file.slice(file.lastIndexOf('.')).toLowerCase();
	return serveR2Object(
		request,
		'dist',
		file,
		contentTypes[extension] ?? 'application/octet-stream'
	);
};

export const GET = download;
export const HEAD = download;
