/**
 * Terminal UI component library.
 *
 * Components read the semantic tokens in `styles/tokens.css`.
 * See `src/lib/ui/README.md` for usage, and `/ui` in development for a live gallery.
 */

// Layout
export { default as Workspace } from './components/Workspace.svelte';
export { default as TerminalPage } from './components/TerminalPage.svelte';
export { default as TerminalWindow } from './components/TerminalWindow.svelte';
export { default as TerminalViewport } from './components/TerminalViewport.svelte';
export { default as Panel } from './components/Panel.svelte';
export { default as PanelSection } from './components/PanelSection.svelte';
export { default as Divider } from './components/Divider.svelte';

// Typography
export { default as Heading } from './components/Heading.svelte';
export { default as Text } from './components/Text.svelte';
export { default as Prose } from './components/Prose.svelte';
export { default as Link } from './components/Link.svelte';
export { default as InlineCode } from './components/InlineCode.svelte';
export { default as Kbd } from './components/Kbd.svelte';
export { default as Chevron } from './components/Chevron.svelte';

// Terminal
export { default as Prompt } from './components/Prompt.svelte';
export { default as OutputLine } from './components/OutputLine.svelte';
export { default as CommandChip } from './components/CommandChip.svelte';
export { default as PathBreadcrumbs } from './components/PathBreadcrumbs.svelte';

// Controls
export { default as Button } from './components/Button.svelte';
export { default as CloseButton } from './components/CloseButton.svelte';
export { default as TextField } from './components/TextField.svelte';
export { default as Select } from './components/Select.svelte';
export { default as Checkbox } from './components/Checkbox.svelte';
export { default as Tabs } from './components/Tabs.svelte';

// Data display
export { default as KeyValueList } from './components/KeyValueList.svelte';
export { default as KeyValueRow } from './components/KeyValueRow.svelte';
export { default as DataTable } from './components/DataTable.svelte';
export { default as LinkList } from './components/LinkList.svelte';
export { default as Badge } from './components/Badge.svelte';
export { default as TagList } from './components/TagList.svelte';
export { default as CodeBlock } from './components/CodeBlock.svelte';

// Feedback and overlays
export { default as Callout } from './components/Callout.svelte';
export { default as EmptyState } from './components/EmptyState.svelte';
export { default as Spinner } from './components/Spinner.svelte';
export { default as ProgressBar } from './components/ProgressBar.svelte';
export { default as Details } from './components/Details.svelte';
export { default as Dialog } from './components/Dialog.svelte';
export { default as Lightbox } from './components/Lightbox.svelte';
export { default as Notice } from './components/Notice.svelte';

export { toneColor, headingColor } from './tone';
export { revealImage } from './reveal';
export type {
	DataTableColumn,
	KeyValueItem,
	LightboxImage,
	LinkItem,
	SelectOption,
	Size,
	TabItem,
	Theme,
	Tone
} from './types';
