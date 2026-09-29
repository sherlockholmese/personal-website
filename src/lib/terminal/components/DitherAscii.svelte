<script module lang="ts">
	let hasPlayedReveal = false;
</script>

<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { compactMask, desktopMask, renderAscii } from '../ascii-art';

	let { compact = false, seed }: { compact?: boolean; seed: number } = $props();

	const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
	const trailDuration = 560;
	const revealDuration = 1400;
	const scrambleSymbols = '@#$%^&*!-+';
	let rows = $derived(renderAscii(compact ? compactMask : desktopMask, seed));
	let width = $derived(Math.max(...rows.map((row) => row.length)));
	let original = $derived(rows.map((row) => row.padEnd(width)));
	let originalText = $derived(original.join('\n'));
	let displayedText = $state<string>();
	let revealRadius = $state(0);

	let art: HTMLPreElement;
	let hovering = false;
	let revealFinished = false;
	let frame = 0;
	let revealFrame = 0;
	let revealStart = 0;
	let trail: { x: number; y: number; time: number }[] = [];

	function reveal(time: number) {
		if (!revealStart) revealStart = time;
		const progress = Math.min(1, (time - revealStart) / revealDuration);
		revealRadius = progress * 180;

		const bounds = art.getBoundingClientRect();
		const cellWidth = bounds.width / width;
		const cellHeight = bounds.height / rows.length;
		const maxDistance = Math.hypot(bounds.width, bounds.height);
		const frontier = progress * 1.3;
		displayedText = original
			.map((row, y) =>
				[...row]
					.map((character, x) => {
						if (character === ' ') return ' ';
						const distance =
							Math.hypot(x * cellWidth, (rows.length - 1 - y) * cellHeight) / maxDistance;
						if (frontier < distance - 0.04) return ' ';
						if (frontier < distance + 0.24) {
							return scrambleSymbols[Math.floor(Math.random() * scrambleSymbols.length)];
						}
						return character;
					})
					.join('')
			)
			.join('\n');

		if (progress < 1) {
			revealFrame = requestAnimationFrame(reveal);
		} else {
			displayedText = undefined;
			revealFinished = true;
			revealFrame = 0;
		}
	}

	function paint(time: number) {
		frame = 0;
		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		trail = reducedMotion
			? hovering
				? trail.slice(-1)
				: []
			: trail.filter((point) => time - point.time < trailDuration);
		if (trail.length === 0) {
			displayedText = undefined;
			return;
		}

		const result = original
			.map((row, y) =>
				[...row]
					.map((character, x) => {
						let influence = 0;
						for (const point of trail) {
							const distance = Math.hypot((x - point.x) * 0.9, (y - point.y) * 1.5);
							const age = reducedMotion ? 0 : (time - point.time) / trailDuration;
							influence = Math.max(influence, Math.max(0, 1 - distance / 6.3) * (1 - age));
						}
						const threshold = bayer[((y & 3) << 2) | (x & 3)] / 16;
						if (character === ' ')
							return influence > 0.55 && threshold < influence * 0.3 ? '.' : ' ';
						const shade = Math.max(
							0,
							Math.min(4, Math.floor((1 - influence) * 5 + threshold * 0.7))
						);
						return ['.', ':', '+', '*', character][shade];
					})
					.join('')
			)
			.join('\n');

		if (result !== (displayedText ?? originalText)) displayedText = result;
		if (!reducedMotion) frame = requestAnimationFrame(paint);
	}

	function movePointer(event: PointerEvent) {
		if (event.pointerType === 'touch' || !art || !revealFinished) return;
		hovering = true;
		const bounds = art.getBoundingClientRect();
		trail.push({
			x: ((event.clientX - bounds.left) / bounds.width) * width,
			y: ((event.clientY - bounds.top) / bounds.height) * rows.length,
			time: performance.now()
		});
		if (trail.length > 48) trail = trail.slice(-48);
		if (!frame) frame = requestAnimationFrame(paint);
	}

	function leavePointer() {
		hovering = false;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			trail = [];
			displayedText = undefined;
		}
	}

	onMount(() => {
		let cancelled = false;
		const finishWithoutAnimation = () => {
			revealRadius = 180;
			revealFinished = true;
		};

		if (
			getComputedStyle(art).display === 'none' ||
			window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
			hasPlayedReveal
		) {
			finishWithoutAnimation();
			return;
		}

		const startReveal = () => {
			if (cancelled) return;
			if (hasPlayedReveal || getComputedStyle(art).display === 'none') {
				finishWithoutAnimation();
				return;
			}
			hasPlayedReveal = true;
			revealFrame = requestAnimationFrame(reveal);
		};
		void document.fonts.ready.then(startReveal, startReveal);

		return () => {
			cancelled = true;
		};
	});

	onDestroy(() => {
		if (frame) cancelAnimationFrame(frame);
		if (revealFrame) cancelAnimationFrame(revealFrame);
	});
</script>

<pre
	bind:this={art}
	class:compact
	class="welcome-ascii"
	aria-hidden="true"
	style={`--ascii-radius: ${revealRadius}%; width: ${width}ch; height: ${rows.length * 1.08}em`}
	onpointermove={movePointer}
	onpointerleave={leavePointer}>{displayedText ?? originalText}</pre>
