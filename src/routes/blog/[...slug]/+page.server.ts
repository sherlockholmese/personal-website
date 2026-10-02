import { normalizePostPath, resolveBlogPath } from '#lib/blog.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const requestedPath = normalizePostPath(['blog', params.slug].filter(Boolean).join('/'));
	const resolution = resolveBlogPath(requestedPath);

	return {
		post: resolution.kind === 'post' ? resolution.post : undefined,
		requestedPath,
		notFound: resolution.kind === 'missing'
	};
};
