export type Theme = 'dark' | 'light';

export const blogSortOptions = [
	{ value: 'date-desc', label: 'newest' },
	{ value: 'date-asc', label: 'oldest' },
	{ value: 'title-asc', label: 'title' },
	{ value: 'path-asc', label: 'path' }
] as const;
export type BlogSort = (typeof blogSortOptions)[number]['value'];
export const DEFAULT_BLOG_SORT: BlogSort = 'date-desc';
export type LineKind = 'prompt' | 'output' | 'success' | 'error' | 'muted';
export type ShellLine =
	| { kind: Exclude<LineKind, 'prompt'>; text: string }
	| { kind: 'prompt'; command: string; cwd: string }
	| { kind: 'links'; path: string; entries: RouteLinkEntry[] }
	| { kind: 'socials' }
	| { kind: 'projects' }
	| { kind: 'banner' }
	| { kind: 'help' }
	| { kind: 'not-found'; path: string };

export type BlogPostMeta = {
	path: string;
	title: string;
	description: string;
	date: string;
	tags: string[];
};

export type BlogPost = BlogPostMeta & {
	markdown: string;
	/** Server-rendered LaTeX, keyed by `mathKey`. */
	math?: Record<string, string>;
};

export type RouteLinkEntry = {
	name: string;
	directory: boolean;
	url: string;
};

export type MdBlock =
	| { type: 'heading'; level: number; text: string; html: string; id: string }
	| { type: 'paragraph'; html: string }
	| { type: 'list'; items: string[]; ordered: boolean }
	| { type: 'code'; language: string; code: string; html: string; lineCount: number }
	| { type: 'dist'; label: string; file: string; href: string }
	| { type: 'quote'; html: string }
	| { type: 'math'; html: string }
	| { type: 'hr' };
