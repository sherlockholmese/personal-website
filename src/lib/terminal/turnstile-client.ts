import { PUBLIC_TURNSTILE_SITE_KEY } from '$app/env/public';

export type TurnstileApi = {
	render: (
		container: HTMLElement,
		options: {
			sitekey: string;
			action: string;
			theme: 'auto';
			size: 'flexible';
			callback: (token: string) => void;
			'error-callback': (errorCode?: string) => void;
			'expired-callback': () => void;
			'timeout-callback': () => void;
			'unsupported-callback': () => void;
		}
	) => string;
	remove: (widgetId: string) => void;
	reset: (widgetId: string) => void;
};

type TurnstileWindow = Window & {
	turnstile?: TurnstileApi;
};

let loadPromise: Promise<TurnstileApi> | undefined;
let activeChallengeCleanup: (() => void) | undefined;
const loadTimeoutMs = 10_000;
const testSiteKey = '1x00000000000000000000AA';

export function turnstileSiteKey() {
	return PUBLIC_TURNSTILE_SITE_KEY || (import.meta.env.DEV ? testSiteKey : '');
}

export function loadTurnstile() {
	const turnstileWindow = window as TurnstileWindow;
	if (turnstileWindow.turnstile) return Promise.resolve(turnstileWindow.turnstile);
	if (loadPromise) return loadPromise;

	loadPromise = new Promise<TurnstileApi>((resolve, reject) => {
		const existingScript = document.querySelector<HTMLScriptElement>('script[data-turnstile-api]');
		const script = existingScript ?? document.createElement('script');
		const timeout = window.setTimeout(
			() => fail('Turnstile API timed out while loading'),
			loadTimeoutMs
		);

		const cleanupListeners = () => {
			window.clearTimeout(timeout);
			script.removeEventListener('load', handleLoad);
			script.removeEventListener('error', handleError);
		};

		const fail = (message: string) => {
			cleanupListeners();
			script.remove();
			loadPromise = undefined;
			reject(new Error(message));
		};

		const handleLoad = () => {
			const api = (window as TurnstileWindow).turnstile;

			if (!api) {
				fail('Turnstile API did not initialize');
				return;
			}

			cleanupListeners();
			resolve(api);
		};

		const handleError = () => fail('Turnstile API failed to load');

		script.addEventListener('load', handleLoad);
		script.addEventListener('error', handleError);

		if (turnstileWindow.turnstile) {
			handleLoad();
		} else if (!existingScript) {
			script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
			script.defer = true;
			script.dataset.turnstileApi = '';
			document.head.append(script);
		}
	});

	return loadPromise;
}

export function claimTurnstileChallenge(cleanup: () => void) {
	if (activeChallengeCleanup === cleanup) return;

	const previousCleanup = activeChallengeCleanup;
	activeChallengeCleanup = cleanup;
	previousCleanup?.();
}

export function releaseTurnstileChallenge(cleanup: () => void) {
	if (activeChallengeCleanup === cleanup) activeChallengeCleanup = undefined;
}
