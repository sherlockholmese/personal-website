export type ImageMetadata = { camera?: string; date?: string; width?: number; height?: number };

// Read only camera/date/dimensions. GPS, serial numbers, and other EXIF fields are omitted.
export function readImageMetadata(bytes: Uint8Array): ImageMetadata {
	try {
		const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
		if (view.getUint16(0) === 0xffd8) {
			let offset = 2;
			const result: ImageMetadata = {};
			while (offset + 4 <= bytes.length && bytes[offset] === 0xff) {
				const marker = bytes[offset + 1];
				if (marker === 0xda || marker === 0xd9) break;
				if (marker === 0xff) {
					offset++;
					continue;
				}
				if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
					offset += 2;
					continue;
				}
				const length = view.getUint16(offset + 2);
				if (length < 2 || offset + 2 + length > bytes.length) break;
				if (marker === 0xe1 && text(bytes, offset + 4, 6) === 'Exif\0\0') {
					mergeDefined(result, readTiff(bytes.subarray(offset + 10, offset + 2 + length)));
				} else if (
					marker === 0xe1 &&
					text(bytes, offset + 4, 29) === 'http://ns.adobe.com/xap/1.0/\0'
				) {
					mergeDefined(result, readXmp(text(bytes, offset + 4, length - 2)));
				}
				if (
					[0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(
						marker
					) &&
					length >= 7
				) {
					result.height = view.getUint16(offset + 5);
					result.width = view.getUint16(offset + 7);
				}
				offset += length + 2;
			}
			return result;
		}
		if (view.getUint32(0) === 0x89504e47) {
			const result: ImageMetadata = { width: view.getUint32(16), height: view.getUint32(20) };
			for (let offset = 8; offset + 12 <= bytes.length;) {
				const length = view.getUint32(offset);
				if (offset + length + 12 > bytes.length) break;
				if (text(bytes, offset + 4, 4) === 'eXIf')
					mergeDefined(result, readTiff(bytes.subarray(offset + 8, offset + 8 + length)));
				offset += length + 12;
			}
			return result;
		}
		if (text(bytes, 0, 4) === 'RIFF' && text(bytes, 8, 4) === 'WEBP') {
			for (let offset = 12; offset + 8 <= bytes.length;) {
				const length = view.getUint32(offset + 4, true);
				if (offset + 8 + length > bytes.length) break;
				if (text(bytes, offset, 4) === 'EXIF') {
					const start = offset + 8;
					return readTiff(
						bytes.subarray(text(bytes, start, 6) === 'Exif\0\0' ? start + 6 : start, start + length)
					);
				}
				offset += 8 + length + (length % 2);
			}
		}
	} catch {
		// A truncated or malformed metadata block must not prevent viewing the image.
	}
	return {};
}

function readTiff(bytes: Uint8Array): ImageMetadata {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const byteOrder = text(bytes, 0, 2);
	if (byteOrder !== 'II' && byteOrder !== 'MM') return {};
	const little = byteOrder === 'II';
	if (view.getUint16(2, little) !== 42) return {};
	const values = new Map<number, string | number>();
	const visited = new Set<number>();
	function readDirectory(offset: number) {
		if (visited.has(offset) || visited.size >= 4 || offset + 2 > bytes.length) return;
		visited.add(offset);
		const count = view.getUint16(offset, little);
		for (let index = 0; index < count; index++) {
			const entry = offset + 2 + index * 12;
			if (entry + 12 > bytes.length) break;
			const tag = view.getUint16(entry, little);
			if (![0x010f, 0x0110, 0x0132, 0x8769, 0x9003, 0xa002, 0xa003, 0xa434].includes(tag)) continue;
			const format = view.getUint16(entry + 2, little);
			const count = view.getUint32(entry + 4, little);
			const size = format === 2 ? count : format === 3 ? count * 2 : format === 4 ? count * 4 : 0;
			if (!size || size > 4096) continue;
			const start = size <= 4 ? entry + 8 : view.getUint32(entry + 8, little);
			if (start + size > bytes.length) continue;
			const value =
				format === 2
					? text(bytes, start, size).replace(/\0.*$/, '').trim()
					: format === 3
						? view.getUint16(start, little)
						: view.getUint32(start, little);
			if (tag === 0x8769 && typeof value === 'number') readDirectory(value);
			else values.set(tag, value);
		}
	}
	readDirectory(view.getUint32(4, little));
	const make = String(values.get(0x010f) ?? '');
	const model = String(values.get(0x0110) ?? '');
	const lens = String(values.get(0xa434) ?? '');
	const camera = [
		model.toLowerCase().startsWith(make.toLowerCase())
			? model
			: [make, model].filter(Boolean).join(' '),
		lens
	]
		.filter(Boolean)
		.join(' · ');
	const captured = String(values.get(0x9003) ?? values.get(0x0132) ?? '');
	const dateMatch = captured.match(/^(\d{4}):(\d{2}):(\d{2}) /);
	return {
		camera: camera || undefined,
		date: dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : undefined,
		width: typeof values.get(0xa002) === 'number' ? Number(values.get(0xa002)) : undefined,
		height: typeof values.get(0xa003) === 'number' ? Number(values.get(0xa003)) : undefined
	};
}

function text(bytes: Uint8Array, offset: number, length: number) {
	return new TextDecoder().decode(bytes.subarray(offset, offset + length));
}

function mergeDefined(target: ImageMetadata, source: ImageMetadata) {
	for (const [name, value] of Object.entries(source)) {
		if (value !== undefined) Object.assign(target, { [name]: value });
	}
}

function readXmp(xml: string): ImageMetadata {
	const value = (name: string) => {
		return (
			xml.match(new RegExp(`${name}=["']([^"']*)["']`))?.[1] ??
			xml.match(new RegExp(`<${name}>([^<]*)</${name}>`))?.[1] ??
			''
		)
			.replace(/&amp;/g, '&')
			.replace(/&quot;/g, '"')
			.replace(/&apos;/g, "'")
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.trim();
	};
	const make = value('tiff:Make');
	const model = value('tiff:Model');
	const lens = value('aux:Lens') || value('exifEX:LensModel');
	const camera = [
		model.toLowerCase().startsWith(make.toLowerCase())
			? model
			: [make, model].filter(Boolean).join(' '),
		lens
	]
		.filter(Boolean)
		.join(' · ');
	const captured = value('exif:DateTimeOriginal') || value('xmp:CreateDate');
	const date = captured.match(/^(\d{4})[:-](\d{2})[:-](\d{2})[ T]/);
	return {
		camera: camera || undefined,
		date: date ? `${date[1]}-${date[2]}-${date[3]}` : undefined
	};
}
