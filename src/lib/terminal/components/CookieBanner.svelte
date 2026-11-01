<script lang="ts">
	import { tick, untrack } from 'svelte';
	import { Details, InlineCode, KeyValueList, KeyValueRow, Link, Notice } from '#lib/ui/index.ts';
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

{#snippet details()}
	<Details summary="What's stored">
		<KeyValueList stacked>
			<KeyValueRow label="Downloads">
				Passing the human check sets a cookie that keeps downloads unlocked for 10 minutes.
			</KeyValueRow>
			<KeyValueRow label="Theme">
				If you change the theme, your choice stays in this browser until you clear its site data.
			</KeyValueRow>
			<KeyValueRow label="This notice">
				“Got it” sets a cookie that hides this notice for 180 days. Run
				<InlineCode>cookies</InlineCode> in the terminal to see it again.
			</KeyValueRow>
			<KeyValueRow label="Third parties">
				Google Fonts serves the site's font on every visit. Cloudflare Turnstile runs the human
				check and loads only when you download a file or reveal the email address. Both receive your
				IP address. Read the
				<Link href="https://developers.google.com/fonts/faq/privacy">Google Fonts</Link>
				and
				<Link href="https://www.cloudflare.com/turnstile-privacy-policy/">Turnstile</Link>
				privacy policies.
			</KeyValueRow>
		</KeyValueList>
	</Details>
{/snippet}

<Notice
	bind:open={visible}
	bind:titleRef={noticeHeading}
	title="Cookies and storage"
	onDismiss={dismiss}
>
	<p>
		This site has no analytics or advertising. It stores only what it needs to protect downloads and
		remember your choices.
	</p>
	{@render details()}
</Notice>
