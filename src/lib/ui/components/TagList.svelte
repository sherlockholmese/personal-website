<!--
	@component
	Post tags as `#tag` text that wraps with its surroundings and inherits the surrounding
	color, so it stays legible on selected rows.
-->
<script lang="ts">
	let { tags, class: className = '' }: { tags: readonly string[]; class?: string } = $props();
</script>

<span class={['ui-tags', className]}>
	{#each tags as tag, index (`${tag}:${index}`)}
		<span class="ui-tag">#{tag}</span>
	{/each}
</span>

<style>
	.ui-tags {
		display: inline-flex;
		min-width: 0;
		flex-wrap: wrap;
		gap: var(--space-half) var(--space-2);
	}

	.ui-tag {
		min-width: 0;
		overflow-wrap: anywhere;
	}
</style>
