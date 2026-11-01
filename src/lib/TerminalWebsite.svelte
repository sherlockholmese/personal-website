<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getContext, onMount, tick, untrack } from 'svelte';
	import { COOKIE_NOTICE_CONTEXT } from '#lib/cookie-notice.ts';
	import {
		photographRoutePath,
		photographRouteSlug,
		type Photograph,
		type PhotographyRouteState
	} from '#lib/photography.ts';
	import { SITE_DESCRIPTION, SITE_TITLE, TERMINAL_TITLE } from '#lib/site.ts';
	import { completeTerminalInput } from '#lib/terminal/autocomplete.ts';
	import {
		buildTree,
		createFileSystem,
		formatPromptPath,
		HOME_DIRECTORY,
		listEntries,
		normalizePath,
		postPathFromFilePath,
		resolveEntry,
		ROOT_DIRECTORY,
		toHomeRelative
	} from '#lib/terminal/filesystem.ts';
	import { helpfulCommands } from '#lib/terminal/help.ts';
	import {
		highlightMarkdownCode,
		parseMarkdown,
		tokenizeMarkdown,
		type MarkdownTokens
	} from '#lib/terminal/markdown.ts';
	import { isMobileViewport, shouldAvoidImplicitFocusViewport } from '#lib/terminal/media.ts';
	import { createPostSearchIndex, searchPosts, sortPosts } from '#lib/terminal/search.ts';
	import {
		DEFAULT_BLOG_SORT,
		type BlogPost,
		type BlogPostMeta,
		type BlogSort,
		type ShellLine,
		type Theme
	} from '#lib/terminal/types.ts';
	import BlogBrowser from '#lib/terminal/components/BlogBrowser.svelte';
	import HelpPanel from '#lib/terminal/components/HelpPanel.svelte';
	import NotFoundPanel from '#lib/terminal/components/NotFoundPanel.svelte';
	import PhotographyGallery from '#lib/terminal/components/PhotographyGallery.svelte';
	import PostReader from '#lib/terminal/components/PostReader.svelte';
	import ProjectsTable from '#lib/terminal/components/ProjectsTable.svelte';
	import PromptForm from '#lib/terminal/components/PromptForm.svelte';
	import RouteLinks from '#lib/terminal/components/RouteLinks.svelte';
	import SocialLinks from '#lib/terminal/components/SocialLinks.svelte';
	import WelcomeBanner from '#lib/terminal/components/WelcomeBanner.svelte';
	import { Button, OutputLine, Prompt, TerminalPage, TerminalViewport } from '#lib/ui/index.ts';

	const ABOUT_PATH = 'about';
	const THEME_STORAGE_KEY = 'flexoki-theme';
	const openCookieNotice = getContext<() => void>(COOKIE_NOTICE_CONTEXT);
	let {
		data
	}: {
		data: {
			posts: BlogPostMeta[];
			about: BlogPost;
			asciiSeed: number;
			post?: BlogPost;
			photography?: PhotographyRouteState;
			photographs: Photograph[];
			headerPhotograph?: Photograph;
			photographyUnavailable: boolean;
			requestedPath?: string;
			notFound?: boolean;
		};
	} = $props();
	let posts = $derived(data.posts);
	let asciiSeed = $derived(data.asciiSeed);
	let aboutPost = $derived(data.about);
	let loadedPost = $derived(data.post);
	let routePhotography = $derived(data.photography);
	let requestedPath = $derived(data.requestedPath);
	let routeNotFound = $derived(data.notFound);

	let input = $state('');
	let cwd = $state(HOME_DIRECTORY);
	let history = $state<ShellLine[]>([{ kind: 'banner' }]);
	let activePostPath = $state('');
	let currentView = $state<'terminal' | 'post'>('terminal');
	let blogBrowserVisible = $state(false);
	let photographyBrowserVisible = $state(
		untrack(
			() =>
				!!data.photography ||
				(data.photographyUnavailable && !!data.requestedPath?.startsWith('photography'))
		)
	);
	let photographyPhotoSlug = $state(untrack(() => data.photography?.photoSlug ?? ''));
	let fzfQuery = $state('');
	let fzfIndex = $state(0);
	let blogSort = $state<BlogSort>(DEFAULT_BLOG_SORT);
	let initializedRoutePath = $state<string>();
	let theme = $state<Theme>('dark');
	let terminalViewport = $state<HTMLDivElement>();
	let terminalScrollback = $state<HTMLDivElement>();
	let promptInput = $state<HTMLInputElement>();
	let fzfInput = $state<HTMLInputElement>();
	let photographyClose = $state<HTMLButtonElement>();
	let highlightedCode = $state<Record<string, string>>({});
	let previewMarkdownByPath = $state<Record<string, string>>({});
	let previewHighlightedCodeByKey = $state<Record<string, Record<string, string>>>({});
	let mobileViewportHeight = $state<number>();
	let mobileKeyboardOpen = $state(false);
	const mobileShortcuts = ['home', ...helpfulCommands.filter((command) => command !== 'home')];

	let allPhotographs = $derived([
		...data.photographs,
		...(data.headerPhotograph ? [data.headerPhotograph] : [])
	]);
	let fileSystem = $derived(createFileSystem(posts, allPhotographs));
	let postsByPath = $derived(new Map(posts.map((post) => [post.path, post])));
	let postSearchIndex = $derived(createPostSearchIndex(posts));
	let selectedPost = $derived<BlogPostMeta>(
		postsByPath.get(activePostPath) ??
			(loadedPost?.path === activePostPath ? loadedPost : undefined) ??
			(aboutPost.path === activePostPath ? aboutPost : undefined) ??
			loadedPost ?? {
				path: '',
				title: '',
				description: '',
				date: '',
				tags: []
			}
	);
	let selectedFullPost = $derived(
		loadedPost?.path === activePostPath
			? loadedPost
			: aboutPost.path === activePostPath
				? aboutPost
				: undefined
	);
	let postMarkdownTokens = $derived(tokenizeMarkdown(selectedFullPost?.markdown ?? ''));
	let parsedPost = $derived(parseMarkdown(postMarkdownTokens, highlightedCode));
	let postViewBlocks = $derived(parsedPost);
	let fzfResults = $derived(sortPosts(searchPosts(postSearchIndex, fzfQuery), blogSort));
	let browserSelectedPost = $derived(fzfResults[fzfIndex] ?? selectedPost);
	let browserPreviewMarkdown = $derived(
		selectedFullPost?.path === browserSelectedPost.path
			? selectedFullPost.markdown
			: previewMarkdownByPath[browserSelectedPost.path]
	);
	let browserPreviewHighlightKey = $derived(`${theme}:${browserSelectedPost.path}`);
	let browserPreviewHighlightedCode = $derived(
		previewHighlightedCodeByKey[browserPreviewHighlightKey] ?? {}
	);
	let browserPreviewTokens = $derived(tokenizeMarkdown(browserPreviewMarkdown ?? ''));
	let browserPreviewBlocks = $derived(
		parseMarkdown(browserPreviewTokens, browserPreviewHighlightedCode)
	);
	let terminalTitleText = $derived(currentView === 'post' ? selectedPost.title : TERMINAL_TITLE);
	let closeTerminalPanel = $derived(
		currentView === 'post'
			? closePostView
			: photographyBrowserVisible
				? closeActiveTerminalPanel
				: undefined
	);
	let metaPost = $derived(loadedPost);
	let metaTitle = $derived(metaPost ? `${metaPost.title} | ${SITE_TITLE}` : SITE_TITLE);
	let metaDescription = $derived(metaPost?.description || SITE_DESCRIPTION);

	$effect(() => {
		if (!activePostPath && posts.length) {
			activePostPath = posts[0].path;
		}
	});

	onMount(() => {
		const savedTheme = document.documentElement.dataset.theme;
		if (savedTheme === 'dark' || savedTheme === 'light') {
			theme = savedTheme;
		} else {
			document.documentElement.dataset.theme = theme;
		}

		const stopWatchingMobileViewport = watchMobileViewport();

		void (async () => {
			await tick();
			focusPromptIfComfortable();
		})();

		return stopWatchingMobileViewport;
	});

	$effect(() => {
		if (currentView === 'post' && selectedFullPost) {
			void updateHighlightedCode(postMarkdownTokens, selectedFullPost.markdown, theme);
		} else {
			highlightedCode = {};
		}
	});

	$effect(() => {
		const path = browserSelectedPost.path;
		if (
			!blogBrowserVisible ||
			!path ||
			selectedFullPost?.path === path ||
			path in previewMarkdownByPath
		) {
			return;
		}

		const controller = new AbortController();
		void loadPreview(path, controller.signal);

		return () => controller.abort();
	});

	$effect(() => {
		const path = browserSelectedPost.path;
		const markdown = browserPreviewMarkdown;
		const key = browserPreviewHighlightKey;
		if (!blogBrowserVisible || !path || !markdown || key in previewHighlightedCodeByKey) {
			return;
		}

		void updatePreviewHighlightedCode(key, browserPreviewTokens, theme);
	});

	$effect(() => {
		if (requestedPath && initializedRoutePath !== requestedPath) {
			if (routeNotFound) {
				history = [{ kind: 'not-found', path: requestedPath }];
			} else if (
				routePhotography ||
				(data.photographyUnavailable && requestedPath.startsWith('photography'))
			) {
				photographyPhotoSlug = routePhotography?.photoSlug ?? '';
				blogBrowserVisible = false;
				photographyBrowserVisible = true;
				currentView = 'terminal';
			} else {
				if (loadedPost?.path === requestedPath || aboutPost.path === requestedPath) {
					activePostPath = requestedPath;
					currentView = 'post';
				} else {
					history = [
						...history,
						{ kind: 'links', path: requestedPath, entries: childLinks(requestedPath) }
					];
				}
			}
			initializedRoutePath = requestedPath;
		}
		if (!requestedPath && initializedRoutePath) {
			if (initializedRoutePath.startsWith('photography')) {
				photographyBrowserVisible = false;
				photographyPhotoSlug = '';
			}
			initializedRoutePath = undefined;
		}
	});

	function focusPrompt(event: PointerEvent) {
		if (shouldAvoidImplicitFocus()) return;
		if (event.target instanceof HTMLInputElement) return;
		if (event.target instanceof HTMLElement) {
			const interactive = event.target.closest(
				'button, a, input, textarea, select, [role="button"]'
			);
			if (interactive) return;
		}
		promptInput?.focus();
	}

	function shouldAvoidImplicitFocus() {
		return shouldAvoidImplicitFocusViewport();
	}

	function focusPromptIfComfortable() {
		if (!shouldAvoidImplicitFocus()) {
			promptInput?.focus();
		}
	}

	function watchMobileViewport() {
		const viewport = window.visualViewport;
		let frame = 0;
		let settleTimer = 0;
		let unfocusedViewportHeight = viewport?.height ?? window.innerHeight;

		const updateViewport = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => {
				const mobile = isMobileViewport();
				const viewportHeight = viewport?.height ?? window.innerHeight;
				const viewportOffsetTop = Math.max(0, viewport?.offsetTop ?? 0);
				const viewportBottom = viewportOffsetTop + viewportHeight;
				const focusedElement = document.activeElement;
				const textFieldFocused =
					focusedElement instanceof HTMLInputElement ||
					focusedElement instanceof HTMLTextAreaElement ||
					(focusedElement instanceof HTMLElement && focusedElement.isContentEditable);

				if (!textFieldFocused) {
					unfocusedViewportHeight = viewportHeight;
				}

				const keyboardOpen =
					mobile && textFieldFocused && unfocusedViewportHeight - viewportHeight > 100;

				mobileKeyboardOpen = keyboardOpen;
				mobileViewportHeight = keyboardOpen ? Math.round(viewportBottom) : undefined;

				if (keyboardOpen && focusedElement === promptInput) {
					void scrollToPrompt();
				}
			});
		};

		const handleFocusChange = () => {
			updateViewport();
			window.clearTimeout(settleTimer);
			settleTimer = window.setTimeout(updateViewport, 300);
		};

		viewport?.addEventListener('resize', updateViewport);
		viewport?.addEventListener('scroll', updateViewport);
		window.addEventListener('resize', updateViewport);
		document.addEventListener('focusin', handleFocusChange);
		document.addEventListener('focusout', handleFocusChange);
		updateViewport();

		return () => {
			cancelAnimationFrame(frame);
			window.clearTimeout(settleTimer);
			viewport?.removeEventListener('resize', updateViewport);
			viewport?.removeEventListener('scroll', updateViewport);
			window.removeEventListener('resize', updateViewport);
			document.removeEventListener('focusin', handleFocusChange);
			document.removeEventListener('focusout', handleFocusChange);
		};
	}

	function focusBlogSearchIfComfortable() {
		if (!shouldAvoidImplicitFocus()) {
			fzfInput?.focus();
		}
	}

	function preservePromptFocus(event: PointerEvent) {
		if (document.activeElement === promptInput && event.pointerType !== 'mouse') {
			event.preventDefault();
		}
	}

	function dismissMobileKeyboard() {
		promptInput?.blur();
	}

	function handlePromptKeydown(event: KeyboardEvent) {
		if (event.key === 'Tab') {
			event.preventDefault();
			void autocompletePrompt();
			return;
		}
		if (blogBrowserVisible && event.key === 'ArrowUp') {
			event.preventDefault();
			fzfInput?.focus();
		}
		if (photographyBrowserVisible && event.key === 'ArrowUp') {
			event.preventDefault();
			photographyClose?.focus({ preventScroll: true });
		}
		if (blogBrowserVisible && event.key === 'Escape') {
			event.preventDefault();
			blogBrowserVisible = false;
		}
		if (photographyBrowserVisible && event.key === 'Escape') {
			event.preventDefault();
			closePhotographyBrowser();
		}
	}

	async function autocompletePrompt() {
		const cursor = promptInput?.selectionStart ?? input.length;
		const completion = completeTerminalInput(input, cursor, cwd, fileSystem);
		if (!completion) return;

		input = completion.input;
		await tick();
		promptInput?.setSelectionRange(completion.cursor, completion.cursor);

		if (completion.candidates.length) {
			print([completion.candidates.join('  ')], 'muted');
			await scrollToPrompt();
		}
	}

	async function submit() {
		const command = input.trim();
		if (!command) return;

		const commandCwd = cwd;
		history = [...history, { kind: 'prompt', command, cwd: formatPromptPath(commandCwd) }];
		input = '';
		runCommand(command);
		await scrollToPrompt();
	}

	function runCommand(command: string) {
		const [name, ...args] = command.split(/\s+/);
		const target = args.join(' ');

		switch (name) {
			case 'clear':
				resetTerminal([]);
				return;
			case 'home':
				resetTerminal([{ kind: 'banner' }]);
				return;
			case 'banner':
				history = [...history, { kind: 'banner' }];
				return;
			case 'pwd':
				print([cwd || ROOT_DIRECTORY]);
				return;
			case 'cd':
				changeDirectory(target || HOME_DIRECTORY);
				return;
			case 'help':
				history = [...history, { kind: 'help' }];
				return;
			case 'cookies':
				if (target) {
					print(['usage: cookies'], 'error');
				} else {
					openCookieNotice();
				}
				return;
			case 'about':
				openAboutPost();
				return;
			case 'info':
				print([
					'Sherlock Holmes',
					'  site: personal blog in a terminal shell',
					'  stack: SvelteKit, TypeScript, Flexoki, Geist Mono',
					'  focus: Rust, CTF notes, web development, and MUN'
				]);
				return;
			case 'socials':
				history = [...history, { kind: 'socials' }];
				return;
			case 'projects':
				history = [...history, { kind: 'projects' }];
				return;
			case 'photography':
				if (target) {
					print(['usage: photography'], 'error');
					return;
				}
				photographyPhotoSlug = '';
				void openPhotographyBrowser();
				return;
			case 'ls':
				listDirectory(target || '.');
				return;
			case 'tree':
				treeDirectory(target || '.');
				return;
			case 'blog':
				fzfQuery = target;
				void openBlogSearch();
				return;
			case 'cat':
				openPost(target, name);
				return;
			case 'theme':
				if (target === 'dark' || target === 'light') {
					setTheme(target);
					print([`theme set to flexoki ${target}`], 'success');
				} else {
					print(['usage: theme dark|light'], 'error');
				}
				return;
			default:
				print([`${name}: command not found`], 'error');
		}
	}

	function resetTerminal(nextHistory: ShellLine[]) {
		history = nextHistory;
		blogBrowserVisible = false;
		photographyBrowserVisible = false;
		if (currentView === 'post') closePostView();
	}

	function setTheme(nextTheme: Theme) {
		theme = nextTheme;
		document.documentElement.dataset.theme = nextTheme;
		try {
			localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
		} catch {
			// The active session still changes theme when storage is unavailable.
		}
	}

	function changeDirectory(target: string) {
		const path = normalizePath(target, cwd);
		const entry = resolveEntry(fileSystem, path);
		if (entry.type === 'directory') {
			cwd = entry.path;
			return;
		}
		if (entry.type === 'file') {
			print([`cd: ${target}: Not a directory`], 'error');
			return;
		}
		print([`cd: ${target}: No such file or directory`], 'error');
	}

	function listDirectory(target: string) {
		const path = normalizePath(target, cwd);
		const entry = resolveEntry(fileSystem, path);

		if (entry.type === 'missing') {
			print([`ls: cannot access '${target}': No such file or directory`], 'error');
			return;
		}

		if (entry.type === 'file') {
			const name = entry.filePath.split('/').pop() ?? entry.filePath;
			print([target === '.' ? name : target]);
			return;
		}

		const children = listEntries(fileSystem, entry.path);
		if (children.length) {
			print(children.map((child) => child.name));
		}
	}

	function treeDirectory(target: string) {
		const path = normalizePath(target, cwd);
		const entry = resolveEntry(fileSystem, path);

		if (entry.type === 'missing') {
			print([`tree: ${target}: No such file or directory`], 'error');
			return;
		}

		if (entry.type === 'file') {
			print([`tree: ${target}: Not a directory`], 'error');
			return;
		}

		const label = target === '.' ? '.' : formatPromptPath(entry.path);
		const lines = buildTree(fileSystem, entry.path);
		print([label, ...lines.map((line) => `  ${line}`)]);
	}

	function openPost(target: string, commandName: string) {
		if (!target) {
			print([`${commandName}: missing file operand`], 'error');
			return;
		}

		const path = normalizePath(target, cwd);
		const entry = resolveEntry(fileSystem, path);

		if (entry.type === 'missing') {
			print([`${commandName}: ${target}: No such file or directory`], 'error');
			return;
		}

		if (entry.type === 'directory') {
			print([`${commandName}: ${target}: Is a directory`], 'error');
			return;
		}

		if (entry.kind === 'photograph') {
			void openPhotographyPhotograph(entry.photograph);
			return;
		}
		if (entry.kind === 'executable') {
			print([`${commandName}: ${target}: Cannot render executable file`], 'error');
			return;
		}

		activePostPath = entry.post.path;
		blogBrowserVisible = false;
		currentView = 'post';
		void updateUrlForView(entry.post.path);
	}

	function openAboutPost() {
		activePostPath = aboutPost.path;
		blogBrowserVisible = false;
		currentView = 'post';
		void updateUrlForView(aboutPost.path);
	}

	async function openBlogSearch() {
		photographyBrowserVisible = false;
		blogBrowserVisible = true;
		fzfIndex = Math.max(
			0,
			fzfResults.findIndex((post) => post.path === activePostPath)
		);
		await tick();
		focusBlogSearchIfComfortable();
	}

	function moveFzfSelection(delta: number) {
		if (!fzfResults.length) return;
		fzfIndex = (fzfIndex + delta + fzfResults.length) % fzfResults.length;
	}

	function openFzfSelection(index = fzfIndex) {
		const post = fzfResults[index];
		if (!post) return;

		activePostPath = post.path;
		currentView = 'post';
		blogBrowserVisible = false;
		void updateUrlForView(post.path);
		focusPromptIfComfortable();
	}

	function closeBlogSearch() {
		blogBrowserVisible = false;
		focusPromptIfComfortable();
	}

	async function openPhotographyBrowser() {
		blogBrowserVisible = false;
		photographyBrowserVisible = true;
		await updatePhotographyUrl('photography');
		await tick();
		if (!shouldAvoidImplicitFocus()) {
			photographyClose?.focus({ preventScroll: true });
		}
	}

	function closePhotographyBrowser() {
		photographyBrowserVisible = false;
		photographyPhotoSlug = '';
		if (requestedPath?.startsWith('photography')) {
			void updateUrlForView();
		}
		focusPromptIfComfortable();
	}

	function closeActiveTerminalPanel() {
		if (blogBrowserVisible) {
			closeBlogSearch();
			return;
		}
		if (photographyBrowserVisible) {
			closePhotographyBrowser();
		}
	}

	async function openPhotographyPhotograph(photograph: Photograph) {
		photographyPhotoSlug = photographRouteSlug(photograph);
		blogBrowserVisible = false;
		photographyBrowserVisible = true;
		await tick();
		await updatePhotographyUrl(photographRoutePath(photograph));
	}

	async function closePhotographyPhotograph() {
		photographyPhotoSlug = '';
		await updatePhotographyUrl('photography');
	}

	function closePostView() {
		currentView = 'terminal';
		void updateUrlForView();
	}

	function handleFzfKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			moveFzfSelection(-1);
		}
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			moveFzfSelection(1);
		}
		if (event.key === 'Enter') {
			event.preventDefault();
			openFzfSelection();
		}
		if (event.key === 'Escape') {
			event.preventDefault();
			blogBrowserVisible = false;
			focusPromptIfComfortable();
		}
	}

	function handleQueryInput() {
		fzfIndex = 0;
	}

	function handleBlogSortChange(nextSort: BlogSort) {
		blogSort = nextSort;
		fzfIndex = 0;
		focusBlogSearchIfComfortable();
	}

	function selectFzfResult(index: number) {
		fzfIndex = index;
		focusBlogSearchIfComfortable();
	}

	async function loadPreview(path: string, signal: AbortSignal) {
		try {
			const response = await fetch(
				`${resolve('/api/blog-preview' as const)}?path=${encodeURIComponent(path)}`,
				{ signal }
			);
			const preview = (await response.json()) as { markdown?: string };
			previewMarkdownByPath = {
				...previewMarkdownByPath,
				[path]: response.ok && typeof preview.markdown === 'string' ? preview.markdown : ''
			};
		} catch (error) {
			if (!(error instanceof DOMException && error.name === 'AbortError')) {
				previewMarkdownByPath = { ...previewMarkdownByPath, [path]: '' };
			}
		}
	}

	function childLinks(path: string) {
		const directoryPath = normalizePath(path, HOME_DIRECTORY);
		const entries = listEntries(fileSystem, directoryPath);
		return entries.map((entry) => {
			const resolvedEntry =
				entry.type === 'file' ? resolveEntry(fileSystem, entry.path) : undefined;
			const relativePath =
				resolvedEntry?.type === 'file' && resolvedEntry.kind === 'photograph'
					? photographRoutePath(resolvedEntry.photograph)
					: entry.type === 'file'
						? postPathFromFilePath(entry.path)
						: toHomeRelative(entry.path);
			return {
				name: entry.type === 'file' ? entry.name.replace(/\.md$/, '') : entry.name,
				path: entry.path,
				directory: entry.type === 'directory',
				url: `/${relativePath}`
			};
		});
	}

	function print(lines: string[], kind: 'output' | 'success' | 'error' | 'muted' = 'output') {
		history = [...history, ...lines.map((text) => ({ kind, text }))];
	}

	async function updateHighlightedCode(tokens: MarkdownTokens, markdown: string, nextTheme: Theme) {
		const nextHighlightedCode = await highlightMarkdownCode(tokens, nextTheme);
		if (selectedFullPost?.markdown === markdown && theme === nextTheme) {
			highlightedCode = nextHighlightedCode;
		}
	}

	async function updatePreviewHighlightedCode(
		key: string,
		tokens: MarkdownTokens,
		nextTheme: Theme
	) {
		const nextHighlightedCode = await highlightMarkdownCode(tokens, nextTheme);
		if (theme === nextTheme) {
			previewHighlightedCodeByKey = {
				...previewHighlightedCodeByKey,
				[key]: nextHighlightedCode
			};
		}
	}

	async function scrollToPrompt() {
		await tick();
		if (shouldAvoidImplicitFocus()) {
			if (terminalScrollback) terminalScrollback.scrollTop = terminalScrollback.scrollHeight;
			return;
		}
		if (!terminalViewport || !promptInput) return;
		const promptBottom = promptInput.closest('form')?.getBoundingClientRect().bottom;
		const viewportBottom = terminalViewport.getBoundingClientRect().bottom - 8;
		if (promptBottom && promptBottom > viewportBottom) {
			terminalViewport.scrollTop += promptBottom - viewportBottom;
		}
	}

	async function updateUrlForView(path?: string) {
		let route = resolve('/');
		if (path) {
			route = path === ABOUT_PATH ? resolve('/about' as const) : resolve(path as `blog/${string}`);
		}
		await goto(route, {
			reset: false
		});
	}

	async function updatePhotographyUrl(path: string) {
		const route =
			path === 'photography' ? resolve('photography') : resolve(path as `photography/${string}`);
		await goto(route, {
			reset: false
		});
	}

	async function runShortcut(command: string) {
		input = command;
		await submit();
	}
