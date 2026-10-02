import {
	createDownloadAccessToken,
	DOWNLOAD_ACCESS_COOKIE,
	DOWNLOAD_ACCESS_MAX_AGE_SECONDS,
	downloadAccessConfigured,
	hasValidDownloadAccess
} from '#lib/server/download-access.ts';
import {
	noStoreJson,
	turnstileConfiguration,
	validateTurnstileRequest
} from '#lib/server/turnstile.ts';
import { TURNSTILE_DOWNLOAD_ACTION } from '#lib/turnstile.ts';
import type { RequestHandler } from './$types';

function configured() {
	return turnstileConfiguration().configured && downloadAccessConfigured();
}

export const GET: RequestHandler = ({ cookies }) => {
	const ready = configured();
	const authorized = ready && hasValidDownloadAccess(cookies.get(DOWNLOAD_ACCESS_COOKIE));

	return noStoreJson({ configured: ready, authorized }, ready ? 200 : 503);
};

export const POST: RequestHandler = async ({ request, getClientAddress, cookies }) => {
	if (!configured()) {
		return noStoreJson({ message: 'download verification is not configured' }, 503);
	}

	const failure = await validateTurnstileRequest(
		request,
		getClientAddress,
		TURNSTILE_DOWNLOAD_ACTION,
		'dist-access'
	);
	if (failure) return failure;

	cookies.set(DOWNLOAD_ACCESS_COOKIE, createDownloadAccessToken(), {
		httpOnly: true,
		maxAge: DOWNLOAD_ACCESS_MAX_AGE_SECONDS,
		path: '/',
		sameSite: 'strict',
		secure: !import.meta.env.DEV
	});

	return noStoreJson({ authorized: true });
};
