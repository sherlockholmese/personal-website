import { resolvePhotographyPath } from '#lib/photography.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const requestedPath = ['photography', params.slug].filter(Boolean).join('/');
	const photography = resolvePhotographyPath(requestedPath);

	return {
		requestedPath,
		photography,
		notFound: !photography
	};
};
