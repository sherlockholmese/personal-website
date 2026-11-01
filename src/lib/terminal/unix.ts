import { TERMINAL_TITLE } from '#lib/site.ts';
import { formatPostDate } from './date';
import {
	BIN_DIRECTORY,
	formatPromptPath,
	listEntries,
	normalizePath,
	resolveEntry,
	type FileSystem,
	type FsEntry
} from './filesystem';
import { commandCatalog } from './help';
import type { BlogPostMeta, LineKind } from './types';

export type UnixLine = { text: string; kind?: Exclude<LineKind, 'prompt'> };

export type UnixContext = {
	cwd: string;
	fileSystem: FileSystem;
	/** Commands entered this session, oldest first. */
	commandLog: readonly string[];
	startedAt: number;
	readPost: (post: BlogPostMeta) => Promise<string>;
};

type UnixResult = UnixLine[] | Promise<UnixLine[]>;
type UnixCommand = (args: string[], context: UnixContext) => UnixResult;

const USER = 'sherlock';
const DEFAULT_LINE_COUNT = 10;
const MAX_GREP_MATCHES = 40;
const GREP_CONTEXT_BEFORE = 40;
const GREP_CONTEXT_AFTER = 80;

const commandsByName = new Map(commandCatalog.map((entry) => [entry.name, entry]));
const output = (...lines: string[]): UnixLine[] => lines.map((text) => ({ text }));
const failure = (text: string): UnixLine[] => [{ text, kind: 'error' }];

