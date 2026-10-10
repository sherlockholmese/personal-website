# Repository Guidelines

## Stack and Commands

This is a Bun-managed SvelteKit 3 application using Svelte 5 runes, TypeScript, Tailwind CSS 4, and `@sveltejs/adapter-node`. SvelteKit configuration lives in `vite.config.ts`; shared imports use the `#lib` subpath alias declared in `package.json`. Node-based tooling requires Node 22.17 or later.

- `bun install --frozen-lockfile`: install the locked dependency set.
- `bun run dev`: start the Vite development server.
- `bun run dev -- --open`: start development and open the site.
- `bun run check`: sync SvelteKit types and run `svelte-check`.
- `bun run check:watch`: run Svelte checks continuously.
- `bun run lint`: run Prettier checks, then ESLint.
- `bun run format`: apply Prettier formatting.
- `bun run build`: create the Node production build in `build/`.
- `bun run preview`: serve the production build locally.
- `docker compose up --build`: build and run the production container on port 3000.

There is no test framework or single-test command. Use `bun run check && bun run lint` as the required validation gate. Run `bun run build` after changing routes, server handlers/loaders, adapters, Vite configuration, or production behavior.

## Application Architecture

`src/lib/TerminalWebsite.svelte` is the main application shell and state coordinator. It owns terminal command execution, history, active post and browser views, URL synchronization through `goto`, focus and mobile keyboard behavior, blog preview fetching, and code-highlighting state. Components under `src/lib/terminal/components` are focused renderers and interactive panels driven by this shell.

SvelteKit routes are thin entry points into the same terminal UI. The root, `/about`, `/blog/[...slug]`, and `/photography/[...slug]` loaders assemble route state and all render `TerminalWebsite`. Direct URLs therefore initialize terminal state rather than separate page implementations. Keep route parsing in the server loaders and shared lookup logic in `src/lib/blog.ts` or `src/lib/photography.ts`.

`src/lib/blog.ts` eagerly imports every `src/content/blog/**/*.mdx` file as raw text, parses frontmatter with `gray-matter`, normalizes paths, and supplies either metadata lists or full posts to loaders. Blog files require `title`, `date`, `description`, and `tags` frontmatter. Adding a correctly placed MDX file automatically adds it to routing, search, and the virtual filesystem.

`src/lib/terminal/filesystem.ts` projects posts and photography into a virtual filesystem rooted at `/home/sherlock`. Terminal commands such as `cd`, `ls`, `tree`, and `cat` operate on this model, not the host filesystem. Command documentation lives in `src/lib/terminal/help.ts`; autocomplete derives its command catalog from that file, while command behavior is dispatched in `TerminalWebsite.svelte`. Update these surfaces together when adding or changing commands.

Markdown is converted by `src/lib/terminal/markdown.ts` from `marked` tokens into typed blocks rendered by `MarkdownBlocks.svelte`. Fenced code is highlighted asynchronously with Shiki. The custom `::dist[label]{file="path"}` syntax produces a download block served by `/dist/[...file]`; the server endpoint streams from a private Cloudflare R2 bucket using the server-only helper in `src/lib/server/r2.ts`, defaults to the `dists/` object prefix, and supports HEAD and byte-range requests. Existing Turnstile download access checks remain required.

Photography is discovered dynamically from the private R2 bucket by `src/lib/server/photography.ts`, which lists image objects under `R2_PHOTOGRAPHY_PREFIX` (default `photography/`) and caches the catalog for one minute. `PHOTOGRAPHY_HEADER_KEY` selects one fixed header image, shown once above the unified gallery. `PHOTOGRAPHY_CDN_URL` optionally overrides the image URL base; otherwise images use `/media/photography/<object-key>`. Uploading photos requires no code or metadata list changes. Camera and capture date are read from embedded EXIF/XMP on demand through `/api/photography-metadata`, backed by `src/lib/server/image-metadata.ts`. Preserve bucket folders in photo routes and virtual files; folder links open the complete gallery. Do not expose private R2 credentials in client code.

Global styling is centralized in `src/routes/layout.css`, which defines the Flexoki-like color tokens, terminal shell, post reader, blog browser, photography UI, and the primary 760px mobile breakpoint. `+layout.svelte` loads this stylesheet and preloads the regular Sarasa Mono font; additional font variants are loaded after mount.

The production image is built with Bun and runs the adapter-node output using `bun build/index.js`. Docker Compose reads R2 credentials from `.env`; there is no local distribution mount. Docker excludes local `dists/` and `static/photography/` from its build context.

## Change Conventions

Follow existing Svelte 5 runes patterns such as `$state`, `$derived`, `$effect`, and `$props`. Keep components PascalCase, TypeScript identifiers camelCase, and CSS classes lowercase kebab-case. Prefer shared terminal logic in `src/lib/terminal` over expanding already large UI components, and do not add dependencies without approval.

Preserve the terminal aesthetic and reuse existing components and CSS tokens. For UI work, inspect both desktop and mobile behavior, including relevant terminal commands, direct route loading, browser panels, post rendering, code blocks, images, error states, and focus or keyboard behavior.

Do not delete or overwrite files under `src/content/blog` or `static` unless the task explicitly requires it. Recent commits use concise conventional prefixes such as `feat:` and `fix:`.
