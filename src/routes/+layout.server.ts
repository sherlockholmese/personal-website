import { loadPhotographyCatalog } from '#lib/server/photography.ts';
import { loadTerminalLayoutData } from '#lib/blog.ts';
import { COOKIE_NOTICE_COOKIE, COOKIE_NOTICE_VERSION } from '#lib/cookie-notice.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => ({
	...(await loadPhotographyCatalog()),
	...loadTerminalLayoutData(),
	cookieNoticeDismissed: cookies.get(COOKIE_NOTICE_COOKIE) === COOKIE_NOTICE_VERSION,
	asciiSeed: Math.floor(Math.random() * 0x100000000)
});
