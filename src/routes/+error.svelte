<script lang="ts">
	import { page } from '$app/state';
	import { SITE_TITLE } from '#lib/site.ts';
	import NotFoundPanel from '#lib/terminal/components/NotFoundPanel.svelte';
</script>

<svelte:head>
	<title>{page.status === 404 ? '404' : page.status} | {SITE_TITLE}</title>
	<meta
		name="description"
		content="The requested path is not mapped to a page, post, or directory in this terminal."
	/>
</svelte:head>

<main class="workspace terminal-workspace">
	<section class="terminal-shell">
		<article class="terminal-window">
			<div class="terminal-titlebar">
				<span class="terminal-title">{SITE_TITLE} // {page.status}</span>
			</div>
			<div class="terminal-viewport">
				<div class="terminal-scrollback">
					<NotFoundPanel path={page.url.pathname} />
				</div>
			</div>
		</article>
	</section>
</main>
