import { CONTACT_EMAIL } from '$app/env/private';
import {
	noStoreJson,
	turnstileConfiguration,
	validateTurnstileRequest
} from '#lib/server/turnstile.ts';
import { TURNSTILE_EMAIL_ACTION } from '#lib/turnstile.ts';
import type { RequestHandler } from './$types';

function contactConfiguration() {
	const email = CONTACT_EMAIL?.trim();
	const { configured: turnstileConfigured } = turnstileConfiguration();
	const configured = Boolean(email && turnstileConfigured);

	return { configured, email };
}

export const GET: RequestHandler = () => {
	const { configured } = contactConfiguration();
	return noStoreJson({ configured }, configured ? 200 : 503);
};

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const { configured, email } = contactConfiguration();

	if (!configured || !email) {
		return noStoreJson({ message: 'email reveal is not configured' }, 503);
	}

	const failure = await validateTurnstileRequest(
		request,
		getClientAddress,
		TURNSTILE_EMAIL_ACTION,
		'contact-email'
	);
	if (failure) return failure;

	return noStoreJson({ email });
};
