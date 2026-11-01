<!--
	@component
	Braille-dot terminal spinner with a status label. Holds a static frame when the
	user prefers reduced motion.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { prefersReducedMotion } from '#lib/terminal/motion.ts';
	import { toneColor, type Tone } from '../tone';

	let {
		label = 'loading',
		tone = 'accent',
		class: className = ''
	}: { label?: string; tone?: Tone; class?: string } = $props();

	const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
	let frame = $state(0);

	onMount(() => {
		if (prefersReducedMotion()) return;
		const timer = setInterval(() => (frame = (frame + 1) % frames.length), 80);
		return () => clearInterval(timer);
	});
</script>

<span class={['ui-spinner', className]} role="status" style:--ui-tone={toneColor[tone]}>
	<span class="ui-spinner-glyph" aria-hidden="true">{frames[frame]}</span>
	<span class="ui-spinner-label">{label}</span>
</span>

<style>
	.ui-spinner {
		display: inline-flex;
		align-items: baseline;
		gap: 1ch;
		color: var(--text-muted);
	}

	.ui-spinner-glyph {
		width: 1ch;
		color: var(--ui-tone);
	}
</style>
