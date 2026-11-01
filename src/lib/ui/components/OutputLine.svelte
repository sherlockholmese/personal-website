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
	class={[
		'ui-output',
		`ui-output-${kind}`,
		className
	]}>{#if children}{@render children()}{:else}{text}{/if}</pre>

<style>
	.ui-output {
		margin: 0;
		color: var(--text);
		font-size: var(--text-body);
		line-height: 1.34;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.ui-output-success {
		color: var(--success);
	}

	.ui-output-error {
		color: var(--danger);
	}

	.ui-output-warning {
		color: var(--warning);
	}

	.ui-output-muted {
		color: var(--text-muted);
	}
</style>
