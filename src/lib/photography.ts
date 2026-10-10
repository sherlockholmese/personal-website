import type { Photograph } from '../content/photography';

export type { Photograph } from '../content/photography';

export type PhotographyRouteState = { photoSlug?: string };

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
