/**
 * Semantic color roles shared by every UI component. Each tone maps onto a token in
 * `styles/tokens.css`, so tones follow the active theme automatically.
 */
export type Tone = 'neutral' | 'muted' | 'accent' | 'info' | 'success' | 'warning' | 'danger';

export const toneColor: Record<Tone, string> = {
	neutral: 'var(--text)',
	muted: 'var(--text-muted)',
	accent: 'var(--accent)',
	info: 'var(--info)',
	success: 'var(--success)',
	warning: 'var(--warning)',
	danger: 'var(--danger)'
};

/** Heading colors index depth in a document; they carry no status meaning. */
export const headingColor: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
	1: 'var(--accent)',
	2: 'var(--heading-2)',
	3: 'var(--heading-3)',
	4: 'var(--info)',
	5: 'var(--info)',
	6: 'var(--text-muted)'
};
