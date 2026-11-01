/**
 * Semantic color roles shared by every UI component. Each tone maps onto a
 * Flexoki token defined on `.workspace` in `src/routes/layout.css`, so tones
 * follow the active light or dark theme automatically.
 */
export type Tone =
	| 'neutral'
	| 'muted'
	| 'accent'
	| 'info'
	| 'success'
	| 'warning'
	| 'danger'
	| 'highlight'
	| 'purple';

export const toneColor: Record<Tone, string> = {
	neutral: 'var(--tx)',
	muted: 'var(--tx-2)',
	accent: 'var(--yellow)',
	info: 'var(--cyan)',
	success: 'var(--green)',
	warning: 'var(--orange)',
	danger: 'var(--red)',
	highlight: 'var(--magenta)',
	purple: 'var(--purple)'
};

/** Heading levels map to the tone ladder used by post headings. */
export const headingTone: Record<1 | 2 | 3 | 4 | 5 | 6, Tone> = {
	1: 'accent',
	2: 'warning',
	3: 'success',
	4: 'info',
	5: 'info',
	6: 'muted'
};
