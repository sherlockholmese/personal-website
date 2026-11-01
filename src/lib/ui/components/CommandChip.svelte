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
		min-height: var(--control-chip);
		align-items: center;
		padding: 0 var(--space-1);
		border: 0;
		background: var(--accent);
		color: var(--on-accent);
		font-size: var(--text-caption);
		line-height: 1.45;
		text-decoration: none;
	}

	.ui-command-chip:active {
		background: var(--accent-hover);
		transition-duration: 0ms;
	}

	@media (hover: hover) {
		.ui-command-chip:hover:not(:active) {
			background: var(--accent-hover);
		}
	}

	@media (prefers-reduced-motion: no-preference) {
		.ui-command-chip {
			transition: background-color var(--motion-press) var(--ease-standard);
		}
	}

	@media (max-width: 760px), (pointer: coarse) {
		.ui-command-chip {
			padding-inline: var(--space-2);
		}
	}
</style>
