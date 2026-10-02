<script lang="ts">
	import { resolve } from '$app/paths';
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

<div class="not-prose my-[16px] border border-[var(--green)] bg-[var(--bg-2)] text-[var(--green)]">
	<button
		type="button"
		onclick={startDownload}
		disabled={status === 'checking' ||
			status === 'loading' ||
			status === 'ready' ||
			status === 'verifying'}
		class="flex min-h-[42px] w-full cursor-pointer flex-wrap items-center gap-x-[10px] gap-y-[4px] bg-transparent px-[14px] py-[8px] text-left font-bold text-current hover:bg-[var(--green)] hover:text-[var(--bg)] focus-visible:bg-[var(--green)] focus-visible:text-[var(--bg)] focus-visible:outline-none disabled:cursor-wait disabled:opacity-70"
		aria-label={`${label}: ${file}`}
	>
		<span aria-hidden="true">&gt;</span>
		<span>{label}</span>
		<span class="font-normal break-all opacity-70">[{file}]</span>
	</button>

	{#if status === 'loading' || status === 'ready' || status === 'verifying'}
		<div class="px-[14px] pb-[10px]">
			<div bind:this={challengeContainer} class="min-h-[65px] w-full max-w-[300px]"></div>
		</div>
	{/if}
	{#if statusMessage}
		<div class="px-[14px] pb-[8px] text-[var(--tx-2)]" role="status">{statusMessage}</div>
	{/if}
	{#if status === 'error' || status === 'rate-limited'}
		<button
			type="button"
			onclick={startDownload}
			class="mx-[14px] mb-[8px] cursor-pointer bg-transparent p-0 text-left text-[var(--cyan)] underline underline-offset-[3px] hover:text-[var(--yellow)] focus-visible:text-[var(--yellow)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tx)]"
		>
			retry
		</button>
	{/if}
</div>
