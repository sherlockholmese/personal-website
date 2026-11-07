export type CommandHelp = {
	name: string;
	command: string;
	description: string;
	group: 'start' | 'blog' | 'filesystem' | 'system' | 'display';
	completion?: 'path' | 'directory' | 'command';
	/** Works and completes, but stays out of the help panel. */
	hidden?: boolean;
	shortcutOrder?: number;
};

export const commandCatalog: CommandHelp[] = [
	{
		name: 'banner',
		command: 'banner',
		description: 'Show the Sherlock Holmes welcome banner again.',
		group: 'start'
	},
	{
		name: 'help',
		command: 'help',
		description: 'Open this command reference.',
		group: 'start',
		shortcutOrder: 6
	},
	{
		name: 'about',
		command: 'about',
		description: 'Open the about article.',
		group: 'start',
		shortcutOrder: 4
	},
	{
		name: 'info',
		command: 'info',
		description: 'Show site and stack notes.',
		group: 'start'
	},
	{
		name: 'socials',
		command: 'socials',
		description: 'Show social and contact links.',
		group: 'start',
		shortcutOrder: 5
	},
	{
		name: 'projects',
		command: 'projects',
		description: 'Show recent projects.',
		group: 'start',
		shortcutOrder: 3
	},
	{
		name: 'photography',
		command: 'photography',
		description: 'Show all photographs. Select a photo to view it full size.',
		group: 'start',
		shortcutOrder: 2
	},
	{
		name: 'home',
		command: 'home',
		description: 'Return to the welcome banner.',
		group: 'start',
		shortcutOrder: 7
	},
	{
		name: 'blog',
		command: 'blog [query]',
		description: 'Browse posts with search, sort, and markdown preview.',
		group: 'blog',
		shortcutOrder: 1
	},
	{
		name: 'cat',
		command: 'cat <file>',
		description: 'Render a post or open a photograph.',
		group: 'filesystem',
		completion: 'path'
	},
	{
		name: 'pwd',
		command: 'pwd',
		description: 'Print the current virtual directory.',
		group: 'filesystem'
	},
	{
		name: 'cd',
		command: 'cd [path]',
		description: 'Move around the virtual blog filesystem.',
		group: 'filesystem',
		completion: 'directory'
	},
	{
		name: 'ls',
		command: 'ls [path]',
		description: 'List files and folders.',
		group: 'filesystem',
		completion: 'path'
	},
	{
		name: 'tree',
		command: 'tree [path]',
		description: 'Print a folder tree.',
		group: 'filesystem',
		completion: 'directory'
	},
	{
		name: 'find',
		command: 'find [path] [-name glob]',
		description: 'Search for files by name.',
		group: 'filesystem',
		completion: 'path'
	},
	{
		name: 'grep',
		command: 'grep [-in] <pattern> [path]',
		description: 'Search post text.',
		group: 'filesystem',
		completion: 'path'
	},
	{
		name: 'head',
		command: 'head [-n lines] <file>',
		description: 'Print the first lines of a post.',
		group: 'filesystem',
		completion: 'path'
	},
	{
		name: 'tail',
		command: 'tail [-n lines] <file>',
		description: 'Print the last lines of a post.',
		group: 'filesystem',
		completion: 'path'
	},
	{
		name: 'wc',
		command: 'wc [-lwc] <file>',
		description: 'Count lines, words, and bytes in a post.',
		group: 'filesystem',
		completion: 'path'
	},
	{
		name: 'file',
		command: 'file <path>',
		description: 'Show what kind of file a path is.',
		group: 'filesystem',
		completion: 'path'
	},
	{
		name: 'echo',
		command: 'echo [text]',
		description: 'Print text.',
		group: 'system'
	},
	{
		name: 'whoami',
		command: 'whoami',
		description: 'Print the current user.',
		group: 'system'
	},
	{
		name: 'hostname',
		command: 'hostname',
		description: 'Print the host name.',
		group: 'system'
	},
	{
		name: 'uname',
		command: 'uname [-a]',
		description: 'Print system information.',
		group: 'system'
	},
	{
		name: 'date',
		command: 'date',
		description: 'Print the date and time.',
		group: 'system'
	},
	{
		name: 'uptime',
		command: 'uptime',
		description: 'Show how long this session has been open.',
		group: 'system'
	},
	{
		name: 'history',
		command: 'history',
		description: 'List the commands you have run.',
		group: 'system'
	},
	{
		name: 'which',
		command: 'which <command>',
		description: 'Show where a command lives.',
		group: 'system',
		completion: 'command'
	},
	{
		name: 'man',
		command: 'man <command>',
		description: 'Show the manual entry for a command.',
		group: 'system',
		completion: 'command'
	},
	{
		name: 'exit',
		command: 'exit',
		description: 'Close everything and return to the welcome banner.',
		group: 'system'
	},
	{
		name: 'rm',
		command: 'rm <file>',
		description: 'Remove a file. The filesystem is read-only.',
		group: 'filesystem',
		completion: 'path',
		hidden: true
	},
	{
		name: 'mv',
		command: 'mv <source> <target>',
		description: 'Move a file. The filesystem is read-only.',
		group: 'filesystem',
		completion: 'path',
		hidden: true
	},
	{
		name: 'cp',
		command: 'cp <source> <target>',
		description: 'Copy a file. The filesystem is read-only.',
		group: 'filesystem',
		completion: 'path',
		hidden: true
	},
	{
		name: 'mkdir',
		command: 'mkdir <directory>',
		description: 'Create a directory. The filesystem is read-only.',
		group: 'filesystem',
		completion: 'path',
		hidden: true
	},
	{
		name: 'touch',
		command: 'touch <file>',
		description: 'Create a file. The filesystem is read-only.',
		group: 'filesystem',
		completion: 'path',
		hidden: true
	},
	{
		name: 'sudo',
		command: 'sudo <command>',
		description: 'Run a command as root.',
		group: 'system',
		hidden: true
	},
	{
		name: 'theme',
		command: 'theme dark|light',
		description: 'Switch between Flexoki themes.',
		group: 'display'
	},
	{
		name: 'clear',
		command: 'clear',
		description: 'Clear terminal output.',
		group: 'display',
		shortcutOrder: 8
	}
];

export const helpfulCommands = commandCatalog
	.filter((command): command is CommandHelp & { shortcutOrder: number } =>
		Number.isInteger(command.shortcutOrder)
	)
	.sort((left, right) => left.shortcutOrder - right.shortcutOrder)
	.map(({ name }) => name);
