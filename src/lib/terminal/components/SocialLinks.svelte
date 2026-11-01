<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button, Link, LinkList, Text } from '#lib/ui/index.ts';
	import {
		claimTurnstileChallenge,
		loadTurnstile,
		releaseTurnstileChallenge,
		turnstileSiteKey,
		type TurnstileApi
	} from '#lib/terminal/turnstile-client.ts';
	import { TURNSTILE_EMAIL_ACTION } from '#lib/turnstile.ts';
	import { onDestroy, tick } from 'svelte';

	type RevealStatus =
		'idle' | 'checking' | 'loading' | 'ready' | 'verifying' | 'revealed' | 'error' | 'rate-limited';

	const githubUrl = 'https://github.com/sherlockholmestech';
	const siteKey = turnstileSiteKey();

	let challengeContainer = $state<HTMLDivElement>();
	let turnstile: TurnstileApi | undefined;
	let widgetId: string | undefined;
	let revealController: AbortController | undefined;
	let destroyed = false;
	let status = $state<RevealStatus>('idle');
	let statusMessage = $state('');
	let email = $state('');

	function removeWidget() {
		const activeWidgetId = widgetId;
		widgetId = undefined;
		if (turnstile && activeWidgetId) turnstile.remove(activeWidgetId);
	}

	function deactivateReveal() {
		revealController?.abort();
		revealController = undefined;

		removeWidget();
		releaseTurnstileChallenge(deactivateReveal);

		if (!destroyed && status !== 'revealed') {
			status = 'idle';
			statusMessage = '';
		}
	}

	async function startReveal() {
		if (status !== 'idle' && status !== 'error' && status !== 'rate-limited') return;

		if (!siteKey) {
			status = 'error';
			statusMessage = 'email reveal is not configured.';
			return;
		}

		status = 'checking';
		statusMessage = 'checking email reveal...';
		revealController?.abort();
		const controller = new AbortController();
		revealController = controller;

		try {
			const response = await fetch(resolve('/api/contact-email' as const), {
				headers: { accept: 'application/json' },
				signal: controller.signal
			});
			const result = (await response.json().catch(() => null)) as {
				configured?: boolean;
			} | null;

			if (destroyed || controller.signal.aborted) return;
			if (!response.ok || !result?.configured) {
				status = 'error';
				statusMessage = 'email reveal is not configured.';
				return;
			}
		} catch {
			if (destroyed || controller.signal.aborted) return;
			status = 'error';
			statusMessage = 'email reveal is unavailable. try again.';
			return;
		} finally {
			if (revealController === controller) revealController = undefined;
		}

		claimTurnstileChallenge(deactivateReveal);

		if (turnstile && widgetId) {
			status = 'ready';
			statusMessage = '';
			turnstile.reset(widgetId);
			return;
		}

		status = 'loading';
		statusMessage = 'loading verification...';
		await tick();

		try {
			turnstile = await loadTurnstile();
			if (destroyed || !challengeContainer) return;

			status = 'ready';
			statusMessage = '';
			widgetId = turnstile.render(challengeContainer, {
				sitekey: siteKey,
				action: TURNSTILE_EMAIL_ACTION,
				theme: 'auto',
				size: 'flexible',
				callback: (token) => void revealEmail(token),
				'error-callback': () => fail('verification could not run. try again.'),
				'expired-callback': () => fail('verification expired. try again.'),
				'timeout-callback': () => fail('verification timed out. try again.'),
				'unsupported-callback': () => fail('verification is not supported by this browser.')
			});
		} catch {
			releaseTurnstileChallenge(deactivateReveal);
			if (destroyed) return;
			status = 'error';
			statusMessage = 'verification could not load. try again.';
		}
	}

	async function revealEmail(token: string) {
		status = 'verifying';
		statusMessage = 'verifying...';
		revealController?.abort();
		const controller = new AbortController();
		revealController = controller;

		try {
			const response = await fetch(resolve('/api/contact-email' as const), {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ token }),
				signal: controller.signal
			});
			const result = (await response.json().catch(() => null)) as {
				email?: string;
				message?: string;
			} | null;

			if (destroyed || controller.signal.aborted) return;

			if (!response.ok || !result?.email) {
				status = response.status === 429 ? 'rate-limited' : 'error';
				statusMessage = result?.message ?? "I don't think you are human! Retry the challenge?";
				removeWidget();
				releaseTurnstileChallenge(deactivateReveal);
				return;
			}

			email = result.email;
			status = 'revealed';
			statusMessage = '';

			removeWidget();
			releaseTurnstileChallenge(deactivateReveal);
		} catch {
			if (destroyed || controller.signal.aborted) return;
			fail('email reveal is unavailable. try again.');
		} finally {
			if (revealController === controller) revealController = undefined;
		}
	}

	function fail(message: string) {
		if (destroyed) return;
		removeWidget();
		releaseTurnstileChallenge(deactivateReveal);
		status = 'error';
		statusMessage = message;
	}

	onDestroy(() => {
		destroyed = true;
		deactivateReveal();
	});
</script>

<LinkList
	title="socials"
	items={[{ label: 'github', href: githubUrl, external: true }, { label: 'email' }]}
>
	{#snippet row()}
		{#if status === 'revealed'}
			<Link href={`mailto:${email}`} variant="plain">{email}</Link>
		{:else if status === 'idle'}
			<Button variant="ghost" onclick={startReveal}>are you human?</Button>
		{:else}
			{#if status === 'loading' || status === 'ready' || status === 'verifying'}
				<div bind:this={challengeContainer} class="challenge"></div>
			{/if}
			{#if statusMessage}
				<Text as="div" tone="muted" role="status">{statusMessage}</Text>
			{/if}
			{#if status === 'error' || status === 'rate-limited'}
				<Button variant="ghost" onclick={startReveal}>retry</Button>
			{/if}
		{/if}
	{/snippet}
</LinkList>

<style>
	.challenge {
		width: 100%;
		max-width: 300px;
		min-height: 65px;
	}
</style>
