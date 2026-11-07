import { loadPhotographyCatalog } from '#lib/server/photography.ts';
import { loadTerminalLayoutData } from '#lib/blog.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => ({
	...(await loadPhotographyCatalog()),
	...loadTerminalLayoutData(),
	asciiSeed: Math.floor(Math.random() * 0x100000000)
});
