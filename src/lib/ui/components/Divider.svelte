<!--
	@component
	Horizontal rule using the `--border` token. Add a `label` for a box-drawing style
	section break such as `── archive ──────`.
-->
<script lang="ts">
	let {
		label,
		dashed = false,
		strong = false,
		class: className = ''
	}: { label?: string; dashed?: boolean; strong?: boolean; class?: string } = $props();
</script>

{#if label}
	<div
		class={['ui-divider ui-divider-labelled', className]}
		class:ui-divider-dashed={dashed}
		class:ui-divider-strong={strong}
		role="separator"
		aria-label={label}
	>
		<span aria-hidden="true">{label}</span>
	</div>
{:else}
	<hr
		class={['ui-divider', className]}
		class:ui-divider-dashed={dashed}
		class:ui-divider-strong={strong}
	/>
{/if}

<style>
	.ui-divider {
		--ui-divider-color: var(--border);
		--ui-divider-style: solid;
		margin: 18px 0;
		border: 0;
		border-top: 1px var(--ui-divider-style) var(--ui-divider-color);
	}

	.ui-divider-dashed {
		--ui-divider-style: dashed;
	}

	.ui-divider-strong {
		--ui-divider-color: var(--hard-border);
	}

	.ui-divider-labelled {
		display: flex;
		align-items: center;
		gap: 10px;
		border-top: 0;
		color: var(--tx-2);
		font-size: 14px;
	}

	.ui-divider-labelled::before,
	.ui-divider-labelled::after {
		content: '';
		border-top: 1px var(--ui-divider-style) var(--ui-divider-color);
	}

	.ui-divider-labelled::before {
		flex: 0 0 2ch;
	}

	.ui-divider-labelled::after {
		flex: 1;
	}
</style>
