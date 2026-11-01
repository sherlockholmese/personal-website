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
		gap: 6px;
		overflow-x: auto;
		padding-bottom: 6px;
		border-bottom: 1px solid var(--border);
		scrollbar-width: none;
	}

	.ui-tab {
		flex: none;
		min-height: 28px;
		padding: 3px 10px;
		border: 1px solid var(--border);
		background: var(--bg);
		color: var(--yellow);
		cursor: pointer;
		touch-action: manipulation;
	}

	.ui-tab:hover:not(:disabled) {
		background: var(--ui-2);
	}

	.ui-tab[aria-selected='true'] {
		border-color: var(--yellow);
		background: var(--yellow);
		color: var(--bg);
	}

	.ui-tab:focus-visible {
		outline: 2px solid var(--tx);
		outline-offset: 2px;
	}

	.ui-tab:disabled {
		color: var(--tx-2);
		cursor: not-allowed;
	}

	.ui-tabs-panel {
		padding-top: 10px;
	}

	.ui-tabs-panel:focus-visible {
		outline: 1px dashed var(--border);
		outline-offset: 4px;
	}

	@media (max-width: 760px) {
		.ui-tab {
			min-height: 40px;
			padding-inline: 12px;
		}
	}
</style>
