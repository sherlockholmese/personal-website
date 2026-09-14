import {
	photographyCollections,
	type Photograph,
	type PhotographyCollection
} from '../../content/photography';
import { photographFileName } from '../photography';
import { commandCatalog } from './help';
import type { BlogPostMeta } from './types';

export const ROOT_DIRECTORY = '/';
export const BIN_DIRECTORY = '/bin';
export const HOME_DIRECTORY = '/home/sherlock';

export type FileSystem = {
	files: Map<string, VirtualFile>;
	directories: Set<string>;
	entriesByDirectory: Map<string, FsEntry[]>;
};

export type VirtualFile =
	| { kind: 'post'; post: BlogPostMeta }
	| { kind: 'photograph'; collection: PhotographyCollection; photograph: Photograph }
	| { kind: 'executable'; command: string };

export type FsEntry = {
	name: string;
	path: string;
	type: 'file' | 'directory';
};

export function createFileSystem(posts: BlogPostMeta[]): FileSystem {
	const files = new Map<string, VirtualFile>();
	const directories = new Set<string>([ROOT_DIRECTORY, BIN_DIRECTORY, '/home', HOME_DIRECTORY]);

	for (const command of [
		...commandCatalog.filter(({ executable }) => executable).map(({ name }) => name),
		'sh'
	]) {
		files.set(`${BIN_DIRECTORY}/${command}`, { kind: 'executable', command });
	}

	for (const post of posts) {
		const filePath = filePathFromPostPath(post.path);
		files.set(filePath, { kind: 'post', post });
		ensureDirectoriesForFile(filePath, directories);
	}

	directories.add(`${HOME_DIRECTORY}/photography`);
	for (const collection of photographyCollections) {
		directories.add(`${HOME_DIRECTORY}/photography/${collection.slug}`);
		for (const photograph of collection.photographs) {
			const filePath = `${HOME_DIRECTORY}/photography/${collection.slug}/${photographFileName(photograph)}`;
			files.set(filePath, { kind: 'photograph', collection, photograph });
			ensureDirectoriesForFile(filePath, directories);
		}
	}

	return {
		files,
		directories,
		entriesByDirectory: indexDirectoryEntries(files, directories)
	};
}

export function normalizePath(target: string, cwd: string) {
	if (!target) return cwd;
	const expanded = expandHome(target);
	const baseParts = expanded.startsWith('/') ? [] : cwd.split('/').filter(Boolean);
	const rawParts = expanded.split('/');
	const parts = [...baseParts];

	for (const part of rawParts) {
		if (!part || part === '.') continue;
		if (part === '..') {
			parts.pop();
			continue;
		}
		parts.push(part);
	}

	return `/${parts.join('/')}`.replace(/\/$/, '') || ROOT_DIRECTORY;
}

export function formatPromptPath(path: string) {
	if (path === HOME_DIRECTORY) return '~';
	if (path.startsWith(`${HOME_DIRECTORY}/`)) {
		return `~/${path.slice(HOME_DIRECTORY.length + 1)}`;
	}
	return path || ROOT_DIRECTORY;
}

export function resolveEntry(fileSystem: FileSystem, path: string) {
	if (fileSystem.directories.has(path)) {
		return { type: 'directory' as const, path };
	}

	const file = resolveFile(fileSystem, path);
	if (file) {
		return { type: 'file' as const, ...file };
	}

	return { type: 'missing' as const, path };
}

export function resolveFile(fileSystem: FileSystem, path: string) {
	if (fileSystem.files.has(path)) {
		return { filePath: path, ...fileSystem.files.get(path)! };
	}
	if (!path.endsWith('.md')) {
		const candidate = `${path}.md`;
		if (fileSystem.files.has(candidate)) {
			return { filePath: candidate, ...fileSystem.files.get(candidate)! };
		}
	}

	return undefined;
}

export function listEntries(fileSystem: FileSystem, directoryPath: string) {
	return fileSystem.entriesByDirectory.get(directoryPath) ?? [];
}

export function buildTree(fileSystem: FileSystem, directoryPath: string, prefix = ''): string[] {
	const entries = listEntries(fileSystem, directoryPath);
	return entries.flatMap((entry, index) => {
		const last = index === entries.length - 1;
		const branch = last ? '└── ' : '├── ';
		const nextPrefix = prefix + (last ? '    ' : '│   ');
		return [
			`${prefix}${branch}${entry.name}`,
			...(entry.type === 'directory' ? buildTree(fileSystem, entry.path, nextPrefix) : [])
		];
	});
}

export function filePathFromPostPath(postPath: string) {
	return `${HOME_DIRECTORY}/${postPath}.md`;
}

export function postPathFromFilePath(filePath: string) {
	return toHomeRelative(filePath).replace(/\.md$/, '');
}

export function toHomeRelative(path: string) {
	if (path === HOME_DIRECTORY) return '';
	if (path.startsWith(`${HOME_DIRECTORY}/`)) {
		return path.slice(HOME_DIRECTORY.length + 1);
	}
	return path.replace(/^\/+/, '');
}

function expandHome(target: string) {
	if (target === '~') return HOME_DIRECTORY;
	if (target.startsWith('~/')) return `${HOME_DIRECTORY}/${target.slice(2)}`;
	return target;
}

function ensureDirectoriesForFile(filePath: string, directories: Set<string>) {
	const parts = filePath.split('/').filter(Boolean);
	for (let index = 1; index < parts.length; index += 1) {
		const dir = `/${parts.slice(0, index).join('/')}`;
		directories.add(dir);
	}
}

function indexDirectoryEntries(
	files: Map<string, VirtualFile>,
	directories: Set<string>
): Map<string, FsEntry[]> {
	const entriesByDirectory = new Map<string, FsEntry[]>();

	const addEntry = (directoryPath: string, entry: FsEntry) => {
		const entries = entriesByDirectory.get(directoryPath);
		if (entries) {
			entries.push(entry);
		} else {
			entriesByDirectory.set(directoryPath, [entry]);
		}
	};

	for (const directoryPath of directories) {
		if (directoryPath === ROOT_DIRECTORY) continue;
		addEntry(parentPath(directoryPath), {
			name: pathName(directoryPath),
			path: directoryPath,
			type: 'directory'
		});
	}

	for (const filePath of files.keys()) {
		addEntry(parentPath(filePath), {
			name: pathName(filePath),
			path: filePath,
			type: 'file'
		});
	}

	for (const entries of entriesByDirectory.values()) {
		entries.sort((left, right) => left.name.localeCompare(right.name));
	}

	return entriesByDirectory;
}

function parentPath(path: string) {
	const index = path.lastIndexOf('/');
	return index <= 0 ? ROOT_DIRECTORY : path.slice(0, index);
}

function pathName(path: string) {
	return path.slice(path.lastIndexOf('/') + 1);
}
