import { createHash, createHmac } from 'node:crypto';

// R2 uses the S3 Signature Version 4 protocol with the "auto" region.
export function signObjectRequest(
	url: URL,
	method: 'GET' | 'HEAD',
	headers: Headers,
	accessKeyId: string,
	secretAccessKey: string,
	now = new Date(),
	region = 'auto'
) {
	const timestamp = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
	const date = timestamp.slice(0, 8);
	const payloadHash = hash('');
	headers.set('host', url.host);
	headers.set('x-amz-content-sha256', payloadHash);
	headers.set('x-amz-date', timestamp);

	const entries = [...headers.entries()].sort(([left], [right]) =>
		left < right ? -1 : left > right ? 1 : 0
	);
	const signedHeaders = entries.map(([name]) => name).join(';');
	const canonicalHeaders = entries
		.map(([name, value]) => `${name}:${value.trim().replace(/\s+/g, ' ')}\n`)
		.join('');
	const canonicalRequest = [
		method,
		url.pathname,
		[...url.searchParams.entries()]
			.map(([name, value]) => [encodeObjectSegment(name), encodeObjectSegment(value)])
			.sort(([leftName, leftValue], [rightName, rightValue]) =>
				leftName < rightName
					? -1
					: leftName > rightName
						? 1
						: leftValue < rightValue
							? -1
							: leftValue > rightValue
								? 1
								: 0
			)
			.map(([name, value]) => `${name}=${value}`)
			.join('&'),
		canonicalHeaders,
		signedHeaders,
		payloadHash
	].join('\n');
	const scope = `${date}/${region}/s3/aws4_request`;
	const stringToSign = ['AWS4-HMAC-SHA256', timestamp, scope, hash(canonicalRequest)].join('\n');
	const dateKey = hmac(`AWS4${secretAccessKey}`, date);
	const regionKey = hmac(dateKey, region);
	const serviceKey = hmac(regionKey, 's3');
	const signingKey = hmac(serviceKey, 'aws4_request');
	const signature = hmac(signingKey, stringToSign).toString('hex');
	headers.set(
		'authorization',
		`AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
	);
	return headers;
}

export function encodeObjectPath(path: string) {
	return path.split('/').map(encodeObjectSegment).join('/');
}

function encodeObjectSegment(segment: string) {
	return encodeURIComponent(segment).replace(
		/[!'()*]/g,
		(character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`
	);
}

function hash(value: string) {
	return createHash('sha256').update(value).digest('hex');
}

function hmac(key: string | Buffer, value: string) {
	return createHmac('sha256', key).update(value).digest();
}
