<!--
	@component
	A shell prompt: the working directory on one line, then `❯ command`. Pass `children`
	instead of `command` to place an input on the command line.

	`collapse` shortens the directory to `~` below 760px.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		cwd = '~',
		command,
		inline = false,
		collapse = false,
		class: className = '',
		children
	}: {
		cwd?: string;
		command?: string;
		/** Render `cwd ❯ command` on a single line. */
		inline?: boolean;
		collapse?: boolean;
		class?: string;
		children?: Snippet;
	} = $props();
</script>

<div class={['ui-prompt', className]} class:ui-prompt-inline={inline}>
	{#if collapse}
		<span class="ui-prompt-cwd ui-prompt-cwd-full">{cwd}</span>
		<span class="ui-prompt-cwd ui-prompt-cwd-short">~</span>
	{:else}
		<span class="ui-prompt-cwd">{cwd}</span>
	{/if}
	<span class="ui-prompt-line" class:ui-prompt-line-input={children}>
		<span class="ui-prompt-symbol" aria-hidden="true">❯</span>
		{#if children}
			{@render children()}
		{:else}
			<span class="ui-prompt-command">{command}</span>
		{/if}
	</span>
</div>

<style>
	.ui-prompt {
		display: grid;
		color: var(--text);
		font-size: var(--text-body);
		line-height: 1.45;
	}

	.ui-prompt-inline {
		display: flex;
		flex-wrap: wrap;
		gap: 0 var(--space-2);
	}

	.ui-prompt-cwd {
		color: var(--info);
		overflow-wrap: anywhere;
	}

	.ui-prompt-cwd-short {
		display: none;
	}

	.ui-prompt-line {
		display: flex;
		align-items: baseline;
		gap: var(--space-2);
		white-space: pre-wrap;
	}

	.ui-prompt-line-input {
		align-items: center;
	}

	.ui-prompt-symbol {
		flex: none;
		color: var(--accent);
	}

	.ui-prompt-command {
		min-width: 0;
		overflow-wrap: anywhere;
	}

	@media (max-width: 760px) {
		.ui-prompt-cwd-full {
			display: none;
		}

		.ui-prompt-cwd-short {
			display: inline;
		}
	}
</style>
