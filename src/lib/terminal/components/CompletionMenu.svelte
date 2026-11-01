<script lang="ts">
	import { tick } from 'svelte';
	import { completionLabel } from '../autocomplete';

	let {
		id,
		candidates,
		activeIndex,
		onSelect
	}: {
		id: string;
		candidates: string[];
		activeIndex: number;
		onSelect: (index: number) => void;
	} = $props();

	$effect(() => {
		const optionId = `${id}-${activeIndex}`;
		void tick().then(() => {
			document.getElementById(optionId)?.scrollIntoView({ block: 'nearest' });
		});
	});
</script>

<ul {id} class="completion-menu ui-scroll" role="listbox" aria-label="completions">
	{#each candidates as candidate, index (candidate)}
		<!-- Keyboard selection is handled by the prompt via aria-activedescendant. -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<li
			id={`${id}-${index}`}
			class="completion-option"
			class:completion-option-directory={candidate.endsWith('/')}
			role="option"
			aria-selected={index === activeIndex}
			onpointerdown={(event) => event.preventDefault()}
			onclick={() => onSelect(index)}
		>
			{completionLabel(candidate)}
		</li>
	{/each}
</ul>

<style>
	.completion-menu {
		display: grid;
		max-height: 30dvh;
		grid-template-columns: repeat(auto-fill, minmax(min(36ch, 100%), 1fr));
		gap: 0 var(--space-3);
		margin: 0 0 var(--space-1);
		padding: 0;
		overflow: auto;
		font-size: var(--text-body);
		line-height: 1.45;
		list-style: none;
	}

	.completion-option {
		display: flex;
		min-width: 0;
		min-height: var(--target-min);
		align-items: center;
		padding-inline: var(--space-1);
		color: var(--text-muted);
		overflow-wrap: anywhere;
	}

	.completion-option-directory {
		color: var(--info);
	}

	.completion-option:hover {
		background: var(--surface-raised);
	}

	.completion-option[aria-selected='true'] {
		background: var(--accent);
		color: var(--on-accent);
	}
</style>
