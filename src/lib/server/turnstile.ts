import {
	TURNSTILE_SECRET_KEY,
	TURNSTILE_HOSTNAME,
	TRUST_CLOUDFLARE_IP_HEADER
} from '$app/env/private';
import { consumeRateLimit } from './rate-limit';

const siteverifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const testSecretKey = '***********************************';
const testSecretKeys = new Set([
	testSecretKey,
	'2x0000000000000000000000000000000AA',
	'3x0000000000000000000000000000000AA'
]);
const rejectedSecretKeys = new Set(['your-turnstile-secret-key']);

type TurnstileResponse = {
	success: boolean;
	hostname?: string;
	action?: string;
	metadata?: {
		result_with_testing_key?: boolean;
	};
};

export type TurnstileVerification = 'verified' | 'rejected' | 'unavailable';

export function noStoreJson(
	body: Record<string, unknown>,
	status = 200,
	extraHeaders?: HeadersInit
) {
	return Response.json(body, {
		status,
		headers: {
			'cache-control': 'private, no-store, max-age=0',
			'x-content-type-options': 'nosniff',
			...extraHeaders
		}
	});
}

export function turnstileConfiguration() {
	const secretKey = TURNSTILE_SECRET_KEY?.trim() || (import.meta.env.DEV ? testSecretKey : '');
	const usingTestSecret = import.meta.env.DEV && testSecretKeys.has(secretKey);
	const configured =
		Boolean(secretKey) &&
		!rejectedSecretKeys.has(secretKey) &&
		(import.meta.env.DEV || !testSecretKeys.has(secretKey));

	return { configured, secretKey, usingTestSecret };
}

export async function verifyTurnstileToken(
	token: string,
	action: string,
	remoteAddress: string
): Promise<TurnstileVerification> {
	const { configured, secretKey, usingTestSecret } = turnstileConfiguration();
	if (!configured || !secretKey) return 'unavailable';

	const parameters = new URLSearchParams({
		secret: secretKey,
		response: token,
		remoteip: remoteAddress,
		idempotency_key: crypto.randomUUID()
	});

	let verification: TurnstileResponse;

	try {
		const response = await fetch(siteverifyUrl, {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body: parameters,
			signal: AbortSignal.timeout(10_000)
		});

		if (!response.ok) return 'unavailable';
		verification = (await response.json()) as TurnstileResponse;
	} catch {
		return 'unavailable';
	}

	const testingResponse =
		usingTestSecret || verification.metadata?.result_with_testing_key === true;
	const expectedHostname = TURNSTILE_HOSTNAME?.trim();
	const validHostname =
		testingResponse || !expectedHostname || verification.hostname === expectedHostname;
	const validAction = testingResponse || verification.action === action;

	return verification.success && validAction && validHostname ? 'verified' : 'rejected';
}

export async function validateTurnstileRequest(
	request: Request,
	getClientAddress: () => string,
	action: string,
	rateLimitNamespace: string
) {
	const address = turnstileClientAddress(request, getClientAddress);
	const retryAfter = consumeRateLimit(`${rateLimitNamespace}:${address}`);

	if (retryAfter) {
		return noStoreJson({ message: 'too many verification attempts; try again shortly' }, 429, {
			'retry-after': String(retryAfter)
		});
	}

	const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
	const token = typeof body?.token === 'string' ? body.token.trim() : '';

	if (!token || token.length > 2048) {
		return noStoreJson({ message: 'complete the verification challenge first' }, 400);
	}

	const verification = await verifyTurnstileToken(token, action, address);
	if (verification === 'unavailable') {
		return noStoreJson({ message: 'verification service is unavailable; try again' }, 502);
	}
	if (verification === 'rejected') {
		return noStoreJson({ message: "I don't think you are human! Retry the challenge?" }, 403);
	}

	return undefined;
}

export function turnstileClientAddress(request: Request, fallback: () => string): string {
	if (TRUST_CLOUDFLARE_IP_HEADER?.trim() === 'true') {
		const cloudflareAddress = request.headers.get('cf-connecting-ip')?.trim();
		if (cloudflareAddress) return cloudflareAddress;
	}

	return fallback();
}
