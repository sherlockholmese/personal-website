<!--
	@component
	The window body: a scrolling viewport holding the scrollback (`children`) and anything
	pinned after it, such as a command dock or panel (`after`).

	`live` announces new scrollback to screen readers as a log. `contained` hands
	scrolling to a full-size panel rendered in `after`.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		ref = $bindable<HTMLDivElement | undefined>(),
		scrollbackRef = $bindable<HTMLDivElement | undefined>(),
		live = false,
		contained = false,
		class: className = '',
		children,
		after,
		...rest
	}: {
		ref?: HTMLDivElement;
		scrollbackRef?: HTMLDivElement;
		live?: boolean;
		contained?: boolean;
		class?: string;
		children: Snippet;
		after?: Snippet;
	} & HTMLAttributes<HTMLDivElement> = $props();
</script>

<div
	bind:this={ref}
	class={['ui-viewport ui-scroll', className]}
	class:ui-viewport-contained={contained}
	{...rest}
>
	<div
		bind:this={scrollbackRef}
		class="ui-scrollback ui-scroll"
		role={live ? 'log' : undefined}
		aria-label={live ? 'terminal output' : undefined}
	>
		{@render children()}
	</div>
	{@render after?.()}
</div>

<style>
	.ui-viewport {
		position: relative;
		display: flex;
		min-height: 0;
		flex: 1;
		flex-direction: column;
		padding: var(--space-2) calc(var(--space-3) + var(--space-half));
		overflow: auto;
	}

	.ui-viewport-contained {
		/* Panels own their scrolling; terminal scroll offsets must not clip their headers. */
		overflow: clip;
	}

	.ui-scrollback {
		display: contents;
	}

	@media (max-width: 760px) {
		.ui-viewport {
			padding: 0;
			overflow: hidden;
		}

		.ui-scrollback {
			display: block;
			min-height: 0;
			flex: 1;
			padding: var(--space-3) var(--space-2) var(--space-2);
			overflow: auto;
		}
	}
</style>
