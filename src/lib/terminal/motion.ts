import { cubicIn } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';

// Mirrors the --motion-* tokens in layout.css for transitions Svelte has to run.
export const MOTION_EXIT_MS = 120;
export const MOTION_RISE_PX = 6;

export function prefersReducedMotion() {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export const planeExit: (node: Element) => TransitionConfig = () => ({
	duration: prefersReducedMotion() ? 0 : MOTION_EXIT_MS,
	easing: cubicIn,
	css: (t) => `opacity: ${t}; transform: translateY(${(1 - t) * MOTION_RISE_PX}px)`
});
