import { loadPost, postPreviewMarkdown } from '#lib/blog.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ request, url }) => {
	const path = url.searchParams.get('path') ?? '';
	const post = path ? loadPost(path) : undefined;

	if (!post) {
		return Response.json({ message: 'post not found' }, { status: 404 });
	}

	const markdown = postPreviewMarkdown(post.markdown);
	const etag = previewEtag(markdown);
	const headers = {
		'cache-control': 'public, max-age=0, must-revalidate',
		etag
	};

	if (request.headers.get('if-none-match') === etag) {
		return new Response(null, { status: 304, headers });
	}

	return Response.json({ markdown }, { headers });
};

function previewEtag(markdown: string) {
	let hash = 2166136261;
	for (let index = 0; index < markdown.length; index += 1) {
		hash ^= markdown.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return `"${(hash >>> 0).toString(16)}-${markdown.length}"`;
}
