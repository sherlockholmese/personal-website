import {
	R2_ACCOUNT_ID,
	R2_ENDPOINT,
	R2_BUCKET_NAME,
	R2_ACCESS_KEY_ID,
	R2_SECRET_ACCESS_KEY,
	R2_DIST_PREFIX,
	R2_PHOTOGRAPHY_PREFIX
} from '$app/env/private';
import { encodeObjectPath, signObjectRequest } from './s3-signature';

const forwardedHeaders = ['range', 'if-none-match', 'if-modified-since'];
const responseHeaders = ['content-length', 'content-range', 'etag', 'last-modified'];

export function validObjectPath(path: string | undefined): path is string {
	return (
		!!path &&
		!path.includes('\\') &&
		![...path].some(
			(character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
		) &&
		path.split('/').every((segment) => !!segment && segment !== '.' && segment !== '..')
	);
}

export async function serveR2Object(
	request: Request,
	kind: 'dist' | 'photography',
	path: string,
	contentType: string
) {
	const head = request.method === 'HEAD';
	const cacheControl = kind === 'dist' ? 'private, no-store, max-age=0' : 'public, max-age=3600';
	const headers = new Headers({
		'Cache-Control': cacheControl,
		'X-Content-Type-Options': 'nosniff',
		'Content-Type': contentType,
		'Accept-Ranges': 'bytes'
	});
	const failure = (status: number, message: string) => {
		const errorHeaders = new Headers(headers);
		for (const name of responseHeaders) errorHeaders.delete(name);
		errorHeaders.set('Cache-Control', 'private, no-store, max-age=0');
		errorHeaders.set('Content-Type', 'text/plain; charset=utf-8');
		return new Response(head ? null : message, { status, headers: errorHeaders });
	};

	if (!validObjectPath(path)) return failure(404, 'File not found');
	if (
		!R2_BUCKET_NAME ||
		!R2_ACCESS_KEY_ID ||
		!R2_SECRET_ACCESS_KEY ||
		(!R2_ENDPOINT && !R2_ACCOUNT_ID)
	) {
		return failure(503, 'File service unavailable');
	}

	try {
		const prefix = r2ObjectPrefix(kind);
		const key = [prefix, path].filter(Boolean).join('/');
		const url = r2Url(key);
		const upstreamHeaders = new Headers();
		for (const name of forwardedHeaders) {
			const value = request.headers.get(name);
			if (value) upstreamHeaders.set(name, value);
		}
		const signal = AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]);
		const ifRange = request.headers.get('if-range');
		if (ifRange && upstreamHeaders.has('range')) {
			// R2 does not implement If-Range. Check the validator before requesting bytes.
			const metadataHeaders = signObjectRequest(
				url,
				'HEAD',
				new Headers(),
				R2_ACCESS_KEY_ID,
				R2_SECRET_ACCESS_KEY
			);
			const metadata = await fetch(url, {
				method: 'HEAD',
				headers: metadataHeaders,
				redirect: 'error',
				signal
			});
			const modifiedAt = Date.parse(metadata.headers.get('last-modified') ?? '');
			const matches = ifRange.startsWith('"')
				? ifRange === metadata.headers.get('etag')
				: !ifRange.startsWith('W/') &&
					Number.isFinite(modifiedAt) &&
					modifiedAt <= Date.parse(ifRange);
			await metadata.body?.cancel();
			if (!metadata.ok || !matches) upstreamHeaders.delete('range');
		}
		// GET preserves partial-response semantics for HEAD with a Range header.
		const method = head && !upstreamHeaders.has('range') ? 'HEAD' : 'GET';
		signObjectRequest(url, method, upstreamHeaders, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY);
		const upstream = await fetch(url, {
			method,
			headers: upstreamHeaders,
			redirect: 'error',
			signal
		});

		for (const name of responseHeaders) {
			const value = upstream.headers.get(name);
			if (value) headers.set(name, value);
		}
		if (![200, 206, 304, 416].includes(upstream.status)) {
			await upstream.body?.cancel();
			return failure(
				upstream.status === 404 ? 404 : 502,
				upstream.status === 404 ? 'File not found' : 'File service unavailable'
			);
		}
		if (kind === 'dist' && upstream.ok) {
			const filename = path.split('/').at(-1)!;
			const fallback = filename.replace(/[^\x20-\x7e]|["\\]/g, '_');
			headers.set(
				'Content-Disposition',
				`attachment; filename="${fallback}"; filename*=UTF-8''${encodeObjectPath(filename)}`
			);
		}
		if (head || upstream.status === 304 || upstream.status === 416) {
			await upstream.body?.cancel();
			// R2's error-body length does not describe our empty 416 response.
			if (upstream.status === 416) headers.delete('Content-Length');
			return new Response(null, { status: upstream.status, headers });
		}
		return new Response(upstream.body, { status: upstream.status, headers });
	} catch {
		// Never expose signed requests, credentials, or upstream error bodies.
		console.error(`Failed to serve R2 ${kind} object`);
		return failure(502, 'File service unavailable');
	}
}

export function r2ObjectPrefix(kind: 'dist' | 'photography') {
	const prefix = (
		kind === 'dist' ? (R2_DIST_PREFIX ?? 'dists') : (R2_PHOTOGRAPHY_PREFIX ?? 'photography')
	).replace(/^\/+|\/+$/g, '');
	if (prefix && !validObjectPath(prefix)) throw new Error('Invalid R2 object prefix');
	return prefix;
}

export function r2Url(key?: string) {
	if (
		!R2_BUCKET_NAME ||
		!R2_ACCESS_KEY_ID ||
		!R2_SECRET_ACCESS_KEY ||
		(!R2_ENDPOINT && !R2_ACCOUNT_ID)
	) {
		throw new Error('R2 is not configured');
	}
	const endpoint = new URL(R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`);
	if (
		endpoint.protocol !== 'https:' ||
		endpoint.pathname !== '/' ||
		endpoint.search ||
		endpoint.hash ||
		endpoint.username ||
		endpoint.password
	)
		throw new Error('Invalid R2 endpoint');
	if (
		!validObjectPath(R2_BUCKET_NAME) ||
		R2_BUCKET_NAME.includes('/') ||
		(key !== undefined && !validObjectPath(key))
	)
		throw new Error('Invalid R2 bucket or object key');
	return new URL(
		`/${encodeObjectPath(R2_BUCKET_NAME)}${key === undefined ? '' : `/${encodeObjectPath(key)}`}`,
		endpoint
	);
}

export function fetchR2List(url: URL, signal: AbortSignal) {
	const headers = signObjectRequest(
		url,
		'GET',
		new Headers(),
		R2_ACCESS_KEY_ID!,
		R2_SECRET_ACCESS_KEY!
	);
	return fetch(url, { method: 'GET', headers, redirect: 'error', signal });
}

export async function fetchR2PhotoHeader(path: string, signal: AbortSignal) {
	const key = [r2ObjectPrefix('photography'), path].filter(Boolean).join('/');
	const url = r2Url(key);
	const headers = signObjectRequest(
		url,
		'GET',
		new Headers({ Range: 'bytes=0-262143' }),
		R2_ACCESS_KEY_ID!,
		R2_SECRET_ACCESS_KEY!
	);
	return fetch(url, { method: 'GET', headers, redirect: 'error', signal });
}
