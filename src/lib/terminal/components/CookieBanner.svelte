<script lang="ts">
	import { tick, untrack } from 'svelte';
	import {
		COOKIE_NOTICE_COOKIE,
		COOKIE_NOTICE_MAX_AGE,
		COOKIE_NOTICE_VERSION
	} from '#lib/cookie-notice.ts';

	let { dismissed }: { dismissed: boolean } = $props();
	let visible = $state(untrack(() => !dismissed));
	let noticeHeading = $state<HTMLHeadingElement>();
	let returnFocus: HTMLElement | undefined;

	async function dismiss() {
		try {
			const secure = location.protocol === 'https:' ? '; Secure' : '';
			document.cookie = `${COOKIE_NOTICE_COOKIE}=${COOKIE_NOTICE_VERSION}; Path=/; Max-Age=${COOKIE_NOTICE_MAX_AGE}; SameSite=Lax${secure}`;
		} catch {
			// Dismiss for this visit even when the browser blocks cookie storage.
		}
		visible = false;
		await tick();
		if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
		returnFocus = undefined;
	}

	export async function reopen() {
		if (!visible && document.activeElement instanceof HTMLElement) {
			returnFocus = document.activeElement;
		}
		visible = true;
		await tick();
		noticeHeading?.focus({ preventScroll: true });
	}
</script>

{#if visible}
	<section class="cookie-banner" aria-labelledby="cookie-notice-title">
		<div class="cookie-banner-content">
			<h2 id="cookie-notice-title" tabindex="-1" bind:this={noticeHeading}>
				Cookies & local storage
			</h2>
			<p>
				This site uses cookies for download security and to remember this notice, and local storage
				for your theme. No analytics or advertising cookies are used.
			</p>
			<details class="cookie-details">
				<summary>Storage details</summary>
				<dl>
					<div>
						<dt>Download security</dt>
						<dd>
							After verification, a cookie keeps protected downloads available for 10 minutes.
							Cloudflare Turnstile loads when you request a download or reveal the contact email.
						</dd>
					</div>
					<div>
						<dt>Theme preference</dt>
						<dd>
							Your chosen light or dark theme stays in this browser until you clear the site's local
							storage.
						</dd>
					</div>
					<div>
						<dt>This notice</dt>
						<dd>
							Selecting “Got it” remembers dismissal for 180 days. It does not enable tracking. You
							can reopen this notice with the <code>cookies</code> terminal command.
						</dd>
					</div>
					<div>
						<dt>External services</dt>
						<dd>
							Fonts load from Google Fonts. Google receives your IP address when your browser
							requests them. See
							<a href="https://developers.google.com/fonts/faq/privacy">Google Fonts privacy</a>
							and
							<a href="https://www.cloudflare.com/turnstile-privacy-policy/">Turnstile privacy</a>.
						</dd>
					</div>
				</dl>
			</details>
		</div>
		<button type="button" class="cookie-button" onclick={dismiss}>Got it</button>
	</section>
{/if}
