<!--
	@component
	Text input in the terminal style.

	- `variant="inline"` (default): borderless input with an accent caret, like the
	  prompt and blog browser query field. Gains a visible box on mobile for touch.
	- `variant="boxed"`: always bordered, for forms.

	`prefix` renders a leading glyph such as `❯` or `/`. `label` sits to the left on
	desktop and stacks above on mobile.
-->
<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	let {
		value = $bindable(''),
		ref = $bindable<HTMLInputElement | undefined>(),
		label,
		hideLabel = false,
		prefix,
		hint,
		error,
		variant = 'inline',
		type = 'text',
		id: providedId,
		class: className = '',
		...rest
	}: {
		value?: string;
		ref?: HTMLInputElement;
		label: string;
		/** Keep the label for assistive technology only. */
		hideLabel?: boolean;
		prefix?: string;
		hint?: string;
		error?: string;
		variant?: 'inline' | 'boxed';
		type?: 'text' | 'search' | 'email' | 'url' | 'password' | 'tel' | 'number';
		id?: string;
		class?: string;
	} & Omit<HTMLInputAttributes, 'value' | 'type' | 'prefix'> = $props();

	const generatedId = $props.id();
	let id = $derived(providedId ?? generatedId);
	let describedBy = $derived(
		[hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
	);
</script>

<div class={['ui-field', `ui-field-${variant}`, className]} class:ui-field-invalid={error}>
	<label for={id} class="ui-field-label" class:ui-visually-hidden={hideLabel}>{label}</label>
	<div class="ui-field-control">
		{#if prefix}<span class="ui-field-prefix" aria-hidden="true">{prefix}</span>{/if}
		<input
			bind:this={ref}
			bind:value
			{id}
			{type}
			class="ui-field-input"
			aria-invalid={error ? true : undefined}
			aria-describedby={describedBy}
			autocapitalize="none"
			spellcheck={false}
			{...rest}
		/>
	</div>
	{#if hint}<span id={`${id}-hint`} class="ui-field-hint">{hint}</span>{/if}
	{#if error}<span id={`${id}-error`} class="ui-field-error" role="alert">{error}</span>{/if}
</div>

<style>
	.ui-field {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		align-items: center;
		gap: 4px 10px;
		min-width: 0;
	}

	.ui-field-label {
		color: var(--yellow);
	}

	.ui-field-label.ui-visually-hidden + .ui-field-control,
	.ui-field-hint,
	.ui-field-error {
		grid-column: 1 / -1;
	}

	.ui-field-control {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}

	.ui-field-prefix {
		flex: none;
		color: var(--yellow);
	}

	.ui-field-input {
		flex: 1;
		min-width: 0;
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--tx);
		caret-color: var(--yellow);
		outline: none;
		line-height: 1.45;
	}

	.ui-field-input::placeholder {
		color: var(--tx-2);
	}

	.ui-field-boxed .ui-field-control {
		min-height: 32px;
		padding: 0 8px;
		border: 1px solid var(--border);
		box-shadow: inset 0 -1px 0 var(--ui-2);
	}

	.ui-field-control:focus-within {
		box-shadow: inset 0 -1px 0 var(--yellow);
	}

	.ui-field-boxed .ui-field-control:focus-within {
		border-color: var(--yellow);
		box-shadow: 0 0 0 1px var(--yellow);
	}

	.ui-field-hint {
		color: var(--tx-2);
		font-size: 13px;
	}

	.ui-field-error {
		color: var(--red);
		font-size: 13px;
	}

	.ui-field-invalid .ui-field-control {
		border-color: var(--red);
		box-shadow: inset 0 -1px 0 var(--red);
	}

	.ui-visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	@media (max-width: 760px) {
		.ui-field {
			grid-template-columns: minmax(0, 1fr);
		}

		.ui-field-control {
			min-height: 44px;
			padding: 0 8px;
			border: 1px solid var(--border);
			box-shadow: inset 0 -1px 0 var(--ui-2);
		}

		.ui-field-control:focus-within {
			border-color: var(--yellow);
			box-shadow: 0 0 0 1px var(--yellow);
		}

		.ui-field-input {
			font-size: 16px;
		}
	}
</style>
