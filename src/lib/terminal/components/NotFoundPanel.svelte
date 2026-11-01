<script lang="ts">
	import { resolve } from '$app/paths';
	import { Callout, CommandChip, Prompt } from '#lib/ui/index.ts';

	let {
		path,
		status = 404,
		onCommand
	}: {
		path: string;
		status?: number;
		/** Runs suggestions in place when a terminal is available. */
		onCommand?: (command: string) => void;
	} = $props();

	const commands = ['home', 'blog', 'help'];
</script>

<Callout
	tone="danger"
	code={String(status)}
	title={status === 404 ? 'No such file or directory' : 'Something went wrong'}
	headingLevel={1}
>
	<Prompt inline command={`cat ${path || '/'}`} />
	{#if status !== 404}
		<p>The server could not finish this request. Try again.</p>
	{/if}
	{#snippet actions()}
		{#if onCommand}
			{#each commands as command (command)}
				<CommandChip {command} onRun={onCommand} />
			{/each}
		{:else}
			<CommandChip command="home" href={resolve('/')} />
		{/if}
	{/snippet}
</Callout>