</script>

<svelte:head>
	<title>{metaTitle}</title>
	<meta name="description" content={metaDescription} />
	<meta property="og:title" content={metaTitle} />
	<meta property="og:description" content={metaDescription} />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={metaTitle} />
	<meta name="twitter:description" content={metaDescription} />
</svelte:head>

<TerminalPage
	title={terminalTitleText}
	padded={false}
	onClose={closeTerminalPanel}
	closeLabel={currentView === 'post' ? 'close blog reader' : 'Close photography gallery'}
	bind:closeRef={photographyClose}
	keyboardOpen={mobileKeyboardOpen}
	viewportHeight={mobileViewportHeight}
>
	{#if currentView === 'post'}
		{#if selectedFullPost}
			<PostReader post={selectedFullPost} blocks={postViewBlocks} />
		{:else}
			<TerminalViewport>
				<OutputLine kind="muted" text={`loading ${selectedPost.path}...`} />
			</TerminalViewport>
		{/if}
	{:else}
		<TerminalViewport
			bind:ref={terminalViewport}
			bind:scrollbackRef={terminalScrollback}
			live
			contained={blogBrowserVisible || photographyBrowserVisible}
			onpointerdown={focusPrompt}
		>
			{#each history as line, index (index)}
				{#if line.kind === 'prompt'}
					<Prompt cwd={line.cwd} command={line.command} collapse />
				{:else if line.kind === 'links'}
					<RouteLinks path={line.path} entries={line.entries} />
				{:else if line.kind === 'socials'}
					<SocialLinks />
				{:else if line.kind === 'projects'}
					<ProjectsTable />
				{:else if line.kind === 'banner'}
					<WelcomeBanner {posts} {asciiSeed} onCommand={runShortcut} />
				{:else if line.kind === 'help'}
					<HelpPanel />
				{:else if line.kind === 'not-found'}
					<NotFoundPanel path={line.path} onCommand={runShortcut} />
				{:else}
					<OutputLine kind={line.kind} text={line.text} />
				{/if}
			{/each}

			{#snippet after()}
				{#if blogBrowserVisible}
					<BlogBrowser
						bind:query={fzfQuery}
						bind:inputRef={fzfInput}
						{posts}
						results={fzfResults}
						selectedIndex={fzfIndex}
						selectedPost={browserSelectedPost}
						previewBlocks={browserPreviewBlocks}
						sort={blogSort}
						onQueryInput={handleQueryInput}
						onKeydown={handleFzfKeydown}
						onSortChange={handleBlogSortChange}
						onSelect={selectFzfResult}
						onOpen={openFzfSelection}
						onClose={closeBlogSearch}
					/>
				{/if}

				{#if photographyBrowserVisible}
					<PhotographyGallery
						photographs={data.photographs}
						headerPhotograph={data.headerPhotograph}
						unavailable={data.photographyUnavailable}
						initialPhotoSlug={photographyPhotoSlug}
						onClose={closePhotographyBrowser}
						onPhotoOpen={openPhotographyPhotograph}
						onPhotoClose={closePhotographyPhotograph}
					/>
				{/if}

				{#if !blogBrowserVisible && !photographyBrowserVisible}
					<div class="command-dock" class:command-dock-keyboard={mobileKeyboardOpen}>
						<div class="command-shortcuts" aria-label="quick commands">
							{#each mobileShortcuts as command (command)}
								<Button
									size="sm"
									onpointerdown={preservePromptFocus}
									onclick={() => runShortcut(command)}
								>
									{command}
								</Button>
							{/each}
						</div>

						<PromptForm
							cwd={formatPromptPath(cwd)}
							bind:input
							bind:inputRef={promptInput}
							keyboardOpen={mobileKeyboardOpen}
							onKeydown={handlePromptKeydown}
							onSubmit={submit}
							onAutocomplete={autocompletePrompt}
							onDismissKeyboard={dismissMobileKeyboard}
						/>
					</div>
				{/if}
			{/snippet}
		</TerminalViewport>
	{/if}
</TerminalPage>

<style>
	.command-dock {
		background: var(--surface);
	}

	.command-shortcuts {
		display: none;
	}

	@media (max-width: 760px) {
		.command-dock {
			z-index: var(--layer-sticky);
			padding: var(--space-2) var(--space-2) max(var(--space-2), env(safe-area-inset-bottom));
			border-top: 1px solid var(--border);
		}

		.command-dock-keyboard {
			padding-block: var(--space-1);
		}

		.command-shortcuts {
			display: flex;
			flex-wrap: nowrap;
			gap: var(--space-2);
			margin-bottom: var(--space-2);
			padding-block: var(--space-1);
			overflow-x: auto;
			overscroll-behavior-inline: contain;
			scrollbar-width: none;
		}

		.command-shortcuts::-webkit-scrollbar {
			display: none;
		}

		.command-dock-keyboard .command-shortcuts {
			margin-bottom: var(--space-half);
			padding-block: var(--space-half);
		}
	}
</style>
