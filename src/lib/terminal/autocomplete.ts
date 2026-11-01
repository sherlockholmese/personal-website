import { listEntries, normalizePath, type FileSystem, type FsEntry } from './filesystem';
import { commandCatalog } from './help';

const commands = commandCatalog.map((entry) => entry.name);
const commandsByName = new Map(commandCatalog.map((entry) => [entry.name, entry]));

export type CompletionResult = {
	input: string;
	cursor: number;
	candidates: string[];
	/** Where a candidate replaces the input; set when there are candidates to choose from. */
	tokenStart?: number;
	tokenEnd?: number;
	appendSpace?: boolean;
};

/** An open completion list. `input` and `cursor` hold what was typed before cycling. */
export type CompletionMenu = Required<CompletionResult> & { activeIndex: number };

/** Fills a candidate into the typed input. `commit` adds the separator after a finished word. */
export function applyCompletion(menu: CompletionMenu, candidate: string, commit: boolean) {
	const before = menu.input.slice(0, menu.tokenStart);
	const after = menu.input.slice(menu.tokenEnd);
	const finished = menu.appendSpace || !candidate.endsWith('/');
	const replacement = `${candidate}${commit && finished && !/^\s/.test(after) ? ' ' : ''}`;
	return { input: `${before}${replacement}${after}`, cursor: before.length + replacement.length };
}

/** The part of a candidate worth showing: its last path segment. */
export function completionLabel(candidate: string) {
	return candidate.match(/[^/]+\/?$/)?.[0] ?? candidate;
}

export function completeTerminalInput(
	input: string,
	cursor: number,
	cwd: string,
	fileSystem: FileSystem
): CompletionResult | undefined {
	const beforeCursor = input.slice(0, cursor);
	const leadingWhitespace = beforeCursor.match(/^\s*/)?.[0] ?? '';
	const commandFragment = beforeCursor.slice(leadingWhitespace.length);

	if (!/\s/.test(commandFragment)) {
		const matches = commands.filter((command) => command.startsWith(commandFragment));
		return completeToken(input, leadingWhitespace.length, cursor, matches, commandFragment, true);
	}

	const command = beforeCursor.trimStart().split(/\s+/, 1)[0];
	const commandDefinition = commandsByName.get(command);
	if (!commandDefinition?.completion) return undefined;

	const tokenMatch = beforeCursor.match(/(?:^|\s)(\S*)$/);
	if (!tokenMatch) return undefined;

	const token = tokenMatch[1];
	const tokenStart = cursor - token.length;
	if (commandDefinition.completion === 'command') {
		const matches = commands.filter((name) => name.startsWith(token));
		return completeToken(input, tokenStart, cursor, matches, token, true);
	}

	const lastSlash = token.lastIndexOf('/');
	const directoryToken = lastSlash >= 0 ? token.slice(0, lastSlash + 1) : '';
	const fragment = token.slice(lastSlash + 1);
	const directoryPath = normalizePath(directoryToken || '.', cwd);
	const entries = listEntries(fileSystem, directoryPath).filter(
		(entry) => commandDefinition.completion !== 'directory' || entry.type === 'directory'
	);
	const matches = entries
		.filter((entry) => entry.name.startsWith(fragment))
		.map((entry) => pathCompletion(directoryToken, entry));

	return completeToken(input, tokenStart, cursor, matches, token, false);
}

function pathCompletion(directoryToken: string, entry: FsEntry) {
	return `${directoryToken}${entry.name}${entry.type === 'directory' ? '/' : ''}`;
}

function completeToken(
	input: string,
	tokenStart: number,
	cursor: number,
	matches: string[],
	currentToken: string,
	appendSpace: boolean
): CompletionResult | undefined {
	if (!matches.length) return undefined;

	const tokenEnd = findTokenEnd(input, cursor);
	if (matches.length === 1) {
		const match = matches[0];
		const directory = match.endsWith('/');
		const needsSpace = appendSpace || !directory;
		const suffix = needsSpace && !/\s/.test(input[tokenEnd] ?? '') ? ' ' : '';
		const replacement = `${match}${suffix}`;
		const nextInput = `${input.slice(0, tokenStart)}${replacement}${input.slice(tokenEnd)}`;

		return {
			input: nextInput,
			cursor: tokenStart + replacement.length,
			candidates: []
		};
	}

	const commonPrefix = longestCommonPrefix(matches);
	if (commonPrefix.length > currentToken.length) {
		const nextInput = `${input.slice(0, tokenStart)}${commonPrefix}${input.slice(tokenEnd)}`;
		return {
			input: nextInput,
			cursor: tokenStart + commonPrefix.length,
			candidates: []
		};
	}

	return {
		input,
		cursor,
		candidates: matches,
		tokenStart,
		tokenEnd,
		appendSpace
	};
}

function findTokenEnd(input: string, cursor: number) {
	const nextWhitespace = input.slice(cursor).search(/\s/);
	return nextWhitespace === -1 ? input.length : cursor + nextWhitespace;
}

function longestCommonPrefix(values: string[]) {
	return values.slice(1).reduce((prefix, value) => {
		let index = 0;
		while (index < prefix.length && prefix[index] === value[index]) {
			index += 1;
		}
		return prefix.slice(0, index);
	}, values[0] ?? '');
}
