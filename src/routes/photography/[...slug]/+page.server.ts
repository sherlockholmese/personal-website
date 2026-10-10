import { resolvePhotographyPath } from '#lib/photography.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent }) => {
	const catalog = await parent();
	const photographs = [
		...catalog.photographs,
		...(catalog.headerPhotograph ? [catalog.headerPhotograph] : [])
	];
	const requestedPath = ['photography', params.slug].filter(Boolean).join('/');
	const photography = resolvePhotographyPath(requestedPath, photographs);

	return {
		requestedPath,
		photography,
		notFound: !photography && !catalog.photographyUnavailable
	};
};
