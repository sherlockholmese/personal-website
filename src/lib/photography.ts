import type { Photograph } from '../content/photography';

export type { Photograph } from '../content/photography';

export type PhotographyRouteState = { photoSlug?: string };

/** Widths the server resizes photographs to. Anything else is refused. */
export const PHOTOGRAPH_VARIANT_WIDTHS = [240, 480, 960, 1600, 2400] as const;

/** URL of a resized WebP copy of a photograph served from `/media/photography`. */
export function photographVariantSrc(src: string, width: number) {
	return `${src}${src.includes('?') ? '&' : '?'}w=${width}`;
}

/**
 * A `srcset` of resized copies no wider than the original, plus the smallest copy as `src`.
 * Unknown dimensions offer every width; the server never enlarges.
 */
export function photographVariants(src: string, width?: number) {
	const widths = PHOTOGRAPH_VARIANT_WIDTHS.filter(
		(candidate, index) => !width || candidate <= width || index === 0
	);
	return {
		thumbnailSrc: photographVariantSrc(src, PHOTOGRAPH_VARIANT_WIDTHS[2]),
		thumbnailSrcset: widths
			.map((candidate) => `${photographVariantSrc(src, candidate)} ${candidate}w`)
			.join(', ')
	};
}

export function photographFileName(photograph: Photograph) {
	return (photograph.objectKey ?? photograph.src).split('/').at(-1) ?? photograph.id;
}

export function photographRouteSlug(photograph: Photograph) {
	return (photograph.objectKey ?? photographFileName(photograph)).replace(/\.[^.]+$/, '');
}

export function photographRoutePath(photograph: Photograph) {
	return `photography/${photographRouteSlug(photograph).split('/').map(encodeURIComponent).join('/')}`;
}

export function findPhotograph(photographs: Photograph[], photoSlug?: string) {
	if (!photoSlug) return undefined;
	const exact = photographs.find((photo) => photographRouteSlug(photo) === photoSlug);
	if (exact) return exact;
	// Support the previous flat URLs when the filename is unique.
	const matches = photographs.filter(
		(photo) => photographFileName(photo).replace(/\.[^.]+$/, '') === photoSlug
	);
	return matches.length === 1 ? matches[0] : undefined;
}

export function resolvePhotographyPath(
	path: string,
	photographs: Photograph[]
): PhotographyRouteState | undefined {
	const normalized = path.replace(/^\/+|\/+$/g, '');
	if (normalized === 'photography') return {};
	if (!normalized.startsWith('photography/')) return undefined;
	const slug = normalized.slice('photography/'.length);
	const photograph = findPhotograph(photographs, slug);
	if (photograph) return { photoSlug: photographRouteSlug(photograph) };
	// Old folder links still open the complete gallery.
	if (photographs.some((photo) => photo.objectKey?.startsWith(`${slug}/`))) return {};
	return undefined;
}
