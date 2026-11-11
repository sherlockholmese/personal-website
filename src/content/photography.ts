export type Photograph = {
	id: string;
	objectKey?: string;
	src: string;
	/** The smallest resized copy, shown blurred while a larger copy loads. */
	previewSrc?: string;
	thumbnailSrc?: string;
	thumbnailSrcset?: string;
	alt: string;
	date?: string;
	camera?: string;
	width?: number;
	height?: number;
};
