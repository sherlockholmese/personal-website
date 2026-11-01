<!--
	@component
	Checkbox drawn as `[x]` / `[ ]`. Uses a real (visually hidden) input, so it works
	with forms, labels, and keyboard toggling out of the box.
-->
<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	let {
		checked = $bindable(false),
		label,
		description,
		disabled = false,
		class: className = '',
		...rest
	}: {
		checked?: boolean;
		label: string;
		description?: string;
		disabled?: boolean;
		class?: string;
	} & Omit<HTMLInputAttributes, 'type' | 'checked'> = $props();

	const id = $props.id();
</script>

<label class={['ui-checkbox', className]} class:ui-checkbox-disabled={disabled}>
	<input
		bind:checked
		type="checkbox"
		class="ui-checkbox-input"
		{disabled}
		aria-describedby={description ? `${id}-description` : undefined}
		{...rest}
	/>
	<span class="ui-checkbox-box" aria-hidden="true">[{checked ? 'x' : ' '}]</span>
	<span class="ui-checkbox-text">
		<span>{label}</span>
		{#if description}
			<span id={`${id}-description`} class="ui-checkbox-description">{description}</span>
		{/if}
	</span>
</label>

<style>
	.ui-checkbox {
		display: inline-flex;
		align-items: flex-start;
		gap: 8px;
		color: var(--tx);
		line-height: 1.45;
		cursor: pointer;
		touch-action: manipulation;
	}

	.ui-checkbox-input {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: 0;
		opacity: 0;
		pointer-events: none;
	}

	.ui-checkbox-box {
		flex: none;
		color: var(--yellow);
		white-space: pre;
	}

	.ui-checkbox-text {
		display: grid;
	}

	.ui-checkbox-description {
		color: var(--tx-2);
		font-size: 14px;
	}

	.ui-checkbox:hover .ui-checkbox-box {
		color: var(--cyan);
	}

	.ui-checkbox-input:focus-visible + .ui-checkbox-box {
		outline: 2px solid var(--yellow);
		outline-offset: 2px;
	}

	.ui-checkbox-disabled {
		cursor: not-allowed;
		opacity: 0.55;
	}

	@media (max-width: 760px) {
		.ui-checkbox {
			min-height: 44px;
			align-items: center;
		}
	}
</style>
