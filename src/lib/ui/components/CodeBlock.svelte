<!--
	@component
	Standalone fenced code block matching blog posts: language label in the top rule,
	hover copy button, and line-number gutter (hidden on mobile).

	Pass `highlight` to syntax-highlight with the site's Shiki setup, or `html` if you
	already have highlighted markup. `compact` drops line numbers and shrinks the text.
-->
<script lang="ts">
	import { onDestroy } from 'svelte';
	import { highlightCode } from '#lib/terminal/markdown.ts';
	import type { Theme } from '../types';
	import HighlightedCode from '#lib/HighlightedCode.svelte';

	let {
		code,
		language = 'text',
		lineNumbers: numbered = true,
		compact = false,
		highlight = false,
		theme = 'dark',
		html,
		class: className = ''
	}: {
		code: string;
		language?: string;
		lineNumbers?: boolean;
		compact?: boolean;
		highlight?: boolean;
		theme?: Theme;
		/** Pre-highlighted HTML; takes priority over `highlight`. */
		html?: string;
		class?: string;
	} = $props();

	let highlighted = $state<string>();
	let copyState = $state<'copied' | 'failed'>();
	let copyResetTimer: ReturnType<typeof setTimeout> | undefined;
	let lineNumberList = $derived(
		code
			.replace(/\n$/, '')
			.split('\n')
			.map((_, index) => index + 1)
	);
	let showLineNumbers = $derived(numbered && !compact);
	let renderedHtml = $derived(html ?? highlighted);

	$effect(() => {
		if (html || !highlight) return;
		let cancelled = false;
		void highlightCode(code.replace(/\n$/, ''), language, theme).then((result) => {
			if (!cancelled) highlighted = result;
		});
		return () => {
			cancelled = true;
		};
	});

	async function copy() {
		try {
			await navigator.clipboard.writeText(code);
			copyState = 'copied';
		} catch {
			copyState = 'failed';
		}
		clearTimeout(copyResetTimer);
		copyResetTimer = setTimeout(() => (copyState = undefined), 2000);
	}

	onDestroy(() => clearTimeout(copyResetTimer));
</script>

<div class={['code-block not-prose', className]} class:code-block-compact={compact}>
	<span class="code-block-language">{language}</span>
	<button
		type="button"
		class="code-block-copy"
		class:code-block-copy-active={Boolean(copyState)}
		aria-label={`${copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed, retry copying' : 'Copy'} ${language} code`}
		onclick={copy}
	>
		<span aria-live="polite">
			{copyState === 'copied' ? 'copied' : copyState === 'failed' ? 'retry' : 'copy'}
		</span>
	</button>
	<div class={['ui-code-grid', showLineNumbers && 'ui-code-grid-numbered']}>
		{#if showLineNumbers}
			<ol class="ui-code-lines" aria-hidden="true">
				{#each lineNumberList as line (line)}
					<li>{line}</li>
				{/each}
			</ol>
		{/if}
		{#if renderedHtml}
			<HighlightedCode html={renderedHtml} class="ui-code-body" />
		{:else}
			<div class="ui-code-body"><pre><code>{code.replace(/\n$/, '')}</code></pre></div>
		{/if}
	</div>
</div>

<style>
	.ui-code-grid-numbered {
		display: grid;
		grid-template-columns: calc(5ch + 20px) minmax(0, 1fr);
		align-items: start;
	}

	.ui-code-lines {
		margin: 0;
		padding: 10px 8px 10px 12px;
		border-right: 1px solid var(--border);
		color: var(--tx-2);
		font-size: 16px;
		font-variant-numeric: tabular-nums;
		line-height: 1.45;
		list-style: none;
		text-align: right;
		white-space: nowrap;
	}

	.ui-code-grid :global(.ui-code-body) {
		min-width: 0;
	}

	.ui-code-grid :global(.ui-code-body pre) {
		margin: 0;
		padding: 10px 12px;
		overflow-x: auto;
		background: transparent !important;
		color: var(--tx);
	}

	.ui-code-grid :global(.ui-code-body code) {
		display: block;
		background: transparent;
		font-size: 16px;
		line-height: 1.45;
	}

	.code-block-compact .ui-code-grid :global(.ui-code-body pre) {
		padding: 8px;
	}

	.code-block-compact .ui-code-grid :global(.ui-code-body code) {
		font-size: 13px;
	}

	@media (max-width: 760px) {
		.ui-code-grid-numbered {
			display: block;
		}

		.ui-code-lines {
			display: none;
		}

		.ui-code-grid :global(.ui-code-body pre) {
			padding-inline: 10px;
		}
	}
</style>
