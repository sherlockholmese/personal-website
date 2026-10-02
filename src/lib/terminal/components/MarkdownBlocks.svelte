<script lang="ts">
	/* eslint-disable svelte/no-at-html-tags */

	import { onDestroy } from 'svelte';
	import HighlightedCode from '#lib/HighlightedCode.svelte';
	import DistDownload from './DistDownload.svelte';
	import type { MdBlock } from '../types';

	let {
		blocks,
		compactCode = false
	}: {
		blocks: MdBlock[];
		compactCode?: boolean;
	} = $props();
	let copyState = $state<{ blockIndex: number; status: 'copied' | 'failed' }>();
	let copyResetTimer: ReturnType<typeof setTimeout> | undefined;

	function lineNumbers(lineCount: number) {
		return Array.from({ length: lineCount }, (_, index) => index + 1);
	}

	async function copyCode(code: string, blockIndex: number) {
		try {
			await navigator.clipboard.writeText(code);
			copyState = { blockIndex, status: 'copied' };
		} catch {
			copyState = { blockIndex, status: 'failed' };
		}

		clearTimeout(copyResetTimer);
		copyResetTimer = setTimeout(() => {
			copyState = undefined;
		}, 2000);
	}

	onDestroy(() => clearTimeout(copyResetTimer));
</script>

{#each blocks as block, blockIndex (blockIndex)}
	{#if block.type === 'heading'}
		<svelte:element this={`h${Math.min(block.level, 3)}`} id={block.id} data-heading-id={block.id}>
			{@html block.html}
		</svelte:element>
	{:else if block.type === 'paragraph'}
		<p>{@html block.html}</p>
	{:else if block.type === 'list'}
		<svelte:element this={block.ordered ? 'ol' : 'ul'}>
			{#each block.items as item (item)}
				<li>{@html item}</li>
			{/each}
		</svelte:element>
	{:else if block.type === 'quote'}
		<blockquote>{@html block.html}</blockquote>
	{:else if block.type === 'dist'}
		<DistDownload href={block.href} label={block.label} file={block.file} />
	{:else if block.type === 'code'}
		{@const activeCopyState = copyState?.blockIndex === blockIndex ? copyState.status : undefined}
		<div class:code-block-compact={compactCode} class="code-block">
			<span class="code-block-language">
				{block.language}
			</span>
			<button
				type="button"
				class:code-block-copy-active={Boolean(activeCopyState)}
				class="code-block-copy"
				aria-label={`${activeCopyState === 'copied' ? 'Copied' : activeCopyState === 'failed' ? 'Copy failed, retry copying' : 'Copy'} ${block.language} code`}
				onclick={() => copyCode(block.code, blockIndex)}
			>
				<span aria-live="polite">
					{activeCopyState === 'copied'
						? 'copied'
						: activeCopyState === 'failed'
							? 'retry'
							: 'copy'}
				</span>
			</button>
			<div
				class={compactCode
					? 'block'
					: 'grid grid-cols-[calc(5ch_+_20px)_minmax(0,1fr)] items-start max-[760px]:block'}
			>
				<ol
					class={`code-line-numbers m-0 list-none justify-self-stretch border-r border-[var(--border)] py-[10px] pr-[8px] pl-[12px] text-right text-[var(--tx-2)] tabular-nums max-[760px]:hidden ${compactCode ? 'hidden' : ''}`}
					aria-hidden="true"
				>
					{#each lineNumbers(block.lineCount) as line (line)}
						<li>{line}</li>
					{/each}
				</ol>
				<HighlightedCode
					html={block.html}
					class={`min-w-0 [&_code]:block [&_code]:bg-transparent [&_code]:leading-[1.45] [&_pre]:m-0 [&_pre]:overflow-x-auto [&_pre]:bg-transparent ${compactCode ? '[&_code]:text-[13px] [&_pre]:p-[8px]' : '[&_code]:text-[16px] [&_pre]:p-[10px_12px] max-[760px]:[&_pre]:px-[10px]'}`}
				/>
			</div>
		</div>
	{:else}
		<hr />
	{/if}
{/each}
