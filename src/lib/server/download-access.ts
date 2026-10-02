import { createHmac, timingSafeEqual } from 'node:crypto';
import { DOWNLOAD_ACCESS_SECRET } from '$app/env/private';

export const DOWNLOAD_ACCESS_COOKIE = 'dist_access';
export const DOWNLOAD_ACCESS_MAX_AGE_SECONDS = 10 * 60;
const developmentSecret = 'development-only-download-access-secret';
const rejectedSecrets = new Set(['replace-with-at-least-32-random-characters']);

export function downloadAccessConfigured() {
	return downloadAccessSecret().length >= 32;
}

export function createDownloadAccessToken() {
	const expiresAt = Date.now() + DOWNLOAD_ACCESS_MAX_AGE_SECONDS * 1000;
	return `${expiresAt}.${sign(expiresAt)}`;
}

export function hasValidDownloadAccess(token: string | undefined) {
	const secret = downloadAccessSecret();
	if (!secret || !token) return false;

	const separator = token.indexOf('.');
	if (separator <= 0) return false;

	const expiresText = token.slice(0, separator);
	const providedSignature = token.slice(separator + 1);
	const expiresAt = Number(expiresText);

	if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now() || !providedSignature) {
		return false;
	}

	const expectedSignature = createSignature(expiresAt, secret);
	const provided = Buffer.from(providedSignature);
	const expected = Buffer.from(expectedSignature);

	return provided.length === expected.length && timingSafeEqual(provided, expected);
}

function sign(expiresAt: number) {
	const secret = downloadAccessSecret();
	if (!secret) throw new Error('Download access is not configured');
	return createSignature(expiresAt, secret);
}

function createSignature(expiresAt: number, secret: string) {
	return createHmac('sha256', secret).update(`dist-access:v1:${expiresAt}`).digest('base64url');
}

function downloadAccessSecret() {
	const secret = DOWNLOAD_ACCESS_SECRET?.trim();
	if (secret && secret.length >= 32 && !rejectedSecrets.has(secret)) return secret;
	return import.meta.env.DEV ? developmentSecret : '';
}
