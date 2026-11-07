<script lang="ts">
	import { resolve } from '$app/paths';
	import { SITE_TITLE } from '#lib/site.ts';
	import {
		Badge,
		Button,
		Callout,
		Checkbox,
		Chevron,
		CodeBlock,
		CommandChip,
		DataTable,
		Details,
		Dialog,
		Divider,
		EmptyState,
		Heading,
		InlineCode,
		Kbd,
		KeyValueList,
		KeyValueRow,
		Lightbox,
		Link,
		LinkList,
		Notice,
		OutputLine,
		Panel,
		PanelSection,
		PathBreadcrumbs,
		ProgressBar,
		Prompt,
		Prose,
		Select,
		Spinner,
		TagList,
		Tabs,
		TerminalPage,
		TerminalViewport,
		Text,
		TextField,
		type DataTableColumn,
		type LightboxImage,
		type Theme,
		type Tone
	} from '#lib/ui/index.ts';

	type Project = { name: string; description: string; url: string };

	let theme = $state<Theme>('dark');
	let query = $state('');
	let sort = $state<'newest' | 'oldest' | 'title'>('newest');
	let subscribed = $state(true);
	let tab = $state('posts');
	let dialogOpen = $state(false);
	let lightboxImage = $state<LightboxImage>();
	let saving = $state(false);
	let noticeOpen = $state(false);
	let lastCommand = $state('');
	let progress = $state(64);

	const tones: Tone[] = ['neutral', 'muted', 'accent', 'info', 'success', 'warning', 'danger'];

	const projects: Project[] = [
		{
			name: 'softmun-oss',
			description: 'Open-source Model UN committee management software.',
			url: 'https://github.com/sherlockholmestech/softmun-oss'
		},
		{
			name: 'pwninit',
			description: 'Automates setup for pwn and reverse engineering challenges.',
			url: 'https://github.com/sherlockholmestech/pwninit'
		}
	];

	const projectColumns: DataTableColumn<Project>[] = [
		{ key: 'name', label: 'name', width: 'minmax(150px, 0.25fr)' },
		{ key: 'description', label: 'description', width: 'minmax(210px, 0.45fr)' },
		{ key: 'url', label: 'url', width: 'minmax(220px, 0.55fr)', tone: 'info' }
	];

	const sample = `import { TerminalPage, Prompt, Panel } from '#lib/ui/index.ts';

export function greet(name: string) {
	return \`hello, \${name}\`;
}`;
</script>

