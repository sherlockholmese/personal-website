import katex from 'katex';
import { collectMath, tokenizeMarkdown } from '#lib/terminal/markdown.ts';

/**
 * Renders a post's LaTeX with KaTeX, keyed by `mathKey`, for `parseMarkdown` to place. Rendering
 * happens here so the browser receives only HTML and KaTeX's stylesheet, never KaTeX itself.
 */
export function renderMath(markdown: string): Record<string, string> {
	const rendered: Record<string, string> = {};
	for (const [key, { tex, display }] of collectMath(tokenizeMarkdown(markdown))) {
		// Invalid TeX renders as KaTeX's inline error text rather than failing the page.
		rendered[key] = katex.renderToString(tex, {
			displayMode: display,
			throwOnError: false,
			errorColor: 'var(--danger)',
			output: 'htmlAndMathml'
		});
	}
	return rendered;
}

/** Only the entries the given markdown uses, such as a preview cut from a longer post. */
export function mathFor(markdown: string, rendered: Record<string, string> = {}) {
	return Object.fromEntries(
		[...collectMath(tokenizeMarkdown(markdown)).keys()]
			.filter((key) => key in rendered)
			.map((key) => [key, rendered[key]])
	);
}
