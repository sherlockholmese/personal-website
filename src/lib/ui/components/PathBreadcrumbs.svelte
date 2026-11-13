<!--
	@component
	Shell-style path breadcrumbs: `~ / blog / ctf / writeup`. Each ancestor segment is
	a link (via `hrefFor`) or a button (via `onNavigate`); the last segment is current.
	Paths under `/home/sherlock` collapse to `~`.
-->
<script lang="ts">
	let {
		path,
		home = '/home/sherlock',
		hrefFor,
		onNavigate,
		class: className = ''
	}: {
		path: string;
		home?: string;
		/** Already resolved URL for a segment's absolute virtual path. */
		hrefFor?: (segmentPath: string) => string;
		onNavigate?: (segmentPath: string) => void;
		class?: string;
	} = $props();

	let segments = $derived.by(() => {
		const normalized = path.replace(/\/+$/, '') || '/';
		const underHome = normalized === home || normalized.startsWith(`${home}/`);
		const base = underHome ? home : '';
		const rest = (underHome ? normalized.slice(home.length) : normalized)
			.split('/')
			.filter(Boolean);
		const root = { label: underHome ? '~' : '/', path: underHome ? home : '/' };
		return [
			root,
			...rest.map((label, index) => ({
				label,
				path: `${base}/${rest.slice(0, index + 1).join('/')}`
			}))
		];
	});
</script>

<nav class={['ui-breadcrumbs', className]} aria-label="path">
	<ol>
		{#each segments as segment, index (segment.path)}
			<li>
				{#if index > 0}<span class="ui-breadcrumbs-sep" aria-hidden="true">/</span>{/if}
				{#if index === segments.length - 1}
					<span class="ui-breadcrumbs-current" aria-current="location">{segment.label}</span>
				{:else if hrefFor}
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
					<a href={hrefFor(segment.path)}>{segment.label}</a>
				{:else if onNavigate}
					<button type="button" onclick={() => onNavigate(segment.path)}>{segment.label}</button>
				{:else}
					<span>{segment.label}</span>
				{/if}
			</li>
		{/each}
	</ol>
</nav>

<style>
	ol {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		margin: 0;
		padding: 0;
		color: var(--info);
		line-height: 1.45;
		list-style: none;
	}

	li {
		display: inline-flex;
		min-width: 0;
		align-items: center;
	}

	.ui-breadcrumbs-sep {
		padding-inline: var(--space-1);
		color: var(--text-muted);
	}

	a,
	button {
		display: inline-flex;
		min-height: var(--target-min);
		align-items: center;
		padding: 0;
		background: transparent;
		color: var(--link);
		text-decoration: none;
	}

	@media (hover: hover) {
		a:hover,
		button:hover {
			color: var(--accent);
			text-decoration: underline;
			text-underline-offset: var(--underline-offset);
		}
	}

	a:active,
	button:active {
		color: var(--accent);
	}

	.ui-breadcrumbs-current {
		color: var(--text);
		overflow-wrap: anywhere;
	}
</style>
