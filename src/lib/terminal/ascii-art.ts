// Geist Pixel Square 'Sherlock', sampled from the font's pixel grid. One cell per font pixel.
const sampledMask = [
	'   111111        11                                      111                                    11',
	' 1111111111      11                                      1111                                   11',
	' 11      111     11                                         11                                  11',
	'11        11     11                                         11                                  11',
	'11         11    11                                         11                                  11',
	'11         11    11  11111        111111      1111  111     11        111111        111111      11       11',
	'11               11 1111111      11111111     1111 1111     11       11111111      11111111     11      111',
	'111              111     111    111    111      111         11      111    111    111    111    11     111',
	' 111111          11       11    11      11      11          11      11      11    11      111   11    111',
	'   1111111       11       11   11        11     11          11     11        11  11        11   11   111',
	'      111111     11       11   11        11     11          11     11        11  11             11  111',
	'         111     11       11   111111111111     11          11     11        11  11             11 111',
	'           11    11       11   111111111111     11          11     11        11  11             1111111',
	'11         11    11       11   11               11          11     11        11  11             1111 111',
	'11         11    11       11   11               11          11     11        11  11        11   111   111',
	'11         11    11       11    11       11     11          11      11      11    11      111   11     111',
	' 11       11     11       11    111     111     11          11      111    111    111    111    11      111',
	' 11111111111     11       11     111111111    1111111    11111111    11111111      11111111     11       11',
	'   1111111       11       11      111111      1111111    11111111     111111        111111      11       11'
];

/** Thickens strokes by growing every filled cell right and down, keeping the pixel grid. */
export function emboldenMask(mask: string[], right: number, down: number): string[] {
	const columns = Math.max(...mask.map((row) => row.length)) + right;
	const grid = Array.from({ length: mask.length + down }, () => Array(columns).fill(' '));
	mask.forEach((row, y) => {
		[...row].forEach((cell, x) => {
			if (cell === ' ') return;
			for (let dy = 0; dy <= down; dy += 1) {
				for (let dx = 0; dx <= right; dx += 1) grid[y + dy][x + dx] = '1';
			}
		});
	});
	return grid.map((row) => row.join('').trimEnd());
}

export const pixelMask = emboldenMask(sampledMask, 1, 1);

// The same word hand-tuned for phones: half the resolution, so each cell can be drawn larger.
export const compactPixelMask = [
	'  111   11                   11                 11',
	' 111111 11                   111                11',
	'11   11 11                    11                11',
	'11    1 111111   1111  11111  11   1111   1111  11  11',
	'1111    111  11 11  11  11    11  11  11 11  11 11 111',
	'  11111 11   11 1    1  11    11  1    1 1    1 11111',
	'     11 11   11 111111  11    11  1    1 1      1111',
	'11    1 11   11 1       11    11  1    1 1    1 11111',
	'11   11 11   11 11  11  11    11  11  11 11  11 11  11',
	' 111111 11   11  11111 1111  1111  1111   1111  11   1'
];

const shades = '████▓▓▒';

export function renderAscii(mask: string[], seed: number, columnsPerPixel: number): string[] {
	return mask.map((row, y) =>
		[...row]
			.map((cell, x) => {
				if (cell === ' ') return ' '.repeat(columnsPerPixel);
				let value = (seed ^ Math.imul(x + 1, 0x9e3779b1) ^ Math.imul(y + 1, 0x85ebca6b)) >>> 0;
				value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
				value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
				return shades[((value ^ (value >>> 16)) >>> 0) % shades.length].repeat(columnsPerPixel);
			})
			.join('')
	);
}
