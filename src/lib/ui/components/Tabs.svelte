<!--
	@component
	Accessible tab strip with roving focus (Arrow keys, Home, End). The active tab is a
	filled accent block; the panel snippet receives the active tab id.

	```svelte
	<Tabs items={[{ id: 'posts', label: 'posts' }, { id: 'tags', label: 'tags' }]} bind:active>
		{#snippet panel(id)}...{/snippet}
	</Tabs>
	```
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { TabItem } from '../types';

	let {
		items,
		active = $bindable(),
		label,
		onChange,
		class: className = '',
		panel
	}: {
		items: readonly TabItem[];
		active?: string;
		/** Accessible name for the tab list. */
		label: string;
		onChange?: (id: string) => void;
		class?: string;
		panel: Snippet<[string]>;
	} = $props();

	const id = $props.id();
	let tabButtons: HTMLButtonElement[] = $state([]);
	let current = $derived(
		items.find((item) => item.id === active && !item.disabled)?.id ??
			items.find((item) => !item.disabled)?.id
	);

	function select(itemId: string) {
		active = itemId;
		onChange?.(itemId);
	}

	function handleKeydown(event: KeyboardEvent, index: number) {
		const enabled = items.map((item, i) => (item.disabled ? -1 : i)).filter((i) => i >= 0);
		const position = enabled.indexOf(index);
		let next: number | undefined;

		if (event.key === 'ArrowRight') next = enabled[(position + 1) % enabled.length];
		else if (event.key === 'ArrowLeft')
			next = enabled[(position - 1 + enabled.length) % enabled.length];
		else if (event.key === 'Home') next = enabled[0];
		else if (event.key === 'End') next = enabled.at(-1);
		if (next === undefined) return;

		event.preventDefault();
		select(items[next].id);
		tabButtons[next]?.focus();
	}
</script>

<div class={['ui-tabs', className]}>
	<div class="ui-tabs-list" role="tablist" aria-label={label}>
		{#each items as item, index (item.id)}
			<button
				bind:this={tabButtons[index]}
				type="button"
				role="tab"
				id={`${id}-tab-${item.id}`}
				class="ui-tab"
				aria-selected={item.id === current}
				aria-controls={`${id}-panel`}
				tabindex={item.id === current ? 0 : -1}
				disabled={item.disabled}
				onclick={() => select(item.id)}
				onkeydown={(event) => handleKeydown(event, index)}
			>
				{item.label}
			</button>
		{/each}
	</div>
	{#if current}
		<div
			id={`${id}-panel`}
			class="ui-tabs-panel"
			role="tabpanel"
			aria-labelledby={`${id}-tab-${current}`}
			tabindex="0"
		>
			{@render panel(current)}
		</div>
	{/if}
</div>

<style>
	.ui-tabs-list {
		display: flex;
		gap: var(--space-2);
		overflow-x: auto;
		padding: var(--space-half) var(--space-half) var(--space-2);
		border-bottom: 1px solid var(--border);
		scrollbar-width: none;
	}

	.ui-tab {
		flex: none;
		min-height: var(--control-sm);
		padding: var(--space-half) var(--space-3);
		border: 1px solid var(--border-control);
		background: var(--surface);
		color: var(--accent);
	}

	.ui-tab:active:not(:disabled, [aria-selected='true']) {
		background: var(--control-active);
		color: var(--text);
	}

	.ui-tab[aria-selected='true'] {
		border-color: var(--accent);
		background: var(--accent);
		color: var(--on-accent);
	}

	.ui-tab:disabled {
		color: var(--text-muted);
		opacity: var(--disabled-opacity);
	}

	@media (forced-colors: active) {
		.ui-tab[aria-selected='true'] {
			background: Highlight;
			color: HighlightText;
			forced-color-adjust: none;
		}
	}

	@media (hover: hover) {
		.ui-tab:hover:not(:disabled, :active, [aria-selected='true']) {
			background: var(--control-hover);
			color: var(--text);
		}
	}

	.ui-tabs-panel {
		padding-top: var(--space-2);
	}
</style>
