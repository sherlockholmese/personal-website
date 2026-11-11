import { marked, type TokenizerAndRendererExtension, type Tokens } from 'marked';
import { bundledLanguages, type BundledLanguage } from 'shiki/langs';
import { slugify } from './text';
import type { MdBlock, Theme } from './types';

/**
 * LaTeX math: `$inline$`, `$$display$$` within a paragraph, and `$$` blocks on their own lines.
 * The server renders each expression with KaTeX (see `server/math.ts`) and sends the HTML with the
 * post, so KaTeX never ships to the browser; rendering here only looks that HTML up.
 */
type MathToken = { type: 'math' | 'mathBlock'; raw: string; text: string; display: boolean };

const MATH_BLOCK = /^\$\$[ \t]*\n?([\s\S]+?)\n?[ \t]*\$\$[ \t]*(?:\n+|$)/;
const MATH_DISPLAY_INLINE = /^\$\$((?:\\.|[^\\$])+?)\$\$/;
// Hugs its content and is not followed by a digit, so "$5 and $10" stay text.
const MATH_INLINE = /^\$(?![\s$])((?:\\.|[^\\$\n])+?)(?<!\s)\$(?!\d)/;

const mathBlockExtension: TokenizerAndRendererExtension = {
	name: 'mathBlock',
	level: 'block',
	start: (src) => src.match(/^\$\$/m)?.index,
	tokenizer(src): MathToken | undefined {
		const match = MATH_BLOCK.exec(src);
		if (match) return { type: 'mathBlock', raw: match[0], text: match[1].trim(), display: true };
	},
	renderer: (token) => mathHtml(token.text, true)
};

const mathInlineExtension: TokenizerAndRendererExtension = {
	name: 'math',
	level: 'inline',
	start: (src) => (src.indexOf('$') >= 0 ? src.indexOf('$') : undefined),
	tokenizer(src): MathToken | undefined {
		const display = MATH_DISPLAY_INLINE.exec(src);
		const match = display ?? MATH_INLINE.exec(src);
		if (!match) return;
		return { type: 'math', raw: match[0], text: match[1].trim(), display: !!display };
	},
	renderer: (token) => mathHtml(token.text, token.display)
};

marked.use({
	breaks: true,
	extensions: [mathBlockExtension, mathInlineExtension]
});

/** Rendered math for the markdown being parsed, keyed by `mathKey`. Set only during `parseMarkdown`. */
let renderedMath: Record<string, string> = {};

export function mathKey(tex: string, display: boolean) {
	return `${display ? 'display' : 'inline'}:${tex}`;
}

/** Every math expression in the markdown, for the server to render. */
export function collectMath(tokens: MarkdownTokens) {
	const expressions = new Map<string, { tex: string; display: boolean }>();
	marked.walkTokens(tokens, (token) => {
		if (token.type !== 'math' && token.type !== 'mathBlock') return;
		const { text, display } = token as unknown as MathToken;
		expressions.set(mathKey(text, display), { tex: text, display });
	});
	return expressions;
}

// Unrendered math shows its source rather than disappearing. Display math may sit inside a `<p>`, so
// its wrapper is a span styled as a block.
function mathHtml(tex: string, display: boolean) {
	const html = renderedMath[mathKey(tex, display)];
	if (html) return display ? `<span class="ui-math-display">${html}</span>` : html;
	const source = escapeHtml(display ? `$$${tex}$$` : `$${tex}$`);
	return `<code class="ui-math-source">${source}</code>`;
}

const highlightedCodeCache = new Map<string, string>();
const highlightedCodePromises = new Map<string, Promise<string>>();
type LanguageLoader = (typeof bundledLanguages)[BundledLanguage];
const languageLoadPromises = new Map<LanguageLoader, Promise<void>>();
const loadedLanguageLoaders = new Set<LanguageLoader>();
const MAX_HIGHLIGHT_CACHE_ENTRIES = 128;
let highlighterPromise: ReturnType<typeof createCodeHighlighter> | undefined;
let lightThemeLoadPromise: Promise<void> | undefined;

const extraLanguageAliases: Record<string, BundledLanguage> = {
	nasm: 'asm'
};

export type MarkdownTokens = ReturnType<typeof marked.lexer>;

