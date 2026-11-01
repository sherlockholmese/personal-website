<!--
	@component
	Fenced code block: language label in the top rule, copy button, and line-number
	gutter (hidden on mobile). The copy button reveals on hover where hover exists and is
	always visible on touch.

	Pass `html` for markup that is already highlighted, or `highlight` to run Shiki here
	(`theme` defaults to the site theme). `compact` drops line numbers and shrinks the text.
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
		theme,
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
		const activeTheme: Theme =
			theme ?? (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
		void highlightCode(code.replace(/\n$/, ''), language, activeTheme).then((result) => {
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

<div class={['ui-code not-prose', className]} class:ui-code-compact={compact}>
	<span class="ui-code-language">{language}</span>
	<button
		type="button"
		class="ui-code-copy"
		class:ui-code-copy-active={Boolean(copyState)}
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
	.ui-code {
		position: relative;
		margin-block: var(--space-3);
		border-block: 1px solid var(--border);
		background: var(--surface);
	}

	.ui-code-compact {
		margin-block: var(--space-2);
	}

	.ui-code-language {
		position: absolute;
		top: 0;
		right: var(--space-3);
		z-index: var(--layer-raised);
		padding-inline: var(--space-1);
		background: var(--surface);
		color: var(--accent);
		font-size: var(--text-caption);
		line-height: 1;
		text-transform: lowercase;
		transform: translateY(-50%);
	}

	.ui-code-copy {
		position: absolute;
		top: var(--space-2);
		right: var(--space-3);
		z-index: var(--layer-raised);
		min-width: 7ch;
		min-height: max(var(--control-close), var(--target-min));
		padding-inline: var(--space-1);
		background: var(--surface);
		color: var(--text-muted);
		font-size: var(--text-caption);
		line-height: 1;
		text-align: right;
	}

	.ui-code-copy:hover,
	.ui-code-copy:focus-visible {
		color: var(--text);
	}

	@media (hover: hover) and (pointer: fine) and (min-width: 761px) {
		.ui-code-copy {
			opacity: 0;
			pointer-events: none;
		}

		.ui-code:hover .ui-code-copy,
		.ui-code-copy:focus-visible,
		.ui-code-copy-active {
			opacity: 1;
			pointer-events: auto;
		}
	}

	.ui-code-grid-numbered {
		display: grid;
		grid-template-columns: calc(5ch + 20px) minmax(0, 1fr);
		align-items: start;
	}

	.ui-code-lines {
		margin: 0;
		padding: var(--space-2) var(--space-2) var(--space-2) var(--space-3);
		border-right: 1px solid var(--border);
		color: var(--text-muted);
		font-size: var(--text-reading);
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
		padding: var(--space-2) var(--space-3);
		overflow-x: auto;
		/* Shiki writes its background inline; the block sits on the page surface instead. */
		background: transparent !important;
		color: var(--text);
	}

	.ui-code-grid :global(.ui-code-body code) {
		display: block;
		background: transparent;
		font-size: var(--text-reading);
		line-height: 1.45;
	}

	.ui-code-compact .ui-code-grid :global(.ui-code-body pre) {
		padding: var(--space-2);
	}

	.ui-code-compact .ui-code-grid :global(.ui-code-body code) {
		font-size: var(--text-caption);
	}

	@media (max-width: 760px) {
		.ui-code-grid-numbered {
			display: block;
		}

		.ui-code-lines {
			display: none;
		}

		.ui-code-grid :global(.ui-code-body pre) {
			padding-inline: var(--space-2);
		}
	}
</style>
