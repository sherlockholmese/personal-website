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
		position: relative;
		display: inline-flex;
		min-height: var(--target-min);
		align-items: flex-start;
		gap: var(--space-2);
		color: var(--text);
		line-height: 1.45;
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
		color: var(--accent);
		white-space: pre;
	}

	.ui-checkbox-text {
		display: grid;
	}

	.ui-checkbox-description {
		color: var(--text-muted);
		font-size: var(--text-caption);
	}

	@media (hover: hover) {
		.ui-checkbox:hover .ui-checkbox-box {
			color: var(--accent-hover);
		}
	}

	.ui-checkbox-input:focus-visible + .ui-checkbox-box {
		outline: var(--focus-width) solid var(--focus);
		outline-offset: var(--focus-offset);
	}

	.ui-checkbox-disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	@media (max-width: 760px), (pointer: coarse) {
		.ui-checkbox {
			align-items: center;
		}
	}
</style>
