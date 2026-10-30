// Geist Pixel Square 'Sherlock', sampled from the font's pixel grid. One cell per font pixel.
export const pixelMask = [
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
