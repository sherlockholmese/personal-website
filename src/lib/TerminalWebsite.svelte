<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount, tick } from 'svelte';
	import {
		photographRoutePath,
		photographRouteSlug,
		type Photograph,
		type PhotographyCollection,
		type PhotographyRouteState
	} from '$lib/photography';
	import { SITE_DESCRIPTION, SITE_TITLE, TERMINAL_TITLE } from '$lib/site';
	import { completeTerminalInput } from '$lib/terminal/autocomplete';
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
	} from '$lib/terminal/filesystem';
	import { helpfulCommands } from '$lib/terminal/help';
	import {
		highlightMarkdownCode,
		parseMarkdown,
		tokenizeMarkdown,
		type MarkdownTokens
	} from '$lib/terminal/markdown';
	import { isMobileViewport, shouldAvoidImplicitFocusViewport } from '$lib/terminal/media';
	import { createPostSearchIndex, searchPosts, sortPosts } from '$lib/terminal/search';
	import {
		DEFAULT_BLOG_SORT,
		type BlogPost,
		type BlogPostMeta,
		type BlogSort,
		type ShellLine,
		type Theme
	} from '$lib/terminal/types';
	import BlogBrowser from '$lib/terminal/components/BlogBrowser.svelte';
	import HelpPanel from '$lib/terminal/components/HelpPanel.svelte';
	import NotFoundPanel from '$lib/terminal/components/NotFoundPanel.svelte';
	import PhotographyGallery from '$lib/terminal/components/PhotographyGallery.svelte';
	import PostReader from '$lib/terminal/components/PostReader.svelte';
	import ProjectsTable from '$lib/terminal/components/ProjectsTable.svelte';
	import PromptForm from '$lib/terminal/components/PromptForm.svelte';
	import RouteLinks from '$lib/terminal/components/RouteLinks.svelte';
	import SocialLinks from '$lib/terminal/components/SocialLinks.svelte';
	import WelcomeBanner from '$lib/terminal/components/WelcomeBanner.svelte';

	const ABOUT_PATH = 'about';
	const THEME_STORAGE_KEY = 'flexoki-theme';
	let {
		data
	}: {
		data: {
			posts: BlogPostMeta[];
			about: BlogPost;
			post?: BlogPost;
			photography?: PhotographyRouteState;
			requestedPath?: string;
			notFound?: boolean;
		};
	} = $props();
	let posts = $derived(data.posts);
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
	let photographyBrowserVisible = $state(false);
	let photographyQuery = $state('');
	let photographyCollectionSlug = $state('');
	let photographyPhotoSlug = $state('');
	let fzfQuery = $state('');
	let fzfIndex = $state(0);
	let blogSort = $state<BlogSort>(DEFAULT_BLOG_SORT);
	let initializedRoutePath = $state<string>();
	let theme = $state<Theme>('dark');
	let terminalViewport = $state<HTMLDivElement>();
	let terminalScrollback = $state<HTMLDivElement>();
	let terminalTitlebar = $state<HTMLDivElement>();
	let terminalTitleMeasurer = $state<HTMLSpanElement>();
	let promptInput = $state<HTMLInputElement>();
	let fzfInput = $state<HTMLInputElement>();
	let photographyInput = $state<HTMLInputElement>();
	let highlightedCode = $state<Record<string, string>>({});
	let previewMarkdownByPath = $state<Record<string, string>>({});
	let previewHighlightedCodeByKey = $state<Record<string, Record<string, string>>>({});
	let titlebarWidth = $state(0);
	let titleMeasurementReady = $state(false);
	let displayedTerminalTitle = $state(TERMINAL_TITLE);
	let mobileViewportHeight = $state<number>();
	let mobileKeyboardOpen = $state(false);
	let titleMeasureContext: CanvasRenderingContext2D | undefined;
	const mobileShortcuts = ['home', ...helpfulCommands.filter((command) => command !== 'home')];
	const TITLE_TRUNCATION_SUFFIX = '[...]';

	let fileSystem = $derived(createFileSystem(posts));
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
			await document.fonts?.ready;
			titleMeasurementReady = true;
		})();

		return stopWatchingMobileViewport;
	});

	$effect(() => {
		if (!terminalTitlebar) return;

		const updateTitlebarWidth = () => {
			titlebarWidth = terminalTitlebar?.clientWidth ?? 0;
		};
		const resizeObserver = new ResizeObserver(updateTitlebarWidth);
		resizeObserver.observe(terminalTitlebar);
		updateTitlebarWidth();

		return () => resizeObserver.disconnect();
	});

	$effect(() => {
		if (!titleMeasurementReady) return;
		displayedTerminalTitle = truncateTerminalTitle(terminalTitleText, titlebarWidth);
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
			} else if (routePhotography) {
				photographyQuery = routePhotography.collectionSlug ?? '';
				photographyCollectionSlug = routePhotography.collectionSlug ?? '';
				photographyPhotoSlug = routePhotography.photoSlug ?? '';
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

	function truncateTerminalTitle(title: string, width: number) {
		if (width <= 0) return title;

		const measure = terminalTitleMeasure();
		if (!measure) return title;

		const maxWidth = getTerminalTitleMaxWidth(width);
		if (measure(title) <= maxWidth) return title;

		if (measure(TITLE_TRUNCATION_SUFFIX) > maxWidth) {
			return TITLE_TRUNCATION_SUFFIX;
		}

		let low = 0;
		let high = title.length;

		while (low < high) {
			const middle = Math.ceil((low + high) / 2);
			const candidate = `${title.slice(0, middle).trimEnd()}${TITLE_TRUNCATION_SUFFIX}`;

			if (measure(candidate) <= maxWidth) {
				low = middle;
			} else {
				high = middle - 1;
			}
		}

		return `${title.slice(0, low).trimEnd()}${TITLE_TRUNCATION_SUFFIX}`;
	}

	function getTerminalTitleMaxWidth(width: number) {
		if (isMobileViewport()) {
			return Math.max(0, width - 42);
		}

		return width * 0.75;
	}

	function terminalTitleMeasure() {
		if (!terminalTitleMeasurer) return;
		const style = getComputedStyle(terminalTitleMeasurer);
		const context =
			titleMeasureContext ??
			(document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D | null);

		if (!context) return 0;

		titleMeasureContext = context;
		context.font = style.font;

		const padding = Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight);
		return (title: string) => Math.ceil(context.measureText(title).width + padding);
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
			photographyInput?.focus();
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
				photographyQuery = target;
				photographyCollectionSlug = '';
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
			void openPhotographyPhotograph(entry.collection, entry.photograph);
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
		await tick();
		if (!shouldAvoidImplicitFocus()) {
			photographyInput?.focus();
		}
	}

	function closePhotographyBrowser() {
		photographyBrowserVisible = false;
		photographyCollectionSlug = '';
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
		if (photographyCollectionSlug) {
			void closePhotographyCollection();
			return;
		}
		if (photographyBrowserVisible) {
			closePhotographyBrowser();
		}
	}

	async function openPhotographyCollection(collection: PhotographyCollection) {
		photographyQuery = collection.slug;
		photographyCollectionSlug = collection.slug;
		photographyPhotoSlug = '';
		photographyBrowserVisible = true;
		await updatePhotographyUrl(`photography/${collection.slug}`);
	}

	async function closePhotographyCollection() {
		photographyCollectionSlug = '';
		photographyPhotoSlug = '';
		photographyQuery = '';
		await updatePhotographyUrl('photography');
	}

	async function openPhotographyPhotograph(
		collection: PhotographyCollection,
		photograph: Photograph
	) {
		photographyQuery = collection.slug;
		photographyCollectionSlug = collection.slug;
		photographyPhotoSlug = photographRouteSlug(photograph);
		blogBrowserVisible = false;
		photographyBrowserVisible = true;
		await tick();
		await updatePhotographyUrl(photographRoutePath(collection, photograph));
	}

	async function closePhotographyPhotograph(collection: PhotographyCollection) {
		photographyPhotoSlug = '';
		await updatePhotographyUrl(`photography/${collection.slug}`);
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
					? photographRoutePath(resolvedEntry.collection, resolvedEntry.photograph)
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
		const scrollTarget = shouldAvoidImplicitFocus() ? terminalScrollback : terminalViewport;
		if (!scrollTarget) return;
		scrollTarget.scrollTop = scrollTarget.scrollHeight;
	}

	async function updateUrlForView(path?: string) {
		let route = resolve('/');
		if (path) {
			route =
				path === ABOUT_PATH ? resolve('/about' as const) : resolve(`/${path}` as `/blog/${string}`);
		}
		await goto(route, {
			keepFocus: true,
			noScroll: true,
			replaceState: false
		});
	}

	async function updatePhotographyUrl(path: string) {
		const route =
			path === 'photography'
				? resolve('/photography')
				: resolve(`/${path}` as `/photography/${string}`);
		await goto(route, {
			keepFocus: true,
			noScroll: true,
			replaceState: false
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

<main
	class="workspace terminal-workspace"
	class:light={theme === 'light'}
	class:terminal-keyboard-open={mobileKeyboardOpen}
	style={mobileViewportHeight
		? `--terminal-mobile-viewport-height: ${mobileViewportHeight}px`
		: undefined}
>
	<section class="terminal-shell">
		<article class="terminal-window">
			<div class="terminal-titlebar" bind:this={terminalTitlebar}>
				<span class="terminal-title" title={terminalTitleText}>
					{displayedTerminalTitle}
				</span>
				<span
					class="terminal-title terminal-title-measurer"
					aria-hidden="true"
					bind:this={terminalTitleMeasurer}
				></span>
				{#if currentView === 'post'}
					<button
						type="button"
						class="terminal-close-button"
						aria-label="close blog reader"
						onclick={closePostView}
					>
						X
					</button>
				{:else if photographyBrowserVisible && photographyCollectionSlug}
					<button
						type="button"
						class="terminal-close-button terminal-panel-close-button"
						aria-label="close active terminal panel"
						onclick={closeActiveTerminalPanel}
					>
						X
					</button>
				{/if}
			</div>
			{#if currentView === 'post'}
				{#if selectedFullPost}
					<PostReader post={selectedFullPost} blocks={postViewBlocks} />
				{:else}
					<div class="terminal-viewport">
						<pre
							class="terminal-output-line text-[var(--tx-2)]">loading {selectedPost.path}...</pre>
					</div>
				{/if}
			{:else}
				<div
					bind:this={terminalViewport}
					class="terminal-viewport"
					aria-live="polite"
					role="application"
					onpointerdown={focusPrompt}
				>
					<div bind:this={terminalScrollback} class="terminal-scrollback">
						{#each history as line, index (index)}
							{#if line.kind === 'prompt'}
								<div class="mb-[14px]">
									<div class="leading-[1.45] text-[var(--tx)]">
										<span
											class="text-[var(--cyan)] max-[760px]:text-[0px] max-[760px]:after:text-[16px] max-[760px]:after:content-['~']"
										>
											{line.cwd}
										</span>
									</div>
									<div class="terminal-prompt-line">
										<span class="text-[var(--yellow)]">❯</span>
										<span>{line.command}</span>
									</div>
								</div>
							{:else if line.kind === 'links'}
								<RouteLinks path={line.path} entries={line.entries} />
							{:else if line.kind === 'socials'}
								<SocialLinks />
							{:else if line.kind === 'projects'}
								<ProjectsTable />
							{:else if line.kind === 'banner'}
								<WelcomeBanner {posts} onCommand={runShortcut} />
							{:else if line.kind === 'help'}
								<HelpPanel />
							{:else if line.kind === 'not-found'}
								<NotFoundPanel path={line.path} onCommand={runShortcut} />
							{:else}
								<pre
									class={`terminal-output-line ${line.kind === 'success' ? 'text-[var(--green)]' : line.kind === 'error' ? 'text-[var(--red)]' : line.kind === 'muted' ? 'text-[var(--tx-2)]' : ''}`}>{line.text}</pre>
							{/if}
						{/each}
					</div>

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
							initialQuery={photographyQuery}
							initialCollectionSlug={photographyCollectionSlug}
							initialPhotoSlug={photographyPhotoSlug}
							bind:inputRef={photographyInput}
							onClose={closePhotographyBrowser}
							onCollectionOpen={openPhotographyCollection}
							onCollectionClose={closePhotographyCollection}
							onPhotoOpen={openPhotographyPhotograph}
							onPhotoClose={closePhotographyPhotograph}
						/>
					{/if}

					{#if !blogBrowserVisible && !photographyBrowserVisible}
						<div class="terminal-command-dock">
							<div class="terminal-shortcuts" aria-label="quick commands">
								{#each mobileShortcuts as command (command)}
									<button
										type="button"
										class="terminal-shortcut-button"
										onpointerdown={preservePromptFocus}
										onclick={() => runShortcut(command)}
									>
										{command}
									</button>
								{/each}
							</div>

							<PromptForm
								cwd={formatPromptPath(cwd)}
								bind:input
								bind:inputRef={promptInput}
								onKeydown={handlePromptKeydown}
								onSubmit={submit}
								onAutocomplete={autocompletePrompt}
								onDismissKeyboard={dismissMobileKeyboard}
							/>
						</div>
					{/if}
				</div>
			{/if}
		</article>
	</section>
</main>
