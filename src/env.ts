import { defineEnvVars } from '@sveltejs/kit/env';

// Missing values are handled by the existing development fallbacks and request guards.
const optionalString = (value: string | undefined) => value;

export const variables = defineEnvVars({
	PUBLIC_TURNSTILE_SITE_KEY: { public: true, schema: optionalString },
	TURNSTILE_SECRET_KEY: { schema: optionalString },
	TURNSTILE_HOSTNAME: { schema: optionalString },
	TRUST_CLOUDFLARE_IP_HEADER: { schema: optionalString },
	CONTACT_EMAIL: { schema: optionalString },
	DOWNLOAD_ACCESS_SECRET: { schema: optionalString },
	R2_ACCOUNT_ID: { schema: optionalString },
	R2_ENDPOINT: { schema: optionalString },
	R2_BUCKET_NAME: { schema: optionalString },
	R2_ACCESS_KEY_ID: { schema: optionalString },
	R2_SECRET_ACCESS_KEY: { schema: optionalString },
	R2_DIST_PREFIX: { schema: optionalString },
	R2_PHOTOGRAPHY_PREFIX: { schema: optionalString },
	PHOTOGRAPHY_CDN_URL: { schema: optionalString },
	PHOTOGRAPHY_HEADER_KEY: { schema: optionalString }
});