/** Splits a command line on spaces, keeping quoted text together. */
export function tokenizeCommand(command: string) {
	return [...command.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map(
		(match) => match[1] ?? match[2] ?? match[3]
	);
}

function splitOptions(args: string[]) {
	const flags = args.filter((arg) => /^-./.test(arg));
	const operands = args.filter((arg) => !/^-./.test(arg));
	return { flags: flags.flatMap((flag) => [...flag.slice(1)]), operands };
}

/** Formats `ls` output. Returns an error line for unknown options. */
export function formatListing(fileSystem: FileSystem, entries: FsEntry[], flags: string[]) {
	const unknown = flags.find((flag) => !'lah1'.includes(flag));
	if (unknown) return failure(`ls: invalid option -- '${unknown}'`);

	const shown = flags.includes('a')
		? [
				{ name: '.', type: 'directory' as const },
				{ name: '..', type: 'directory' as const },
				...entries
			]
		: entries;
	if (!flags.includes('l')) return output(...shown.map((entry) => entry.name));

	return output(
		...shown.map((entry) => {
			const file = 'path' in entry ? resolveEntry(fileSystem, entry.path) : undefined;
			const date = file?.type === 'file' && file.kind === 'post' ? file.post.date : '';
			const executable = file?.type === 'file' && file.kind === 'executable';
			const mode =
				entry.type === 'directory' ? 'drwxr-xr-x' : executable ? '-rwxr-xr-x' : '-rw-r--r--';
			return `${mode}  ${USER}  ${(date ? formatPostDate(date) : '').padEnd(10)}  ${entry.name}`;
		})
	);
}

/** Resolves an operand to a readable post, or returns the error to print. */
function readablePost(name: string, target: string, context: UnixContext) {
	const entry = resolveEntry(context.fileSystem, normalizePath(target, context.cwd));
	if (entry.type === 'missing') return failure(`${name}: ${target}: No such file or directory`);
	if (entry.type === 'directory') return failure(`${name}: ${target}: Is a directory`);
	if (entry.kind !== 'post') return failure(`${name}: ${target}: Binary file`);
	return entry.post;
}

async function postLines(name: string, target: string, context: UnixContext) {
	const post = readablePost(name, target, context);
	if (Array.isArray(post)) return post;
	try {
		return { text: await context.readPost(post) };
	} catch {
		return failure(`${name}: ${target}: Could not read file`);
	}
}

function lineWindow(name: 'head' | 'tail', pick: (lines: string[], count: number) => string[]) {
	return async (args: string[], context: UnixContext) => {
		let count = DEFAULT_LINE_COUNT;
		const operands: string[] = [];
		for (let index = 0; index < args.length; index += 1) {
			const arg = args[index];
			const inline = arg.match(/^-(?:n)?(\d+)$/);
			if (inline) count = Number(inline[1]);
			else if (arg === '-n') count = Number(args[(index += 1)]);
			else operands.push(arg);
		}
		if (!Number.isInteger(count) || count < 0) return failure(`${name}: invalid number of lines`);
		if (!operands.length) return failure(`${name}: missing file operand`);

		const content = await postLines(name, operands[0], context);
		if (Array.isArray(content)) return content;
		return output(...pick(content.text.split('\n'), count));
	};
}

async function wc(args: string[], context: UnixContext) {
	const { flags, operands } = splitOptions(args);
	if (!operands.length) return failure('wc: missing file operand');

	const lines: UnixLine[] = [];
	for (const target of operands) {
		const content = await postLines('wc', target, context);
		if (Array.isArray(content)) {
			lines.push(...content);
			continue;
		}
		const counts = {
			l: content.text.split('\n').length,
			w: content.text.split(/\s+/).filter(Boolean).length,
			c: new TextEncoder().encode(content.text).length
		};
		const selected = flags.length
			? flags.filter((flag) => flag in counts)
			: (['l', 'w', 'c'] as const);
		const columns = selected.map((flag) => String(counts[flag as keyof typeof counts]).padStart(7));
		lines.push(...output(`${columns.join(' ')} ${target}`));
	}
	return lines;
}

function postsBelow(context: UnixContext, path: string): { post: BlogPostMeta; path: string }[] {
	return listEntries(context.fileSystem, path).flatMap((entry) => {
		if (entry.type === 'directory') return postsBelow(context, entry.path);
		const file = resolveEntry(context.fileSystem, entry.path);
		return file.type === 'file' && file.kind === 'post'
			? [{ post: file.post, path: entry.path }]
			: [];
	});
}

async function grep(args: string[], context: UnixContext) {
	const { flags, operands } = splitOptions(args);
	const [pattern, target = '.'] = operands;
	if (!pattern) return failure('usage: grep [-in] <pattern> [path]');

	let matcher: RegExp;
	try {
		matcher = new RegExp(pattern, flags.includes('i') ? 'i' : '');
	} catch {
		return failure(`grep: invalid pattern: ${pattern}`);
	}

	const path = normalizePath(target, context.cwd);
	const entry = resolveEntry(context.fileSystem, path);
	if (entry.type === 'missing') return failure(`grep: ${target}: No such file or directory`);
	if (entry.type === 'file' && entry.kind !== 'post')
		return failure(`grep: ${target}: Binary file`);

	const posts =
		entry.type === 'file'
			? [{ post: entry.post, path: entry.filePath }]
			: postsBelow(context, path);
	let contents: string[];
	try {
		contents = await Promise.all(posts.map(({ post }) => context.readPost(post)));
	} catch {
		return failure('grep: could not read posts');
	}

	const matches: string[] = [];
	contents.forEach((content, postIndex) => {
		content.split('\n').forEach((line, lineIndex) => {
			const found = line.search(matcher);
			if (found < 0) return;
			const start = Math.max(0, found - GREP_CONTEXT_BEFORE);
			const end = found + GREP_CONTEXT_AFTER;
			const excerpt = `${start ? '...' : ''}${line.slice(start, end).trim()}${end < line.length ? '...' : ''}`;
			const label = entry.type === 'file' ? '' : `${formatPromptPath(posts[postIndex].path)}:`;
			matches.push(`${label}${flags.includes('n') ? `${lineIndex + 1}:` : ''}${excerpt}`);
		});
	});

	const lines = output(...matches.slice(0, MAX_GREP_MATCHES));
	if (matches.length > MAX_GREP_MATCHES) {
		lines.push({ text: `${matches.length - MAX_GREP_MATCHES} more matches`, kind: 'muted' });
	}
	return lines;
}

function find(args: string[], context: UnixContext) {
	const nameFlag = args.indexOf('-name');
	const pattern = nameFlag >= 0 ? args[nameFlag + 1] : undefined;
	if (nameFlag >= 0 && !pattern) return failure("find: missing argument to '-name'");

	const target =
		args.find((arg, index) => !arg.startsWith('-') && (nameFlag < 0 || index !== nameFlag + 1)) ??
		'.';
	const root = normalizePath(target, context.cwd);
	const entry = resolveEntry(context.fileSystem, root);
	if (entry.type === 'missing') return failure(`find: '${target}': No such file or directory`);

	const glob =
		pattern &&
		new RegExp(
			`^${pattern
				.replace(/[.+^${}()|[\]\\]/g, '\\$&')
				.replaceAll('*', '.*')
				.replaceAll('?', '.')}$`
		);
	const walk = (path: string, shown: string): string[] => [
		...(!glob || glob.test(path.slice(path.lastIndexOf('/') + 1)) ? [shown] : []),
		...listEntries(context.fileSystem, path).flatMap((child) =>
			walk(child.path, `${shown}/${child.name}`)
		)
	];
	return output(...walk(root, target.replace(/\/$/, '')));
}

function fileType(args: string[], context: UnixContext) {
	if (!args.length) return failure('file: missing file operand');
	return args.flatMap((target) => {
		const entry = resolveEntry(context.fileSystem, normalizePath(target, context.cwd));
		if (entry.type === 'missing') return failure(`${target}: cannot open: No such file`);
		if (entry.type === 'directory') return output(`${target}: directory`);
		const type = { post: 'Markdown document', photograph: 'image data', executable: 'executable' };
		return output(`${target}: ${type[entry.kind]}`);
	});
}

function man(args: string[]) {
	const [name] = args;
	if (!name) return failure('What manual page do you want?');
	const entry = commandsByName.get(name);
	if (!entry) return failure(`No manual entry for ${name}`);
	return output('NAME', `  ${entry.name} - ${entry.description}`, 'SYNOPSIS', `  ${entry.command}`);
}

function which(args: string[]) {
	if (!args.length) return failure('usage: which <command>');
	return args.flatMap((name) =>
		commandsByName.has(name) ? output(`${BIN_DIRECTORY}/${name}`) : failure(`${name} not found`)
	);
}

function uname(args: string[]) {
	return output(args.includes('-a') ? `SherlockOS ${TERMINAL_TITLE} web browser` : 'SherlockOS');
}

function uptime(_args: string[], context: UnixContext) {
	const minutes = Math.floor((Date.now() - context.startedAt) / 60000);
	return output(`up ${minutes} min, 1 user`);
}

function readOnly(name: string, action: string): UnixCommand {
	return (args) => {
		const { operands } = splitOptions(args);
		if (!operands.length) return failure(`${name}: missing operand`);
		return failure(`${name}: cannot ${action} '${operands[0]}': Read-only file system`);
	};
}

const unixCommands: Record<string, UnixCommand> = {
	echo: (args) => output(args.join(' ')),
	whoami: () => output(USER),
	hostname: () => output(TERMINAL_TITLE),
	uname,
	date: () => output(new Date().toString()),
	uptime,
	history: (_args, { commandLog }) =>
		output(...commandLog.map((command, index) => `${String(index + 1).padStart(5)}  ${command}`)),
	which,
	man,
	find,
	file: fileType,
	head: lineWindow('head', (lines, count) => lines.slice(0, count)),
	tail: lineWindow('tail', (lines, count) => (count ? lines.slice(-count) : [])),
	wc,
	grep,
	sudo: () => failure(`${USER} is not in the sudoers file. This incident will be reported.`),
	rm: readOnly('rm', 'remove'),
	mv: readOnly('mv', 'move'),
	cp: readOnly('cp', 'copy'),
	mkdir: readOnly('mkdir', 'create directory'),
	touch: readOnly('touch', 'touch')
};

/** Runs a command from the table above. Returns undefined when the command is unknown. */
export function runUnixCommand(name: string, args: string[], context: UnixContext) {
	return Object.hasOwn(unixCommands, name) ? unixCommands[name](args, context) : undefined;
}
