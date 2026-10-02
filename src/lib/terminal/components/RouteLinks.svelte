<script lang="ts">
	import { resolve } from '$app/paths';

	let {
		path,
		entries
	}: { path: string; entries: { name: string; directory: boolean; url: string }[] } = $props();
</script>

<div class="my-[4px] mb-[14px] grid gap-[4px]">
	<div class="flex flex-wrap gap-[5px] px-[14px] pt-[6px] text-[15px] text-[var(--tx-2)]">
		<span class="text-[var(--green)]">listing</span>
		<span>{path}</span>
	</div>
	{#each entries as entry (entry.url)}
		<a
			href={resolve(entry.url.slice(1) as `blog/${string}`)}
			class="text-[var(--cyan)] no-underline hover:text-[var(--yellow)]"
		>
			{entry.name}
		</a>
	{/each}
</div>
