<script lang="ts">
	import { resolve } from '$app/paths';
	import { CommandChip, KeyValueList, KeyValueRow, LinkList } from '#lib/ui/index.ts';
	import { helpfulCommands } from '../help';
	import { formatPostDate } from '../date';
	import type { BlogPostMeta } from '../types';
	import DitherAscii from './DitherAscii.svelte';

	let {
		posts,
		asciiSeed,
		onCommand
	}: { posts: BlogPostMeta[]; asciiSeed: number; onCommand: (command: string) => void } = $props();

	let latestPosts = $derived(
		posts.slice(0, 5).map((post) => ({
			label: formatPostDate(post.date),
			value: post.title,
			href: resolve(post.path as `blog/${string}`)
		}))
	);
</script>

<section class="welcome" aria-labelledby="welcome-title">
	<h1 id="welcome-title" class="ui-visually-hidden">Sherlock Holmes</h1>
	<figure class="welcome-avatar">
		<img src="/pfp.jpg" alt="Sherlock Holmes profile" class="welcome-avatar-image" />
		<figcaption class="welcome-avatar-caption">天生我才必有用，千金散尽还复来</figcaption>
	</figure>

	<div class="welcome-content">
		<DitherAscii seed={asciiSeed} />
		<DitherAscii compact seed={asciiSeed} />

		<KeyValueList>
			<KeyValueRow label="does">
				Software Engineering, Capture the Flag (pwn/forensics main), Model United Nations
			</KeyValueRow>
			<KeyValueRow label="stack">
				C/C++, Rust, HTML + JavaScript/TypeScript + CSS, Python, Godot Engine
			</KeyValueRow>
			<KeyValueRow label="try" class="welcome-try">
				<span class="welcome-commands">
					{#each helpfulCommands as command (command)}
						<CommandChip {command} onRun={onCommand} />
					{/each}
				</span>
			</KeyValueRow>
			<KeyValueRow label="latest">
				<LinkList class="welcome-latest" items={latestPosts} labelWidth="10ch" quiet />
			</KeyValueRow>
		</KeyValueList>
	</div>
</section>

<style>
	.welcome {
		display: grid;
		grid-template-columns: minmax(180px, 0.24fr) minmax(0, 1fr);
		justify-items: start;
		gap: var(--space-4);
		margin-block: var(--space-2) var(--space-4);
		padding-block: var(--space-2) var(--space-4);
		border-bottom: 1px solid var(--border);
	}

	.welcome-avatar {
		position: relative;
		display: block;
		width: 100%;
		height: 100%;
		min-width: 0;
		margin: 0;
		align-self: stretch;
	}

	.welcome-avatar-image {
		width: 100%;
		height: 100%;
		border: var(--border-frame) solid var(--accent);
		border-radius: var(--radius-frame);
		object-fit: cover;
	}

	.welcome-avatar-caption {
		position: absolute;
		right: var(--space-2);
		bottom: var(--space-2);
		left: var(--space-2);
		padding: var(--space-1) var(--space-2);
		background: color-mix(in srgb, var(--surface) 78%, transparent);
		color: var(--text);
		font-size: var(--text-caption);
		line-height: 1.45;
	}

	.welcome-content {
		width: 100%;
		min-width: 0;
		overflow-x: auto;
	}

	.welcome-content :global(.ui-kv) {
		margin-bottom: 0;
	}

	.welcome-commands {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3) var(--space-2);
	}

	.welcome-content :global(.welcome-latest) {
		margin: 0;
	}

	@media (max-width: 760px) {
		.welcome {
			grid-template-columns: minmax(0, 1fr);
			gap: var(--space-2);
			margin-bottom: var(--space-3);
			padding-bottom: var(--space-3);
		}

		.welcome-avatar {
			max-width: 160px;
			aspect-ratio: 1;
		}

		/* The command dock lists the same commands within thumb reach. */
		.welcome-content :global(.welcome-try) {
			display: none;
		}
	}
</style>
