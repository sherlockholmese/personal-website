<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button, Text } from '#lib/ui/index.ts';
	import {
		claimTurnstileChallenge,
		loadTurnstile,
		releaseTurnstileChallenge,
		turnstileSiteKey,
		type TurnstileApi
	} from '#lib/terminal/turnstile-client.ts';
	import { TURNSTILE_DOWNLOAD_ACTION } from '#lib/turnstile.ts';
	import { onDestroy, tick } from 'svelte';

	type DownloadStatus =
		'idle' | 'checking' | 'loading' | 'ready' | 'verifying' | 'error' | 'rate-limited';

	let { href, label, file }: { href: string; label: string; file: string } = $props();

	const siteKey = turnstileSiteKey();
	let challengeContainer = $state<HTMLDivElement>();
	let turnstile: TurnstileApi | undefined;
	let widgetId: string | undefined;
	let requestController: AbortController | undefined;
	let status = $state<DownloadStatus>('idle');
	let statusMessage = $state('');
	let destroyed = false;

	function removeWidget() {
		const activeWidgetId = widgetId;
		widgetId = undefined;
		if (turnstile && activeWidgetId) turnstile.remove(activeWidgetId);
	}

	function deactivateChallenge() {
		requestController?.abort();
		requestController = undefined;
		removeWidget();
		releaseTurnstileChallenge(deactivateChallenge);

		if (!destroyed) {
			status = 'idle';
			statusMessage = '';
		}
	}

	async function startDownload() {
		if (status !== 'idle' && status !== 'error' && status !== 'rate-limited') return;

		if (!siteKey) {
			status = 'error';
			statusMessage = 'download verification is not configured.';
			return;
		}

		status = 'checking';
		statusMessage = 'checking download access...';
		requestController?.abort();
		const controller = new AbortController();
		requestController = controller;

		try {
			const response = await fetch(resolve('/api/dist-access' as const), {
				headers: { accept: 'application/json' },
				signal: controller.signal
			});
			const result = (await response.json().catch(() => null)) as {
				configured?: boolean;
				authorized?: boolean;
			} | null;

			if (destroyed || controller.signal.aborted) return;
			if (!response.ok || !result?.configured) {
				status = 'error';
				statusMessage = 'download verification is not configured.';
				return;
			}

			if (result.authorized) {
				triggerDownload();
				status = 'idle';
				statusMessage = '';
				return;
			}
		} catch {
			if (destroyed || controller.signal.aborted) return;
			status = 'error';
			statusMessage = 'download verification is unavailable. try again.';
			return;
		} finally {
			if (requestController === controller) requestController = undefined;
		}

		claimTurnstileChallenge(deactivateChallenge);
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
				action: TURNSTILE_DOWNLOAD_ACTION,
				theme: 'auto',
				size: 'flexible',
				callback: (token) => void authorizeDownload(token),
				'error-callback': () => fail('verification could not run. try again.'),
				'expired-callback': () => fail('verification expired. try again.'),
				'timeout-callback': () => fail('verification timed out. try again.'),
				'unsupported-callback': () => fail('verification is not supported by this browser.')
			});
		} catch {
			releaseTurnstileChallenge(deactivateChallenge);
			if (destroyed) return;
			status = 'error';
			statusMessage = 'verification could not load. try again.';
		}
	}

	async function authorizeDownload(token: string) {
		status = 'verifying';
		statusMessage = 'verifying...';
		requestController?.abort();
		const controller = new AbortController();
		requestController = controller;

		try {
			const response = await fetch(resolve('/api/dist-access' as const), {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ token }),
				signal: controller.signal
			});
			const result = (await response.json().catch(() => null)) as {
				authorized?: boolean;
				message?: string;
			} | null;

			if (destroyed || controller.signal.aborted) return;
			if (!response.ok || !result?.authorized) {
				status = response.status === 429 ? 'rate-limited' : 'error';
				statusMessage = result?.message ?? "I don't think you are human! Retry the challenge?";
				removeWidget();
				releaseTurnstileChallenge(deactivateChallenge);
				return;
			}

			removeWidget();
			releaseTurnstileChallenge(deactivateChallenge);
			status = 'idle';
			statusMessage = '';
			triggerDownload();
		} catch {
			if (destroyed || controller.signal.aborted) return;
			fail('download verification is unavailable. try again.');
		} finally {
			if (requestController === controller) requestController = undefined;
		}
	}

	function fail(message: string) {
		if (destroyed) return;
		removeWidget();
		releaseTurnstileChallenge(deactivateChallenge);
		status = 'error';
		statusMessage = message;
	}

	function triggerDownload() {
		const anchor = document.createElement('a');
		anchor.href = resolve(href.slice(1) as `dist/${string}`);
		anchor.download = '';
		anchor.hidden = true;
		document.body.append(anchor);
		anchor.click();
		anchor.remove();
	}

	onDestroy(() => {
		destroyed = true;
		deactivateChallenge();
	});
</script>

<div class="not-prose dist-download">
	<Button
		variant="success"
		block
		align="start"
		loading={status === 'checking' || status === 'verifying'}
		disabled={status === 'loading' || status === 'ready'}
		aria-label={`${label}: ${file}`}
		onclick={startDownload}
	>
		<span>{label}</span>
		<span class="dist-download-file">[{file}]</span>
	</Button>

	{#if status === 'loading' || status === 'ready' || status === 'verifying'}
		<div bind:this={challengeContainer} class="dist-download-challenge"></div>
	{/if}
	{#if statusMessage}
		<Text as="div" tone="muted" role="status">{statusMessage}</Text>
	{/if}
	{#if status === 'error' || status === 'rate-limited'}
		<Button variant="ghost" onclick={startDownload}>retry</Button>
	{/if}
</div>

<style>
	.dist-download {
		display: grid;
		justify-items: start;
		gap: var(--space-2);
		margin-block: var(--space-4);
	}

	.dist-download-file {
		font-weight: 400;
		overflow-wrap: anywhere;
	}

	.dist-download-challenge {
		width: 100%;
		max-width: 300px;
		min-height: 65px;
	}
</style>
