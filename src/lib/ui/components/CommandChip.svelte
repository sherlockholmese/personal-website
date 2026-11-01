<!--
	@component
	Filled accent chip naming a terminal command, as in the welcome banner's `try` row.
	Renders a button when `onRun` is set, otherwise a link to `href` (already resolved).
-->
<script lang="ts">
	let {
		command,
		label,
		onRun,
		href,
		class: className = ''
	}: {
		command: string;
		/** Visible text; defaults to `command`. */
		label?: string;
		onRun?: (command: string) => void;
		href?: string;
		class?: string;
	} = $props();
</script>

{#if onRun || !href}
	<button
		type="button"
		class={['ui-command-chip', className]}
		aria-label={`run ${command}`}
		onclick={() => onRun?.(command)}
	>
		{label ?? command}
	</button>
{:else}
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
	<a {href} class={['ui-command-chip', className]}>{label ?? command}</a>
{/if}

<style>
	.ui-command-chip {
		display: inline-flex;
		align-items: center;
		padding: 1px 5px;
		border: 0;
		background: var(--yellow);
		color: var(--bg);
		font-size: 13px;
		line-height: 1.45;
		text-decoration: none;
		cursor: pointer;
		touch-action: manipulation;
	}

	.ui-command-chip:hover {
		background: var(--cyan);
	}

	.ui-command-chip:focus-visible {
		outline: 2px solid var(--tx);
		outline-offset: 2px;
	}

	@media (max-width: 760px) {
		.ui-command-chip {
			min-height: 40px;
			padding-inline: 10px;
			font-size: 14px;
		}
	}
</style>