export function tokenizeMarkdown(markdown: string): MarkdownTokens {
	return marked.lexer(markdown);
}

export function parseMarkdown(
	tokens: MarkdownTokens,
	highlightedCode: Record<string, string>,
	math: Record<string, string> = {}
): MdBlock[] {
	const previousMath = renderedMath;
	renderedMath = math;
	try {
		return markdownBlocks(tokens, highlightedCode);
	} finally {
		renderedMath = previousMath;
	}
}

function markdownBlocks(
	tokens: MarkdownTokens,
	highlightedCode: Record<string, string>
): MdBlock[] {
	const usedHeadingIds = new Map<string, number>();

	return tokens.flatMap((token): MdBlock[] => {
		if (token.type === 'heading') {
			return [
				{
					type: 'heading',
					level: token.depth,
					text: token.text,
					html: inlineHtml(token.text),
					id: headingId(token.text, usedHeadingIds)
				}
			];
		}
		if (token.type === 'paragraph') {
			const dist = distBlock(token.text);
			if (dist) {
				return [dist];
			}
			return [{ type: 'paragraph', html: inlineHtml(token.text) }];
		}
		if (token.type === 'list') {
			const list = token as Tokens.List;
			const items = list.items.map((item: Tokens.ListItem) => item.text);
			return [
				{
					type: 'list',
					items: items.map((item) => inlineHtml(item.replace(/^\s*\d+\.\s+/, ''))),
					ordered: list.ordered
				}
			];
		}
		if (token.type === 'code') {
			const code = codeBlockInfo(token as Tokens.Code);
			return [
				{
					type: 'code',
					language: code.language,
					code: code.text,
					html: highlightedCode[code.key] ?? `<pre><code>${escapeHtml(code.text)}</code></pre>`,
					lineCount: code.lineCount
				}
			];
		}
		if (token.type === 'blockquote') {
			return [{ type: 'quote', html: inlineHtml(token.text) }];
		}
		if (token.type === 'hr') {
			return [{ type: 'hr' }];
		}
		if (token.type === 'mathBlock') {
			const { text } = token as unknown as MathToken;
			return [{ type: 'math', html: mathHtml(text, true) }];
		}
		return [];
	});
}

export async function highlightMarkdownCode(tokens: MarkdownTokens, theme: Theme) {
	const codeBlocks = tokens.filter((token): token is Tokens.Code => token.type === 'code');

	if (!codeBlocks.length) return {};

	const entries = await Promise.all(
		codeBlocks.map(async (block) => {
			const code = codeBlockInfo(block);
			const html = await highlightCode(code.text, code.language, theme);
			return [code.key, html] as const;
		})
	);

	return Object.fromEntries(entries);
}

export function codeKey(code: string, language: string) {
	return `${language}:${code}`;
}

function codeBlockInfo(block: Tokens.Code) {
	const language = block.lang || 'text';
	const text = normalizeCodeBlock(block.text);
	return {
		language,
		text,
		key: codeKey(text, language),
		lineCount: text.split('\n').length
	};
}

export async function highlightCode(code: string, language: string, theme: Theme) {
	const key = `${theme}:${codeKey(code, language)}`;
	const cached = highlightedCodeCache.get(key);
	if (cached) {
		refreshCacheEntry(highlightedCodeCache, key, cached);
		return cached;
	}

	const pending = highlightedCodePromises.get(key);
	if (pending) return pending;

	const promise = renderHighlightedCode(code, language, theme).then((html) => {
		highlightedCodePromises.delete(key);
		refreshCacheEntry(highlightedCodeCache, key, html);
		trimCache(highlightedCodeCache);
		return html;
	});
	highlightedCodePromises.set(key, promise);
	return promise;
}

async function renderHighlightedCode(code: string, language: string, theme: Theme) {
	try {
		highlighterPromise ??= createCodeHighlighter();
		const highlighter = await highlighterPromise;
		await loadCodeTheme(highlighter, theme);
		const normalizedLanguage = normalizeHighlightLanguage(language);
		if (normalizedLanguage !== 'text') {
			await loadCodeLanguage(highlighter, normalizedLanguage);
		}
		return highlighter.codeToHtml(code, {
			lang: normalizedLanguage,
			theme: theme === 'dark' ? 'vitesse-dark' : 'vitesse-light'
		});
	} catch {
		return `<pre><code>${escapeHtml(code)}</code></pre>`;
	}
}

