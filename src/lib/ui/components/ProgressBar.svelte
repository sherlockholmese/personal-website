<!--
	@component
	ASCII progress meter: `label [########--------] 50%`.
-->
<script lang="ts">
	import { toneColor, type Tone } from '../tone';

	let {
		value,
		max = 100,
		label,
		width = 24,
		tone = 'success',
		showValue = true,
		class: className = ''
	}: {
		value: number;
		max?: number;
		label: string;
		/** Bar length in characters. */
		width?: number;
		tone?: Tone;
		showValue?: boolean;
		class?: string;
	} = $props();

	let ratio = $derived(max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0);
	let filled = $derived(Math.round(ratio * width));
	let percent = $derived(Math.round(ratio * 100));
</script>

<div
	class={['ui-progress', className]}
	role="progressbar"
	aria-label={label}
	aria-valuemin={0}
	aria-valuemax={max}
	aria-valuenow={Math.min(Math.max(value, 0), max)}
	style:--ui-tone={toneColor[tone]}
>
	<span class="ui-progress-label">{label}</span>
	<span class="ui-progress-bar" aria-hidden="true"
		>[<span class="ui-progress-fill">{'#'.repeat(filled)}</span><span class="ui-progress-rest"
			>{'-'.repeat(width - filled)}</span
		>]</span
	>
	{#if showValue}<span class="ui-progress-value">{percent}%</span>{/if}
</div>

<style>
	.ui-progress {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0 1ch;
		line-height: 1.45;
	}

	.ui-progress-label {
		color: var(--text-muted);
	}

	.ui-progress-bar {
		max-width: 100%;
		overflow: hidden;
		color: var(--text-muted);
		white-space: pre;
	}

	.ui-progress-fill {
		color: var(--ui-tone);
	}

	.ui-progress-rest {
		color: var(--text-muted);
	}

	.ui-progress-value {
		color: var(--text-muted);
		font-variant-numeric: tabular-nums;
	}
</style>
