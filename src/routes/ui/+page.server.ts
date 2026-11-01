import { dev } from '$app/env';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// The component gallery is a development aid; production builds answer 404.
export const load: PageServerLoad = () => {
	if (!dev) error(404, 'Not found');
	return {};
};
