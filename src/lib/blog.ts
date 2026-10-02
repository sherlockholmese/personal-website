import matter from 'gray-matter';
import type { BlogPost, BlogPostMeta } from '#lib/terminal/types.ts';
import aboutRaw from '../content/about.md?raw';

type Frontmatter = {
	title?: unknown;
	description?: unknown;
	date?: unknown;
	tags?: unknown;
};

const modules = import.meta.glob('/src/content/blog/**/*.mdx', {
	eager: true,
	import: 'default',
	query: '?raw'
}) as Record<string, string>;

const ABOUT_FILE_PATH = '/src/content/about.md';
const BLOG_PREVIEW_MAX_CHARS = 4200;

const posts = Object.entries(modules)
	.map(([filePath, raw]) => toPost(filePath, raw))
	.sort((a, b) => b.date.localeCompare(a.date));
const postMetas = posts.map(toPostMeta);
const postsByPath = indexPosts(posts);
const postDirectories = indexPostDirectories(posts);
const aboutPost = toPost(ABOUT_FILE_PATH, aboutRaw);

export type BlogPathResolution =
	| { kind: 'post'; path: string; post: BlogPost }
	| { kind: 'directory'; path: string }
	| { kind: 'missing'; path: string };

export function loadTerminalLayoutData() {
	return {
		posts: postMetas,
		about: aboutPost
	};
}

export function loadPost(path: string) {
	return postsByPath.get(normalizePostPath(path));
}

export function loadAboutPost() {
	return aboutPost;
}

export function resolveBlogPath(path: string): BlogPathResolution {
	const normalizedPath = normalizePostPath(path);
	const post = postsByPath.get(normalizedPath);

	if (post) {
		return { kind: 'post', path: normalizedPath, post };
	}
	if (postDirectories.has(normalizedPath)) {
		return { kind: 'directory', path: normalizedPath };
	}

	return { kind: 'missing', path: normalizedPath };
}

export function normalizePostPath(path: string) {
	return path
		.trim()
		.replace(/^\/+|\/+$/g, '')
		.replace(/\.mdx?$/, '')
		.replace(/\/index$/, '');
}

export function postPreviewMarkdown(markdown: string) {
	if (markdown.length <= BLOG_PREVIEW_MAX_CHARS) return markdown;

	const lines = markdown.split('\n');
	const previewLines: string[] = [];
	let previewLength = 0;
	let inFence = false;

	for (const line of lines) {
		const lineLength = line.length + 1;
		const fence = line.trimStart().startsWith('```');

		if (!inFence && previewLength + lineLength > BLOG_PREVIEW_MAX_CHARS) break;

		previewLines.push(line);
		previewLength += lineLength;

		if (fence) {
			inFence = !inFence;
		}
	}

	if (inFence) {
		previewLines.push('```');
	}

	return `${previewLines.join('\n').trim()}\n\n...`;
}

function toPost(filePath: string, raw: string): BlogPost {
	const { data, content } = matter(raw);
	const meta = toMeta(filePath, data as Frontmatter);

	return {
		...meta,
		markdown: content.trim()
	};
}

function toPostMeta(post: BlogPost): BlogPostMeta {
	return {
		path: post.path,
		title: post.title,
		description: post.description,
		date: post.date,
		tags: post.tags
	};
}

function toMeta(filePath: string, frontmatter: Frontmatter): BlogPostMeta {
	const path = postPath(filePath);
	const title = requiredString(frontmatter.title, 'title', filePath);
	const description = requiredString(frontmatter.description, 'description', filePath);
	const tags = requiredTags(frontmatter.tags, filePath);

	return {
		path,
		title,
		description,
		date: normalizeDate(frontmatter.date, filePath),
		tags
	};
}

function postPath(filePath: string) {
	return normalizePostPath(filePath.replace('/src/content/', ''));
}

function normalizeDate(value: unknown, filePath: string) {
	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		const year = value.getUTCFullYear();
		const month = String(value.getUTCMonth() + 1).padStart(2, '0');
		const day = String(value.getUTCDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}
	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (isIsoDate(trimmed)) return trimmed;
	}

	throw new Error(`${filePath}: frontmatter "date" must be a valid YYYY-MM-DD date`);
}

function requiredString(value: unknown, field: string, filePath: string) {
	if (typeof value === 'string' && value.trim()) return value.trim();
	throw new Error(`${filePath}: frontmatter "${field}" must be a non-empty string`);
}

function requiredTags(value: unknown, filePath: string) {
	if (
		Array.isArray(value) &&
		value.every((tag): tag is string => typeof tag === 'string' && Boolean(tag.trim()))
	) {
		return value.map((tag) => tag.trim());
	}

	throw new Error(`${filePath}: frontmatter "tags" must be an array of non-empty strings`);
}

function isIsoDate(value: string) {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) return false;

	const [, year, month, day] = match;
	const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
	return (
		date.getUTCFullYear() === Number(year) &&
		date.getUTCMonth() === Number(month) - 1 &&
		date.getUTCDate() === Number(day)
	);
}

function indexPosts(entries: BlogPost[]) {
	const index = new Map<string, BlogPost>();

	for (const post of entries) {
		if (index.has(post.path)) {
			throw new Error(`Duplicate blog path: ${post.path}`);
		}
		index.set(post.path, post);
	}

	return index;
}

function indexPostDirectories(entries: BlogPost[]) {
	const directories = new Set<string>();

	for (const post of entries) {
		const parts = post.path.split('/');
		for (let index = 1; index < parts.length; index += 1) {
			directories.add(parts.slice(0, index).join('/'));
		}
	}

	return directories;
}
