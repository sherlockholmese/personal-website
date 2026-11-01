import type { Tone } from './tone';

export type { Theme } from '#lib/terminal/types.ts';
export type { Tone };

export type Size = 'sm' | 'md';

export type SelectOption<T extends string = string> = {
	value: T;
	label: string;
	disabled?: boolean;
};

export type TabItem = {
	id: string;
	label: string;
	disabled?: boolean;
};

export type KeyValueItem = {
	label: string;
	value: string;
};

export type LinkItem = {
	label: string;
	href: string;
	/** Text shown in the value column; defaults to `href`. */
	value?: string;
	external?: boolean;
};

export type DataTableColumn<Row> = {
	key: string;
	label: string;
	/** Any CSS grid track size, for example `12ch` or `minmax(0, 2fr)`. */
	width?: string;
	/** Reads the cell text when no `cell` snippet is supplied. */
	value?: (row: Row) => string | number;
	tone?: Tone;
};
