<!--
	@component
	Full-viewport page scaffold: the themed workspace, the outer shell padding, and a
	`TerminalWindow`. Start new standalone pages with this so they share the main
	terminal's frame, safe-area handling, and 760px mobile layout.

	```svelte
	<TerminalPage title="sherlock@site: ~/uses">
		<Prompt command="cat uses.txt" />
		<KeyValueList items={[{ label: 'editor', value: 'neovim' }]} />
	</TerminalPage>
	```
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Theme } from '../types';
	import TerminalWindow from './TerminalWindow.svelte';
	import Workspace from './Workspace.svelte';

	let {
		title,
		theme,
		onClose,
		closeLabel,
		padded = true,
		actions,
		children
	}: {
		title: string;
		theme?: Theme;
		onClose?: () => void;
		closeLabel?: string;
		padded?: boolean;
		actions?: Snippet;
		children: Snippet;
	} = $props();
</script>

<Workspace as="main" {theme} class="terminal-workspace">
	<section class="terminal-shell">
		<TerminalWindow {title} {onClose} {closeLabel} {padded} {actions}>
			{@render children()}
		</TerminalWindow>
	</section>
</Workspace>
