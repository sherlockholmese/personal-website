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
	/** Rows without `href` render through the `LinkList` `row` snippet. */
	href?: string;
	/** Text shown in the value column; defaults to `href`. An empty string hides the column. */
	value?: string;
	external?: boolean;
};

export type DataTableColumn<Row> = {
	key: string;
	label: string;
	/** Any CSS length or percentage for the column. */
	width?: string;
	/** Reads the cell text when no `cell` snippet is supplied. */
	value?: (row: Row) => string | number;
	tone?: Tone;
};

export type LightboxImage = {
	src: string;
	alt: string;
	width?: number;
	height?: number;
	/** A smaller, quicker copy shown in the image's place until `src` finishes loading. */
	placeholderSrc?: string;
	/** Open zoomed in, centered on this point (0–1 ratios of the image). */
	origin?: { x: number; y: number };
};
