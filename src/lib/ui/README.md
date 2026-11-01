# Terminal UI component library

Reusable Svelte 5 components that package the site's terminal design language: the Flexoki palette, square monospace controls, a legend-style window frame, and the 760px mobile layout. Use them to build new pages so they look and behave like the main terminal shell.

```svelte
<script lang="ts">
	import { TerminalPage, Prompt, Panel, PanelSection, KeyValueList } from '#lib/ui/index.ts';
</script>

<TerminalPage title="sherlock@site: ~/uses">
	<Prompt command="cat uses.txt" />
	<Panel title="uses" meta="2 items">
		<PanelSection label="editor">
			<KeyValueList items={[{ label: 'main', value: 'neovim' }]} />
		</PanelSection>
	</Panel>
</TerminalPage>
```

Run `bun run dev` and open [`/ui`](http://localhost:5173/ui) for a live gallery of every component in dark and light themes at desktop and mobile widths. The gallery route only works in development; production builds return 404 for it.

## Conventions

- **Theme tokens.** Components read `--bg`, `--bg-2`, `--tx`, `--tx-2`, `--border`, `--hard-border`, `--yellow`, `--cyan`, and the other color tokens declared on `.workspace` in `src/routes/layout.css`. Render them inside `TerminalPage`, `Workspace`, or any element with the `workspace` class. The site-wide `data-theme="light"` attribute switches every component automatically.
- **Tones.** Props named `tone` accept a semantic `Tone`: `neutral`, `muted`, `accent`, `info`, `success`, `warning`, `danger`, `highlight`, or `purple`. `toneColor` maps each one to its CSS variable.
- **Mobile.** Every interactive control grows to a 40–44px touch target below 760px, and multi-column layouts stack into a single column.
- **Motion.** Components reuse the global `--motion-*` and `--ease-*` tokens and the `motion-rise`/`motion-drop` keyframes, and they honor `prefers-reduced-motion`.
- **Styling hooks.** Every component accepts `class`, and most forward other attributes (`aria-*`, `onclick`, and so on) to their root element.
- **Links.** Pass internal URLs through `resolve()` from `$app/paths` before handing them to `href` props.

## Components

### Layout

| Component        | Purpose                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| `TerminalPage`   | Full-viewport page scaffold: workspace, shell padding, and a `TerminalWindow`. Start new pages here.        |
| `TerminalWindow` | Bordered terminal frame with a legend title, an optional close button, `actions`, and a scrolling viewport. |
| `Workspace`      | Theme scope that provides the color tokens. Set `theme` to force a palette.                                 |
| `Panel`          | Titled container with a `--bg-2` header bar (`title`, `meta`). `variant`: `ruled` or `boxed`.               |
| `PanelSection`   | Labelled row inside a panel (a cyan label column), as in the help panel.                                    |
| `Divider`        | Horizontal rule; `label` gives a `── label ────` break, plus `dashed` and `strong` options.                 |

### Typography

| Component    | Purpose                                                                                      |
| ------------ | -------------------------------------------------------------------------------------------- |
| `Heading`    | h1–h6 on the post tone ladder (accent, orange, green, cyan). `size` sets the visual scale.   |
| `Text`       | Body text with `tone`, `size`, `justify`, `bold`, and `measure`.                             |
| `Prose`      | Applies blog post typography to raw HTML or markdown output. `variant`: `body` or `preview`. |
| `Link`       | `inline` (blue, underlined) or `plain` (cyan listing link). `external` opens a new tab.      |
| `InlineCode` | Inline code span.                                                                            |
| `Kbd`        | Keyboard key hint.                                                                           |

### Terminal

| Component         | Purpose                                                                        |
| ----------------- | ------------------------------------------------------------------------------ |
| `Prompt`          | Echoed prompt: `cwd`, then `❯ command`. `inline` puts both on one line.        |
| `OutputLine`      | Preformatted output colored by `kind`: output, success, warning, error, muted. |
| `CommandChip`     | Filled command button (`onRun`) or link (`href`), as in the welcome banner.    |
| `PathBreadcrumbs` | `~ / blog / post` path navigation using `hrefFor` or `onNavigate`.             |

### Controls

| Component     | Purpose                                                                                                                    |
| ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `Button`      | `outline`, `solid`, `ghost`, `danger`, or `success`; `sm` or `md`; `loading`; `block`; renders an `<a>` when given `href`. |
| `CloseButton` | Red bordered `X`.                                                                                                          |
| `TextField`   | `inline` or `boxed` input with `label`, `prefix`, `hint`, and `error`. Supports `bind:value` and `bind:ref`.               |
| `Select`      | Keyboard-accessible dropdown like the blog sort menu. Supports `bind:value`.                                               |
| `Checkbox`    | `[x]` / `[ ]` checkbox backed by a real input. Supports `bind:checked`.                                                    |
| `Tabs`        | Tab strip with roving focus. Supports `bind:active`; takes a `panel(id)` snippet.                                          |

### Data display

| Component      | Purpose                                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------- |
| `KeyValueList` | Rows with an accent label column (`labelWidth`) and an optional `value` snippet.                         |
| `DataTable`    | Responsive grid table with typed `columns`, an optional row `href`, and `cell` and `empty` snippets.     |
| `LinkList`     | `label  url` link rows, as in the socials output.                                                        |
| `Badge`        | `outline`, `solid`, or `text` label; `prefix="#"` makes a tag.                                           |
| `CodeBlock`    | Post-style code block with a copy button and line numbers. `highlight` uses Shiki; `compact` shrinks it. |

### Feedback and overlays

| Component     | Purpose                                                                         |
| ------------- | ------------------------------------------------------------------------------- |
| `Callout`     | Message with a left rule in its tone, plus optional `code` badge and `actions`. |
| `EmptyState`  | Quiet placeholder for empty or failed lists.                                    |
| `Spinner`     | Braille-dot spinner with a status label.                                        |
| `ProgressBar` | ASCII `[####----] 50%` meter with progressbar semantics.                        |
| `Details`     | Native disclosure with `▸` / `▾` markers.                                       |
| `Dialog`      | Native modal `<dialog>` styled as a terminal window. Supports `bind:open`.      |
| `Notice`      | Floating corner card like the cookie banner. Supports `bind:open`.              |

## Adding components

Put new components in `src/lib/ui/components/` with a `@component` doc comment, scoped styles that use only theme tokens, and a 760px breakpoint for mobile. Export each one from `src/lib/ui/index.ts`, list it in this README, and add an example to `src/routes/ui/+page.svelte`.
