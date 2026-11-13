<!--
	@component
	Text link in the site's two link styles:

	- `variant="inline"` (default): blue underlined prose link that turns cyan on hover.
	- `variant="plain"`: cyan, no underline, accent on hover, as used by listings.

	Pass internal paths through `resolve()` from `$app/paths` before handing them in.
	`external` opens in a new tab with `rel="external noreferrer"`.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes } from 'svelte/elements';

	let {
		href,
		variant = 'inline',
		external = false,
		class: className = '',
		children,
		...rest
	}: {
		href: string;
		variant?: 'inline' | 'plain';
		external?: boolean;
		class?: string;
		children: Snippet;
	} & Omit<HTMLAnchorAttributes, 'href'> = $props();
</script>

<!-- Callers resolve internal paths; this component also serves external and mailto links. -->
<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
<a
	{href}
	class={['ui-link', `ui-link-${variant}`, className]}
	target={external ? '_blank' : undefined}
	rel={external ? 'external noreferrer' : undefined}
	{...rest}
>
	{@render children()}
</a>

<style>
	.ui-link {
		overflow-wrap: anywhere;
	}

	.ui-link-inline {
		color: var(--link-inline);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--link-inline) 65%, transparent);
		text-underline-offset: var(--underline-offset);
	}

	.ui-link-inline:focus-visible {
		color: var(--link);
		text-decoration-color: var(--link);
	}

	.ui-link-plain {
		color: var(--link);
		text-decoration: none;
	}

	.ui-link-plain:focus-visible {
		color: var(--accent);
	}

	@media (hover: hover) {
		.ui-link-inline:hover {
			color: var(--link);
			text-decoration-color: var(--link);
		}

		.ui-link-plain:hover {
			color: var(--accent);
		}
	}
</style>
