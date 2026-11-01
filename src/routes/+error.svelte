<script lang="ts">
	import { page } from '$app/state';
	import { SITE_TITLE } from '#lib/site.ts';
	import NotFoundPanel from '#lib/terminal/components/NotFoundPanel.svelte';
	import { TerminalPage } from '#lib/ui/index.ts';
</script>

<svelte:head>
	<title>{page.status === 404 ? '404' : page.status} | {SITE_TITLE}</title>
	<meta
		name="description"
		content="The requested path is not mapped to a page, post, or directory in this terminal."
	/>
</svelte:head>

<TerminalPage title={`${SITE_TITLE} // ${page.status}`}>
	<NotFoundPanel path={page.url.pathname} status={page.status} />
</TerminalPage>