async function createCodeHighlighter() {
	const [{ createHighlighterCore }, { createJavaScriptRegexEngine }, { default: vitesseDark }] =
		await Promise.all([
			import('@shikijs/core'),
			import('@shikijs/engine-javascript'),
			import('@shikijs/themes/vitesse-dark')
		]);

	return createHighlighterCore({
		engine: createJavaScriptRegexEngine(),
		langs: [],
		themes: [vitesseDark]
	});
}

async function loadCodeTheme(
	highlighter: Awaited<ReturnType<typeof createCodeHighlighter>>,
	theme: Theme
) {
	if (theme === 'dark') return;

	lightThemeLoadPromise ??= import('@shikijs/themes/vitesse-light').then(
		({ default: vitesseLight }) => highlighter.loadTheme(vitesseLight)
	);
	return lightThemeLoadPromise;
}

function normalizeHighlightLanguage(language: string): BundledLanguage | 'text' {
	const normalized = language.toLowerCase();
	if (normalized === 'text' || normalized === 'txt' || normalized === 'plaintext') return 'text';
	const resolved = extraLanguageAliases[normalized] ?? normalized;
	return resolved in bundledLanguages ? (resolved as BundledLanguage) : 'text';
}

async function loadCodeLanguage(
	highlighter: Awaited<ReturnType<typeof createCodeHighlighter>>,
	language: BundledLanguage
) {
	const loader = bundledLanguages[language];
	if (loadedLanguageLoaders.has(loader)) return;

	const existing = languageLoadPromises.get(loader);
	if (existing) return existing;

	const promise = highlighter
		.loadLanguage(loader)
		.then(() => {
			loadedLanguageLoaders.add(loader);
		})
		.finally(() => {
			languageLoadPromises.delete(loader);
		});
	languageLoadPromises.set(loader, promise);
	return promise;
}

function refreshCacheEntry(cache: Map<string, string>, key: string, value: string) {
	cache.delete(key);
	cache.set(key, value);
}

function trimCache(cache: Map<string, string>) {
	while (cache.size > MAX_HIGHLIGHT_CACHE_ENTRIES) {
		const oldestKey = cache.keys().next().value;
		if (oldestKey === undefined) return;
		cache.delete(oldestKey);
	}
}

function inlineHtml(value: string) {
	return decorateImages(marked.parseInline(value) as string);
}

function headingId(text: string, used: Map<string, number>) {
	const base = slugify(text) || 'section';
	const count = used.get(base) ?? 0;
	used.set(base, count + 1);
	return count ? `${base}-${count + 1}` : base;
}

function normalizeCodeBlock(value: string) {
	return value
		.replace(/\r\n?/g, '\n')
		.split('\n')
		.map((line) => line.replace(/[ \t]+$/g, ''))
		.join('\n')
		.replace(/^\n+|\n+$/g, '')
		.replace(/\n{3,}/g, '\n\n');
}

function escapeHtml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function distBlock(value: string): MdBlock | undefined {
	const match = value.trim().match(/^::dist\[([^\]\n]+)\]\{file=(?:"([^"\n]+)"|'([^'\n]+)')\}$/);
	if (!match) return;

	const label = match[1].trim();
	const file = (match[2] ?? match[3]).trim();
	const segments = file.split('/');

	if (
		!label ||
		file.startsWith('/') ||
		file.includes('\\') ||
		segments.some((segment) => !segment || segment === '.' || segment === '..')
	) {
		return;
	}

	return {
		type: 'dist',
		label,
		file,
		href: `/dist/${segments.map(encodeURIComponent).join('/')}`
	};
}

function decorateImages(html: string) {
	return html.replace(/<img\b([^>]*)>/g, (_match, attributes: string) => {
		const loading = /\sloading=/.test(attributes) ? '' : ' loading="lazy"';
		const decoding = /\sdecoding=/.test(attributes) ? '' : ' decoding="async"';
		return `<img${attributes}${loading}${decoding}>`;
	});
}
