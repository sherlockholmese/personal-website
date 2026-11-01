<!--
	@component
	An echoed shell prompt: the working directory on one line, then `❯ command`. Use it
	to introduce command-style output on custom pages.
-->
<script lang="ts">
	let {
		cwd = '~',
		command,
		inline = false,
		class: className = ''
	}: {
		cwd?: string;
		command: string;
		/** Render `cwd ❯ command` on a single line. */
		inline?: boolean;
		class?: string;
	} = $props();
</script>

<div class={['ui-prompt', className]} class:ui-prompt-inline={inline}>
	<span class="ui-prompt-cwd">{cwd}</span>
	<span class="ui-prompt-line">
		<span class="ui-prompt-symbol" aria-hidden="true">❯</span>
		<span class="ui-prompt-command">{command}</span>
	</span>
</div>

<style>
	.ui-prompt {
		display: grid;
		color: var(--tx);
		font-size: 15px;
		line-height: 1.45;
	}

	.ui-prompt-inline {
		display: flex;
		flex-wrap: wrap;
		gap: 0 8px;
	}

	.ui-prompt-cwd {
		color: var(--cyan);
	}

	.ui-prompt-line {
		display: flex;
		align-items: baseline;
		gap: 8px;
		white-space: pre-wrap;
	}

	.ui-prompt-symbol {
		color: var(--yellow);
	}

	.ui-prompt-command {
		min-width: 0;
		overflow-wrap: anywhere;
	}

	@media (max-width: 760px) {
		.ui-prompt {
			font-size: 16px;
		}
	}
</style>