<svelte:head>
	<title>components | {SITE_TITLE}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<TerminalPage title={`${SITE_TITLE} // ui`} {theme}>
	{#snippet actions()}
		<Button
			size="sm"
			onclick={() => (theme = theme === 'dark' ? 'light' : 'dark')}
			aria-label="toggle theme"
		>
			{theme}
		</Button>
	{/snippet}

	<Prompt command="ls ~/src/lib/ui" />
	<OutputLine kind="muted" text="Import components from '#lib/ui/index.ts'." />

	<Divider label="layout" />
	<Panel title="Panel" meta="ruled">
		<PanelSection label="PanelSection">
			<Text>Labelled rows, like the help panel.</Text>
		</PanelSection>
		<PanelSection label="stacked">
			<Text tone="muted">The label stacks above content below 760px.</Text>
		</PanelSection>
	</Panel>
	<Panel title="boxed panel" meta="with close + footer" variant="boxed" onClose={() => {}}>
		<PanelSection><Text>Body content.</Text></PanelSection>
		{#snippet footer()}footer text{/snippet}
	</Panel>
	<Divider />
	<Divider dashed />
	<Divider strong />

	<div class="h-[96px] border border-[var(--border)]">
		<TerminalViewport>
			<OutputLine text="TerminalViewport: the scrolling window body." />
		</TerminalViewport>
	</div>

	<Divider label="typography" />
	<Heading level={1}>Heading 1</Heading>
	<Heading level={2}>Heading 2</Heading>
	<Heading level={3}>Heading 3</Heading>
	<Heading level={4}>Heading 4</Heading>
	<Text justify measure>
		Body text keeps the terminal reading rhythm. Use <InlineCode>InlineCode</InlineCode> for identifiers,
		<Kbd>tab</Kbd> for keys, and <Link href="https://svelte.dev" external>links</Link>
		for references.
	</Text>
	<div class="flex flex-wrap gap-[12px]">
		{#each tones as tone (tone)}
			<Text as="span" {tone}>{tone}</Text>
		{/each}
	</div>
	<Prose>
		<h2>Prose wrapper</h2>
		<p>Applies the blog typography to <strong>hand-written</strong> <em>markup</em>.</p>
		<ul>
			<li>Lists pick up accent markers.</li>
			<li>Blockquotes get the cyan rule.</li>
		</ul>
		<blockquote>Quoted text.</blockquote>
	</Prose>

	<Divider label="terminal" />
	<Prompt cwd="~/blog" command="cat hello.mdx" />
	<Prompt inline command="whoami" />
	<OutputLine text="plain output" />
	<OutputLine kind="success" text="build succeeded" />
	<OutputLine kind="warning" text="deprecated flag" />
	<OutputLine kind="error" text="command not found: foo" />
	<div class="my-[10px] flex flex-wrap gap-[6px]">
		{#each ['help', 'blog', 'photos'] as command (command)}
			<CommandChip {command} onRun={(value) => (lastCommand = value)} />
		{/each}
		<CommandChip command="home" href={resolve('/')} />
	</div>
	{#if lastCommand}<OutputLine kind="muted" text={`ran ${lastCommand}`} />{/if}
	<PathBreadcrumbs path="/home/sherlock/blog/ctf/writeup.mdx" onNavigate={() => {}} />

	<Divider label="controls" />
	<div class="flex flex-wrap items-center gap-[8px]">
		<Button>outline</Button>
		<Button variant="solid">solid</Button>
		<Button variant="ghost">ghost</Button>
		<Button variant="danger">danger</Button>
		<Button variant="success">success</Button>
		<Button size="sm">small</Button>
		<Button loading={saving} onclick={() => (saving = !saving)}>stable width</Button>
		<Button loading>loading</Button>
		<Button variant="overlay">overlay</Button>
		<Button disabled>disabled</Button>
		<Button href={resolve('/')}>link</Button>
	</div>
	<div class="my-[12px] grid max-w-[60ch] gap-[10px]">
		<TextField label="query" prefix="❯" placeholder="type to filter" bind:value={query} />
		<TextField
			label="email"
			variant="boxed"
			type="email"
			hint="never shared"
			placeholder="you@example.com"
		/>
		<TextField label="handle" variant="boxed" error="handle is taken" value="sherlock" />
		<Select
			label="sort"
			bind:value={sort}
			options={[
				{ value: 'newest', label: 'newest' },
				{ value: 'oldest', label: 'oldest' },
				{ value: 'title', label: 'title' }
			]}
		/>
		<Checkbox label="subscribe" description="email me new posts" bind:checked={subscribed} />
		<Checkbox label="disabled" disabled />
	</div>
	<Tabs
		label="content type"
		bind:active={tab}
		items={[
			{ id: 'posts', label: 'posts' },
			{ id: 'tags', label: 'tags' },
			{ id: 'drafts', label: 'drafts', disabled: true }
		]}
	>
		{#snippet panel(id)}
			<Text tone="muted">Showing {id}. query = "{query}", sort = {sort}.</Text>
		{/snippet}
	</Tabs>

	<Divider label="data" />
	<KeyValueList
		items={[
			{ label: 'does', value: 'Software Engineering, CTF, Model UN' },
			{ label: 'stack', value: 'C/C++, Rust, TypeScript, Python' }
		]}
	/>
	<KeyValueList labelWidth="12ch">
		<KeyValueRow label="tags"><TagList tags={['ctf', 'pwn', 'rust']} /></KeyValueRow>
		<KeyValueRow>
			{#snippet term()}<InlineCode>cat [file]</InlineCode>{/snippet}
			Prints a post.
		</KeyValueRow>
	</KeyValueList>
	<Panel title="projects" meta={`${projects.length} repos`}>
		<DataTable
			label="projects"
			columns={projectColumns}
			rows={projects}
			rowKey={(row) => row.url}
			href={(row) => row.url}
			external
		/>
	</Panel>
	<DataTable label="empty table" columns={projectColumns} rows={[]} rowKey={(row) => row.url} />
	<LinkList
		title="socials"
		items={[{ label: 'github', href: 'https://github.com/sherlockholmestech', external: true }]}
	/>
	<div class="my-[10px] flex flex-wrap gap-[8px]">
		{#each tones as tone (tone)}
			<Badge {tone}>{tone}</Badge>
		{/each}
		<Badge variant="solid" tone="success">solid</Badge>
	</div>
	<CodeBlock code={sample} language="ts" highlight {theme} />
	<CodeBlock code="bun run check && bun run lint" language="sh" compact />

	<Divider label="feedback" />
	<Callout tone="danger" code="404" title="No such file or directory">
		route lookup failed; the requested path is not mapped.
	</Callout>
	<Callout tone="success" title="Saved">Your changes are live.</Callout>
	<Callout tone="warning" title="Heads up">
		This post is a draft.
		{#snippet actions()}
			<CommandChip command="publish" onRun={() => {}} />
		{/snippet}
	</Callout>
	<EmptyState title="no posts" message="nothing matches that query." />
	<div class="my-[10px] grid gap-[8px]">
		<Spinner label="fetching photographs" />
		<ProgressBar label="upload" value={progress} />
		<div class="flex gap-[8px]">
			<Button size="sm" onclick={() => (progress = Math.max(0, progress - 10))}>-10</Button>
			<Button size="sm" onclick={() => (progress = Math.min(100, progress + 10))}>+10</Button>
		</div>
	</div>
	<div class="my-[8px] flex items-center gap-[8px]">
		<Chevron />
		<Chevron open />
		<Chevron direction="right" />
	</div>
	<Details summary="Storage details">
		<Text tone="muted">Disclosure content.</Text>
	</Details>
	<div class="my-[12px] flex flex-wrap gap-[8px]">
		<Button onclick={() => (dialogOpen = true)}>open dialog</Button>
		<Button onclick={() => (noticeOpen = true)}>show notice</Button>
		<Button onclick={() => (lightboxImage = { src: '/pfp.jpg', alt: 'Profile photograph' })}>
			open lightbox
		</Button>
	</div>

	<Dialog bind:open={dialogOpen} title="confirm" size="sm">
		<Text>Discard this draft? This cannot be undone.</Text>
		<Select
			label="sort"
			bind:value={sort}
			options={[
				{ value: 'newest', label: 'newest' },
				{ value: 'oldest', label: 'oldest' },
				{ value: 'title', label: 'title' }
			]}
		/>
		{#snippet footer()}
			<Button onclick={() => (dialogOpen = false)}>cancel</Button>
			<Button variant="danger" onclick={() => (dialogOpen = false)}>discard</Button>
		{/snippet}
	</Dialog>
	<Lightbox image={lightboxImage} label="Example image" onClose={() => (lightboxImage = undefined)}>
		{#snippet footer()}Lightbox footer{/snippet}
	</Lightbox>
	<Notice bind:open={noticeOpen} title="Notice">
		<p>A floating corner notice.</p>
	</Notice>
</TerminalPage>
