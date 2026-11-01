<script lang="ts">
	import { resolve } from '$app/paths';
	import { LinkList } from '#lib/ui/index.ts';

	let {
		path,
		entries
	}: { path: string; entries: { name: string; directory: boolean; url: string }[] } = $props();

	let items = $derived(
		entries.map((entry) => ({
			label: entry.name,
			value: '',
			href: resolve(entry.url.slice(1) as `blog/${string}`)
		}))
	);
</script>

<LinkList title={`listing ${path}`} {items} />
