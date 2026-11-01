<!--
	@component
	Preformatted terminal output, colored by result kind (same kinds as the shell's
	`ShellLine`). Pass `text`, or children for rich content.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		kind = 'output',
		text,
		class: className = '',
		children
	}: {
		kind?: 'output' | 'success' | 'error' | 'muted' | 'warning';
		text?: string;
		class?: string;
		children?: Snippet;
	} = $props();
</script>

<pre
	class={['ui-output', `ui-output-${kind}`, className]}
	role={kind === 'error'
		? 'alert'
		: undefined}>{#if children}{@render children()}{:else}{text}{/if}</pre>

<style>
	.ui-output {
		margin: 0;
		color: var(--tx);
		font-size: 15px;
		line-height: 1.34;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.ui-output-success {
		color: var(--green);
	}

	.ui-output-error {
		color: var(--red);
	}

	.ui-output-warning {
		color: var(--orange);
	}

	.ui-output-muted {
		color: var(--tx-2);
	}

	@media (max-width: 760px) {
		.ui-output {
			font-size: 16px;
		}
	}
</style>
