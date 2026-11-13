<!--
	@component
	Dropdown with a bordered trigger and a listbox. The list opens in the browser top
	layer, so a scrolling panel or modal dialog never clips or covers it.

	Keyboard: Enter/Space/Arrows open, Arrows/Home/End move, typing jumps to a match,
	Enter selects, Escape or Tab closes. Focus leaving the control closes the list.
-->
<script lang="ts" generics="T extends string">
	import { tick } from 'svelte';
	import type { SelectOption } from '../types';
	import Chevron from './Chevron.svelte';

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

	const MENU_GAP_PX = 4;
	const VIEWPORT_INSET_PX = 8;
	const TYPEAHEAD_RESET_MS = 500;

	const id = $props.id();
	let open = $state(false);
	let activeIndex = $state(-1);
	let trigger = $state<HTMLButtonElement>();
	let selected = $derived(options.find((option) => option.value === value));
	let typeahead = '';
	let typeaheadTimer: ReturnType<typeof setTimeout> | undefined;

	function enabledIndex(from: number, step: 1 | -1) {
		for (let offset = 0; offset < options.length; offset += 1) {
			const index = (from + step * offset + options.length * 2) % options.length;
			if (!options[index]?.disabled) return index;
		}
		return -1;
	}

	function revealActive() {
		document.getElementById(`${id}-option-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
	}

	async function openMenu(index = options.findIndex((option) => option.value === value)) {
		if (disabled || !options.length) return;
		open = true;
		activeIndex = enabledIndex(Math.max(index, 0), 1);
		await tick();
		revealActive();
	}

	function closeMenu(restoreFocus = false) {
		open = false;
		if (restoreFocus) trigger?.focus();
	}

	function choose(index: number) {
		const option = options[index];
		if (!option || option.disabled) return;
		value = option.value;
		// Close first so an onChange handler may move focus elsewhere.
		closeMenu(true);
		onChange?.(option.value);
	}

	function moveTo(index: number) {
		activeIndex = index;
		revealActive();
	}

	function jumpToTyped(key: string) {
		clearTimeout(typeaheadTimer);
		typeaheadTimer = setTimeout(() => (typeahead = ''), TYPEAHEAD_RESET_MS);
		typeahead += key.toLowerCase();
		const match = options.findIndex(
			(option) => !option.disabled && option.label.toLowerCase().startsWith(typeahead)
		);
		if (match >= 0) moveTo(match);
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
				moveTo(enabledIndex(activeIndex + 1, 1));
				break;
			case 'ArrowUp':
				event.preventDefault();
				moveTo(enabledIndex(activeIndex - 1, -1));
				break;
			case 'Home':
				event.preventDefault();
				moveTo(enabledIndex(0, 1));
				break;
			case 'End':
				event.preventDefault();
				moveTo(enabledIndex(options.length - 1, -1));
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
			default:
				if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
					jumpToTyped(event.key);
				}
		}
	}

	function handleFocusOut(event: FocusEvent) {
		const next = event.relatedTarget as Node | null;
		if (!next || !(event.currentTarget as HTMLElement).contains(next)) closeMenu();
	}

	/** Shows the list in the top layer and keeps it attached to the trigger. */
	function floatingList(list: HTMLElement) {
		function place() {
			if (!trigger) return;
			const rect = trigger.getBoundingClientRect();
			const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_INSET_PX;
			const opensUp = list.offsetHeight > spaceBelow && rect.top > spaceBelow;
			list.style.left = `${rect.left}px`;
			list.style.width = `${rect.width}px`;
			list.style.top = opensUp
				? `${Math.max(VIEWPORT_INSET_PX, rect.top - list.offsetHeight - MENU_GAP_PX)}px`
				: `${rect.bottom + MENU_GAP_PX}px`;
		}

		list.showPopover();
		place();
		window.addEventListener('resize', place);
		window.addEventListener('scroll', place, { capture: true, passive: true });

		return {
			destroy() {
				window.removeEventListener('resize', place);
				window.removeEventListener('scroll', place, { capture: true });
			}
		};
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
			<span class="ui-select-value" class:ui-select-placeholder={!selected}>
				{selected?.label ?? placeholder}
			</span>
			<Chevron {open} />
		</button>
		{#if open}
			<ul
				id={`${id}-listbox`}
				class="ui-select-menu ui-scroll"
				role="listbox"
				aria-labelledby={`${id}-label`}
				tabindex="-1"
				popover="manual"
				use:floatingList
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
						<span class="ui-select-mark" aria-hidden="true"
							>{option.value === value ? '*' : ''}</span
						>
						<span>{option.label}</span>
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
		gap: var(--space-1) var(--space-2);
		min-width: 0;
	}

	.ui-select-label {
		color: var(--text-muted);
	}

	.ui-select-anchor {
		min-width: 0;
	}

	.ui-select-label.ui-visually-hidden + .ui-select-anchor {
		grid-column: 1 / -1;
	}

	.ui-select-trigger {
		display: flex;
		width: 100%;
		min-height: var(--control-sm);
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		padding: var(--space-half) var(--space-2);
		border: 1px solid var(--border-control);
		background: var(--surface);
		color: var(--accent);
		text-align: start;
	}

	.ui-select-trigger[aria-expanded='true'] {
		border-color: var(--accent);
	}

	.ui-select-trigger:active:not(:disabled) {
		background: var(--control-active);
		color: var(--text);
	}

	.ui-select-trigger:disabled {
		opacity: var(--disabled-opacity);
	}

	@media (hover: hover) {
		.ui-select-trigger:hover:not(:disabled, :active) {
			background: var(--control-hover);
			color: var(--text);
		}
	}

	.ui-select-value {
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.ui-select-placeholder {
		color: var(--text-muted);
	}

	.ui-select-menu {
		position: fixed;
		inset: auto;
		max-height: min(240px, 50dvh);
		margin: 0;
		padding: 0;
		overflow: auto;
		border: 1px solid var(--border-control);
		background: var(--surface-floating);
		box-shadow: var(--shadow-floating);
		color: var(--text);
		list-style: none;
	}

	.ui-select-option {
		display: flex;
		min-height: var(--target-min);
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-1) var(--space-2);
		overflow-wrap: anywhere;
	}

	.ui-select-mark {
		flex: none;
		width: 1ch;
	}

	.ui-select-option[aria-selected='true'] {
		color: var(--accent);
	}

	.ui-select-option-active,
	.ui-select-option-active[aria-selected='true'] {
		background: var(--control-hover);
		color: var(--text);
	}

	@media (forced-colors: active) {
		.ui-select-option-active {
			background: Highlight;
			color: HighlightText;
			forced-color-adjust: none;
		}
	}

	.ui-select-option[aria-disabled='true'] {
		color: var(--text-muted);
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
	}
</style>
