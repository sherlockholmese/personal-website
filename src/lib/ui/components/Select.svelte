<!--
	@component
	Custom dropdown matching the blog browser sort menu: a bordered trigger showing the
	current option and a listbox that drops beneath it.

	Keyboard: Enter/Space/ArrowDown open, ArrowUp/ArrowDown/Home/End move, Enter selects,
	Escape or Tab closes. Focus leaving the control closes the menu.
-->
<script lang="ts" generics="T extends string">
	import { tick } from 'svelte';
	import type { SelectOption } from '../types';

	let {
		value = $bindable(),
		options,
		label,
		hideLabel = false,
		placeholder = 'select',
		disabled = false,
		onChange,
		class: className = ''
	}: {
		value?: T;
		options: readonly SelectOption<T>[];
		label: string;
		hideLabel?: boolean;
		placeholder?: string;
		disabled?: boolean;
		onChange?: (value: T) => void;
		class?: string;
	} = $props();

	const id = $props.id();
	let open = $state(false);
	let activeIndex = $state(-1);
	let trigger = $state<HTMLButtonElement>();
	let selected = $derived(options.find((option) => option.value === value));

	function enabledIndex(from: number, step: 1 | -1) {
		for (let offset = 0; offset < options.length; offset += 1) {
			const index = (from + step * offset + options.length * 2) % options.length;
			if (!options[index]?.disabled) return index;
		}
		return -1;
	}

	async function openMenu(index = options.findIndex((option) => option.value === value)) {
		if (disabled || !options.length) return;
		open = true;
		activeIndex = enabledIndex(Math.max(index, 0), 1);
		await tick();
		document.getElementById(`${id}-option-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
	}

	function closeMenu(restoreFocus = false) {
		open = false;
		if (restoreFocus) trigger?.focus();
	}

	function choose(index: number) {
		const option = options[index];
		if (!option || option.disabled) return;
		value = option.value;
		onChange?.(option.value);
		closeMenu(true);
	}

	function move(step: 1 | -1) {
		activeIndex = enabledIndex(activeIndex + step, step);
		document.getElementById(`${id}-option-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!open) {
			if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
				event.preventDefault();
				void openMenu();
			}
			return;
		}

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				move(1);
				break;
			case 'ArrowUp':
				event.preventDefault();
				move(-1);
				break;
			case 'Home':
				event.preventDefault();
				activeIndex = enabledIndex(0, 1);
				break;
			case 'End':
				event.preventDefault();
				activeIndex = enabledIndex(options.length - 1, -1);
				break;
			case 'Enter':
			case ' ':
				event.preventDefault();
				choose(activeIndex);
				break;
			case 'Escape':
				event.preventDefault();
				closeMenu(true);
				break;
			case 'Tab':
				closeMenu();
				break;
		}
	}

	function handleFocusOut(event: FocusEvent) {
		const next = event.relatedTarget as Node | null;
		if (!next || !(event.currentTarget as HTMLElement).contains(next)) closeMenu();
	}
</script>

<div class={['ui-select', className]} onfocusout={handleFocusOut}>
	<span id={`${id}-label`} class="ui-select-label" class:ui-visually-hidden={hideLabel}>
		{label}
	</span>
	<div class="ui-select-anchor">
		<button
			bind:this={trigger}
			type="button"
			class="ui-select-trigger"
			role="combobox"
			aria-labelledby={`${id}-label`}
			aria-haspopup="listbox"
			aria-expanded={open}
			aria-controls={`${id}-listbox`}
			aria-activedescendant={open && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
			{disabled}
			onclick={() => (open ? closeMenu() : openMenu())}
			onkeydown={handleKeydown}
		>
			<span class:ui-select-placeholder={!selected}>{selected?.label ?? placeholder}</span>
			<span aria-hidden="true">{open ? '▴' : '▾'}</span>
		</button>
		{#if open}
			<ul
				id={`${id}-listbox`}
				class="ui-select-menu"
				role="listbox"
				aria-labelledby={`${id}-label`}
				tabindex="-1"
			>
				{#each options as option, index (option.value)}
					<!-- Keyboard selection is handled by the combobox via aria-activedescendant. -->
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<li
						id={`${id}-option-${index}`}
						class="ui-select-option"
						class:ui-select-option-active={index === activeIndex}
						role="option"
						aria-selected={option.value === value}
						aria-disabled={option.disabled || undefined}
						onpointerenter={() => !option.disabled && (activeIndex = index)}
						onpointerdown={(event) => event.preventDefault()}
						onclick={() => choose(index)}
					>
						<span aria-hidden="true">{option.value === value ? '*' : ' '}</span>
						{option.label}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>

<style>
	.ui-select {
		display: grid;
		grid-template-columns: auto minmax(104px, 1fr);
		align-items: center;
		gap: 4px 10px;
		min-width: 0;
	}

	.ui-select-label {
		color: var(--yellow);
	}

	.ui-select-anchor {
		position: relative;
		min-width: 0;
	}

	.ui-select-label.ui-visually-hidden + .ui-select-anchor {
		grid-column: 1 / -1;
	}

	.ui-select-trigger {
		display: inline-flex;
		width: 100%;
		height: 26px;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 0 8px;
		border: 1px solid var(--border);
		background: var(--bg);
		box-shadow: inset 0 -1px 0 var(--ui-2);
		color: var(--yellow);
		cursor: pointer;
	}

	.ui-select-trigger:focus-visible,
	.ui-select-trigger[aria-expanded='true'] {
		border-color: var(--yellow);
		box-shadow: 0 0 0 1px var(--yellow);
		outline: none;
	}

	.ui-select-trigger:disabled {
		cursor: not-allowed;
		opacity: 0.55;
	}

	.ui-select-placeholder {
		color: var(--tx-2);
	}

	.ui-select-menu {
		position: absolute;
		top: calc(100% + 6px);
		right: 0;
		left: 0;
		z-index: 6;
		max-height: 240px;
		margin: 0;
		padding: 0;
		overflow: auto;
		border: 1px solid var(--border);
		background: var(--bg);
		box-shadow: 0 8px 18px rgba(0, 0, 0, 0.35);
		list-style: none;
		scrollbar-width: thin;
		scrollbar-color: var(--border) transparent;
	}

	.ui-select-option {
		display: flex;
		gap: 8px;
		padding: 4px 8px;
		color: var(--tx);
		white-space: pre;
		cursor: pointer;
	}

	.ui-select-option-active {
		background: var(--yellow);
		color: var(--bg);
	}

	.ui-select-option[aria-disabled='true'] {
		color: var(--tx-2);
		cursor: not-allowed;
	}

	.ui-visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	@media (prefers-reduced-motion: no-preference) {
		.ui-select-menu {
			animation: motion-drop var(--motion-fast) var(--ease-enter);
		}
	}

	@media (max-width: 760px) {
		.ui-select {
			grid-template-columns: minmax(0, 1fr);
		}

		.ui-select-trigger {
			min-height: 44px;
			font-size: 16px;
		}

		.ui-select-option {
			min-height: 40px;
			align-items: center;
		}
	}
</style>
