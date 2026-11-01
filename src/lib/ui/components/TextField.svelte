<!--
	@component
	Text input in the terminal style.

	- `variant="inline"` (default): borderless input with an accent caret, like the
	  prompt and blog browser query field. Gains a visible box on mobile for touch.
	- `variant="boxed"`: always bordered, for forms.
	- `variant="bare"`: never boxed, for an input that sits inside other chrome (the
	  shell prompt). The caret is its focus indicator.

	`prefix` renders a leading glyph such as `❯` or `/`, and `actions` renders controls
	after the input. `label` sits to the left on desktop and stacks above on mobile.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
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
		actions,
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
		variant?: 'inline' | 'boxed' | 'bare';
		type?: 'text' | 'search' | 'email' | 'url' | 'password' | 'tel' | 'number';
		id?: string;
		class?: string;
		actions?: Snippet;
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
		{@render actions?.()}
	</div>
	{#if hint}<span id={`${id}-hint`} class="ui-field-hint">{hint}</span>{/if}
	{#if error}<span id={`${id}-error`} class="ui-field-error" role="alert">{error}</span>{/if}
</div>

<style>
	.ui-field {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		align-items: center;
		gap: var(--space-1) var(--space-2);
		min-width: 0;
	}

	.ui-field-bare {
		flex: 1;
	}

	.ui-field-label {
		color: var(--text-muted);
	}

	.ui-field-label.ui-visually-hidden + .ui-field-control,
	.ui-field-hint,
	.ui-field-error {
		grid-column: 1 / -1;
	}

	.ui-field-control {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-width: 0;
	}

	.ui-field-prefix {
		flex: none;
		color: var(--accent);
	}

	.ui-field-input {
		flex: 1;
		min-width: 0;
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--text);
		caret-color: var(--accent);
		outline: none;
		line-height: 1.45;
	}

	.ui-field-input::placeholder {
		color: var(--text-muted);
		opacity: 1;
	}

	.ui-field-boxed .ui-field-control {
		min-height: var(--control-md);
		padding: 0 var(--space-2);
		border: 1px solid var(--border-control);
	}

	.ui-field-inline .ui-field-control:focus-within {
		box-shadow: inset 0 -1px 0 var(--accent);
	}

	.ui-field-boxed .ui-field-control:focus-within {
		border-color: var(--accent);
		box-shadow: 0 0 0 1px var(--accent);
	}

	.ui-field-bare .ui-field-control {
		min-height: var(--target-min);
	}

	.ui-field-hint {
		color: var(--text-muted);
		font-size: var(--text-caption);
	}

	.ui-field-error {
		color: var(--danger);
		font-size: var(--text-caption);
	}

	.ui-field-invalid .ui-field-control {
		border-color: var(--danger);
		box-shadow: inset 0 -1px 0 var(--danger);
	}

	@media (max-width: 760px) {
		.ui-field {
			grid-template-columns: minmax(0, 1fr);
		}

		.ui-field-inline .ui-field-control {
			min-height: var(--target-min);
			padding: 0 var(--space-2);
			border: 1px solid var(--border-control);
		}

		.ui-field-inline .ui-field-control:focus-within {
			border-color: var(--accent);
			box-shadow: 0 0 0 1px var(--accent);
		}

		.ui-field-input {
			font-size: var(--text-body);
		}
	}
</style>
