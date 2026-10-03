<script lang="ts">
	import './layout.css';
	import CookieBanner from '#lib/terminal/components/CookieBanner.svelte';
	import { COOKIE_NOTICE_CONTEXT } from '#lib/cookie-notice.ts';
	import { setContext } from 'svelte';

	let { children, data } = $props();
	let cookieBanner = $state<{ reopen: () => Promise<void> }>();
	setContext(COOKIE_NOTICE_CONTEXT, () => {
		void cookieBanner?.reopen();
	});
</script>

<svelte:head>
	<link rel="icon" href="/icon.svg" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Geist+Mono:ital,wght@0,100..900;1,100..900&display=swap"
	/>
</svelte:head>
{@render children()}
<div class="workspace cookie-layer">
	<CookieBanner bind:this={cookieBanner} dismissed={data.cookieNoticeDismissed} />
</div>
