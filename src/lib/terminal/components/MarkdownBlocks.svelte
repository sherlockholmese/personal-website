<script lang="ts">
	/* eslint-disable svelte/no-at-html-tags */

	import { CodeBlock } from '#lib/ui/index.ts';
	import DistDownload from './DistDownload.svelte';
	import type { MdBlock } from '../types';

	let {
		blocks,
		compactCode = false
	}: {
		blocks: MdBlock[];
		compactCode?: boolean;
	} = $props();
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
		<CodeBlock
			code={block.code}
			language={block.language}
			html={block.html}
			compact={compactCode}
		/>
	{:else}
		<hr />
	{/if}
{/each}
