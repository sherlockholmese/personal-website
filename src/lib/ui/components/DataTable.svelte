<!--
	@component
	Responsive grid table in the style of the `projects` listing: green column headers,
	ruled rows, and single-column stacked rows below 760px.

	Give `href` to make each row a link (the first cell carries the anchor and stretches
	over the row, so the table keeps proper semantics). Use the `cell` snippet for custom
	cell rendering and `empty` for the no-results state.
-->
<script lang="ts" generics="Row">
	import type { Snippet } from 'svelte';
	import { toneColor } from '../tone';
	import type { DataTableColumn } from '../types';

	let {
		columns,
		rows,
		rowKey,
		href,
		external = false,
		label,
		class: className = '',
		cell,
		empty
	}: {
		columns: readonly DataTableColumn<Row>[];
		rows: readonly Row[];
		rowKey: (row: Row) => string | number;
		/** Already resolved URL for each row. */
		href?: (row: Row) => string;
		external?: boolean;
		/** Accessible table name. */
		label: string;
		class?: string;
		cell?: Snippet<[Row, DataTableColumn<Row>]>;
		empty?: Snippet;
	} = $props();

	let template = $derived(columns.map((column) => column.width ?? 'minmax(0, 1fr)').join(' '));

	function text(row: Row, column: DataTableColumn<Row>) {
		if (column.value) return column.value(row);
		const record = row as Record<string, unknown>;
		return String(record[column.key] ?? '');
	}
</script>

<div
	class={['ui-table', className]}
	class:ui-table-linked={href}
	role="table"
	aria-label={label}
	style:--ui-table-columns={template}
>
	<div class="ui-table-row ui-table-head" role="row">
		{#each columns as column (column.key)}
			<span role="columnheader">{column.label}</span>
		{/each}
	</div>
	{#each rows as row (rowKey(row))}
		<div class="ui-table-row" role="row">
			{#each columns as column, index (column.key)}
				<span
					class="ui-table-cell"
					role="cell"
					style:--ui-tone={column.tone ? toneColor[column.tone] : undefined}
				>
					<span class="ui-table-cell-label" aria-hidden="true">{column.label}</span>
					{#if index === 0 && href}
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
						<a
							class="ui-table-link"
							href={href(row)}
							target={external ? '_blank' : undefined}
							rel={external ? 'external noreferrer' : undefined}
						>
							{#if cell}{@render cell(row, column)}{:else}{text(row, column)}{/if}
						</a>
					{:else if cell}
						{@render cell(row, column)}
					{:else}
						{text(row, column)}
					{/if}
				</span>
			{/each}
		</div>
	{:else}
		<div class="ui-table-empty" role="row">
			<span role="cell"
				>{#if empty}{@render empty()}{:else}no results{/if}</span
			>
		</div>
	{/each}
</div>

<style>
	.ui-table {
		display: grid;
	}

	.ui-table-row {
		position: relative;
		display: grid;
		grid-template-columns: var(--ui-table-columns);
		gap: 12px;
		padding: 8px;
		border-bottom: 1px solid var(--border);
		line-height: 1.4;
	}

	.ui-table-row:last-child {
		border-bottom: 0;
	}

	.ui-table-head {
		padding-block: 6px;
		color: var(--green);
	}

	.ui-table-cell {
		min-width: 0;
		color: var(--ui-tone, var(--tx));
		overflow-wrap: anywhere;
	}

	.ui-table-cell-label {
		display: none;
	}

	.ui-table-linked .ui-table-cell:first-child {
		color: var(--ui-tone, var(--cyan));
	}

	.ui-table-link {
		color: inherit;
		text-decoration: none;
	}

	.ui-table-link::after {
		content: '';
		position: absolute;
		inset: 0;
	}

	.ui-table-linked .ui-table-row:not(.ui-table-head):hover .ui-table-cell:first-child,
	.ui-table-link:focus-visible {
		color: var(--yellow);
	}

	.ui-table-link:focus-visible {
		outline: none;
	}

	.ui-table-row:has(.ui-table-link:focus-visible) {
		outline: 2px solid var(--yellow);
		outline-offset: -2px;
	}

	.ui-table-empty {
		padding: 8px;
		color: var(--tx-2);
	}

	@media (max-width: 760px) {
		.ui-table-head {
			display: none;
		}

		.ui-table-row {
			grid-template-columns: minmax(0, 1fr);
			gap: 3px;
			padding-block: 10px;
		}

		.ui-table-cell:not(:first-child) .ui-table-cell-label {
			display: inline;
			margin-right: 1ch;
			color: var(--tx-2);
		}
	}
</style>
