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
	DIST_DIR: { schema: optionalString }
});
