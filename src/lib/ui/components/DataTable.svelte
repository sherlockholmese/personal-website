<!--
	@component
	Responsive table in the style of the `projects` listing: a native `<table>` with ruled
	rows that stack into labelled blocks below 760px.

	Give `href` to make each row a link (the first cell carries the anchor and stretches
	over the row). Use the `cell` snippet for custom cell rendering and `empty` for the
	no-results state.
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

	function text(row: Row, column: DataTableColumn<Row>) {
		if (column.value) return column.value(row);
		const record = row as Record<string, unknown>;
		return String(record[column.key] ?? '');
	}
</script>

<table class={['ui-table', className]} class:ui-table-linked={href} aria-label={label}>
	<colgroup>
		{#each columns as column (column.key)}
			<col style:width={column.width} />
		{/each}
	</colgroup>
	<thead>
		<tr>
			{#each columns as column (column.key)}
				<th scope="col">{column.label}</th>
			{/each}
		</tr>
	</thead>
	<tbody>
		{#each rows as row (rowKey(row))}
			<tr>
				{#each columns as column, index (column.key)}
					<td style:--ui-tone={column.tone ? toneColor[column.tone] : undefined}>
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
					</td>
				{/each}
			</tr>
		{:else}
			<tr>
				<td class="ui-table-empty" colspan={columns.length}>
					{#if empty}{@render empty()}{:else}no results{/if}
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<style>
	.ui-table {
		width: 100%;
		border-collapse: collapse;
		table-layout: fixed;
	}

	th {
		padding: var(--space-1) var(--ui-panel-inset, var(--space-2));
		border-bottom: 1px solid var(--border);
		color: var(--heading-3);
		font-weight: 400;
		text-align: start;
	}

	tbody tr {
		position: relative;
		border-bottom: 1px solid var(--border);
	}

	tbody tr:last-child {
		border-bottom: 0;
	}

	td {
		padding: var(--space-2) var(--ui-panel-inset, var(--space-2));
		color: var(--ui-tone, var(--text));
		line-height: 1.4;
		overflow-wrap: anywhere;
		vertical-align: top;
	}

	.ui-table-cell-label {
		display: none;
	}

	.ui-table-linked td:first-child {
		color: var(--ui-tone, var(--link));
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

	@media (hover: hover) {
		.ui-table-linked tbody tr:hover td:first-child {
			color: var(--accent);
		}
	}

	.ui-table-link:focus-visible {
		outline: none;
	}

	tbody tr:has(.ui-table-link:focus-visible) {
		outline: var(--focus-width) solid var(--focus);
		outline-offset: calc(-1 * var(--focus-width));
	}

	.ui-table-empty {
		color: var(--text-muted);
	}

	@media (max-width: 760px) {
		.ui-table,
		tbody,
		tbody tr,
		td {
			display: block;
			width: 100%;
		}

		colgroup,
		thead {
			display: none;
		}

		tbody tr {
			padding-block: var(--space-2);
		}

		td {
			padding-block: var(--space-half);
		}

		td:not(:first-child) .ui-table-cell-label {
			display: inline;
			margin-right: 1ch;
			color: var(--text-muted);
		}
	}
</style>
