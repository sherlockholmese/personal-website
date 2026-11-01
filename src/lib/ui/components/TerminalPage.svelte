<!--
	@component
	Full-viewport page scaffold: the workspace, the outer shell padding, and a
	`TerminalWindow`. Start new standalone pages with this so they share the main
	terminal's frame, safe-area handling, and 760px mobile layout.

	```svelte
	<TerminalPage title="sherlock@site: ~/uses">
		<Prompt command="cat uses.txt" />
		<KeyValueList items={[{ label: 'editor', value: 'neovim' }]} />
	</TerminalPage>
	```

	`keyboardOpen` and `viewportHeight` let an interactive page fit the visual viewport
	while an on-screen keyboard is showing.
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
		closeRef = $bindable<HTMLButtonElement | undefined>(),
		padded = true,
		keyboardOpen = false,
		viewportHeight,
		actions,
		children
	}: {
		title: string;
		theme?: Theme;
		onClose?: () => void;
		closeLabel?: string;
		closeRef?: HTMLButtonElement;
		padded?: boolean;
		keyboardOpen?: boolean;
		viewportHeight?: number;
		actions?: Snippet;
		children: Snippet;
	} = $props();
</script>

<Workspace
	as="main"
	{theme}
	class={['ui-page', keyboardOpen && 'ui-page-keyboard'].filter(Boolean).join(' ')}
	style={viewportHeight ? `--ui-page-height: ${viewportHeight}px` : undefined}
>
	<section class="ui-page-shell">
		<TerminalWindow {title} {onClose} {closeLabel} bind:closeRef {padded} {actions}>
			{@render children()}
		</TerminalWindow>
	</section>
</Workspace>

<style>
	:global(.ui-page) {
		display: flex;
		width: 100vw;
		height: 100dvh;
		min-height: 100dvh;
		flex-direction: column;
		overflow: hidden;
	}

	.ui-page-shell {
		display: grid;
		min-height: 0;
		flex: 1;
		grid-template-columns: minmax(0, 1fr);
		padding: calc(var(--space-3) + var(--space-half));
		background: var(--surface);
	}

	@media (max-width: 760px) {
		:global(.ui-page.ui-page-keyboard) {
			height: var(--ui-page-height, 100dvh);
			min-height: var(--ui-page-height, 100dvh);
		}

		.ui-page-shell {
			padding: max(26px, calc(env(safe-area-inset-top) + var(--space-3)))
				max(var(--space-2), env(safe-area-inset-right)) 0
				max(var(--space-2), env(safe-area-inset-left));
		}

		:global(.ui-page-keyboard) .ui-page-shell {
			padding-top: max(var(--space-3), env(safe-area-inset-top));
		}
	}
</style>
