export function pointRatio(rect: DOMRect, clientX: number, clientY: number) {
	return {
		x: clamp((clientX - rect.left) / rect.width, 0, 1),
		y: clamp((clientY - rect.top) / rect.height, 0, 1)
	};
}

export function centerElementPoint(
	scrollContainer: HTMLElement,
	target: HTMLElement,
	xRatio: number,
	yRatio: number
) {
	const scrollRect = scrollContainer.getBoundingClientRect();
	const targetRect = target.getBoundingClientRect();
	const pointX = targetRect.left + targetRect.width * xRatio;
	const pointY = targetRect.top + targetRect.height * yRatio;

	scrollContainer.scrollLeft += pointX - (scrollRect.left + scrollContainer.clientWidth / 2);
	scrollContainer.scrollTop += pointY - (scrollRect.top + scrollContainer.clientHeight / 2);
}

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}
