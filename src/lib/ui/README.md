# Terminal UI component library

Reusable Svelte 5 components that package the site's terminal design language: the Flexoki palette, square monospace controls, a legend-style window frame, and the 760px mobile layout. The whole site is built from them, so build new pages the same way.

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

- **Tokens.** `styles/tokens.css` is the only place raw values live. Components consume semantic roles: `--surface`, `--surface-raised`, `--control-hover`, `--control-active`, `--text`, `--text-muted`, `--accent`, `--accent-hover`, `--on-accent`, `--focus`, `--link`, `--info`, `--success`, `--warning`, `--danger`, the `--border*` family, `--scrim`, and `--shadow-*`, plus the `--space-*`, `--text-*`, `--control-*`, `--motion-*`, and `--layer-*` scales. Every role is defined for dark and light, and text roles meet WCAG AA on both `--surface` and `--surface-raised`.
- **Themes.** Tokens sit on `:root` and follow `data-theme`. `Workspace` with `theme` forces a palette for a subtree.
- **Tones.** Props named `tone` accept `neutral`, `muted`, `accent`, `info`, `success`, `warning`, or `danger`. Green, orange, and red mean status. Heading colors use their own `--heading-*` roles, because they index document depth.
- **Interaction.** Pointer cursors, disabled cursors, `touch-action`, and the keyboard focus ring are set once in `tokens.css`, so components do not repeat them or remove outlines. Press feedback is immediate through `:active` with no transition into contact, and hover styles sit behind `@media (hover: hover)`.
- **Touch.** `--control-*` and `--target-min` grow to 44px below 760px and on coarse pointers, so controls reach their touch size without their own media queries.
- **Layers.** Dialogs, `Select` lists, and `Lightbox` use the browser top layer. Everything else uses a `--layer-*` token.
- **Motion.** Components reuse the `--motion-*` and `--ease-*` tokens and the `motion-rise`/`motion-fade`/`motion-drop` keyframes, and they honor `prefers-reduced-motion`.
- **Images.** Mark large images `<img data-reveal {@attach revealImage(src)} />` so they stay hidden until loaded and decoded, then fade in whole instead of painting in strips. Pass the source so a new one hides the image again.
- **Styling hooks.** Every component accepts `class`, and most forward other attributes (`aria-*`, `onclick`, and so on) to their root element. Component styles are scoped, so a parent reaches a child root with `:global(.ui-panel.my-class)`.
- **Links.** Pass internal URLs through `resolve()` from `$app/paths` before handing them to `href` props.

## Components

### Layout

| Component          | Purpose                                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `TerminalPage`     | Full-viewport page scaffold: workspace, shell padding, and a `TerminalWindow`. Start new pages here.                   |
| `TerminalWindow`   | Bordered terminal frame with a legend title, an optional close button, `actions`, and a scrolling viewport.            |
| `TerminalViewport` | Window body: scrollback (`children`), pinned content (`after`), `live` log semantics, and `contained` panels.          |
| `Workspace`        | Theme scope. Set `theme` to force a palette for a subtree.                                                             |
| `Panel`            | Titled container with a `--bg-2` header bar (`title`, `meta`). `variant`: `ruled` or `boxed`; `fill` for sized panels. |
| `PanelSection`     | Labelled row inside a panel (a cyan label column), as in the help panel.                                               |
| `Divider`          | Horizontal rule; `label` gives a `── label ────` break, plus `dashed` and `strong` options.                            |

### Typography

| Component    | Purpose                                                                                      |
| ------------ | -------------------------------------------------------------------------------------------- |
| `Heading`    | h1–h6 on the post color ladder, which indexes depth. `size` sets the visual scale.           |
| `Text`       | Body text with `tone`, `size`, `justify`, `bold`, and `measure`.                             |
| `Prose`      | Applies blog post typography to raw HTML or markdown output. `variant`: `body` or `preview`. |
| `Link`       | `inline` (blue, underlined) or `plain` (cyan listing link). `external` opens a new tab.      |
| `InlineCode` | Inline code span.                                                                            |
| `Kbd`        | Keyboard key hint.                                                                           |
| `Chevron`    | SVG disclosure chevron with `direction` and `open`.                                          |

### Terminal

| Component         | Purpose                                                                         |
| ----------------- | ------------------------------------------------------------------------------- |
| `Prompt`          | Prompt: `cwd`, then `❯ command` or an input (`children`). `inline`, `collapse`. |
| `OutputLine`      | Preformatted output colored by `kind`: output, success, warning, error, muted.  |
| `CommandChip`     | Filled command button (`onRun`) or link (`href`), as in the welcome banner.     |
| `PathBreadcrumbs` | `~ / blog / post` path navigation using `hrefFor` or `onNavigate`.              |

### Controls

| Component     | Purpose                                                                                                                           |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `Button`      | `outline`, `solid`, `ghost`, `overlay`, `danger`, or `success`; `sm` or `md`; width-stable `loading`; `block`; `<a>` with `href`. |
| `CloseButton` | Red bordered `X`.                                                                                                                 |
| `TextField`   | `inline`, `boxed`, or `bare` input with `label`, `prefix`, `actions`, `hint`, and `error`. Supports `bind:value` and `bind:ref`.  |
| `Select`      | Keyboard-accessible dropdown with typeahead; its list opens in the top layer. Supports `bind:value`.                              |
| `Checkbox`    | `[x]` / `[ ]` checkbox backed by a real input. Supports `bind:checked`.                                                           |
| `Tabs`        | Tab strip with roving focus. Supports `bind:active`; takes a `panel(id)` snippet.                                                 |

### Data display

| Component      | Purpose                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------- |
| `KeyValueList` | Rows with an accent label column (`labelWidth`), from `items` or `KeyValueRow` children. `stacked`, `muted`.  |
| `KeyValueRow`  | One rich row: `label` or a `term` snippet, with the value as children.                                        |
| `DataTable`    | Native table that stacks on mobile, with typed `columns`, a row `href`, and `cell` and `empty` snippets.      |
| `LinkList`     | `label  value` link rows; `quiet` tone; a `row` snippet for non-link rows.                                    |
| `Badge`        | `outline`, `solid`, or `text` label for exceptions such as a status code.                                     |
| `TagList`      | `#tag` text that inherits the surrounding color.                                                              |
| `CodeBlock`    | Code block with a copy button and line numbers. Takes `html`, or `highlight` for Shiki; `compact` shrinks it. |

### Feedback and overlays

| Component     | Purpose                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------- |
| `Callout`     | Message with a left rule in its tone, plus `code` badge, `headingLevel`, and `actions`.  |
| `EmptyState`  | Quiet placeholder for empty or failed lists.                                             |
| `Spinner`     | Braille-dot spinner with a status label.                                                 |
| `ProgressBar` | ASCII `[####----] 50%` meter with progressbar semantics.                                 |
| `Details`     | Native disclosure with a rotating chevron.                                               |
| `Dialog`      | Native modal `<dialog>` styled as a terminal window. Supports `bind:open`.               |
| `Lightbox`    | Full-screen image viewer on native `<dialog>`: zoom, drag to pan, placeholder, `footer`. |
| `Notice`      | Floating corner card. Supports `bind:open`.                                              |

## Adding components

Put new components in `src/lib/ui/components/` with a `@component` doc comment and scoped styles that use only tokens. Prefer token-driven sizing over a 760px media query. Export each one from `src/lib/ui/index.ts`, list it in this README, and add an example to `src/routes/ui/+page.svelte`.
