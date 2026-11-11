import type { Attachment } from 'svelte/attachments';

/**
 * Reveals an image whole once it has loaded and decoded, instead of letting the browser paint it
 * in strips as bytes arrive. Mark the `<img>` with `data-reveal` so it starts hidden from the
 * server render, and attach this with its source so a new source hides it again:
 * `<img data-reveal {@attach revealImage(src)} />`. `tokens.css` owns the hidden state and fade.
 */
export function revealImage(source?: string): Attachment<HTMLImageElement> {
	void source;
	return (image) => {
		let current = true;

		function reveal() {
			if (!image.naturalWidth) return;
			// Decoding first keeps the fade from stalling on a large image's first paint.
			void image
				.decode()
				.catch(() => {})
				.then(() => {
					if (current) image.dataset.loaded = '';
				});
		}

		delete image.dataset.loaded;
		image.addEventListener('load', reveal);
		// A cached or hydrated image may have loaded before this ran. Wait a microtask so a source
		// change in the same update has been applied before checking.
		queueMicrotask(() => {
			if (current && image.complete) reveal();
		});

		return () => {
			current = false;
			image.removeEventListener('load', reveal);
		};
	};
}
