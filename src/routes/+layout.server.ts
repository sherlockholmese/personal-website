import { loadTerminalLayoutData } from '$lib/blog';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = () => ({
	...loadTerminalLayoutData(),
	asciiSeed: Math.floor(Math.random() * 0x100000000)
});
