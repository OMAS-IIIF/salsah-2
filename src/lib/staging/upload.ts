import { currentAccessToken, renewAccessToken } from '$lib/auth/session';
import { getMediaBaseUrl } from '$lib/media/baseUrl';

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'heic', 'heif']);
const IMAGE_MIME_TYPES = new Set([
	'image/jpeg',
	'image/png',
	'image/heic',
	'image/heif',
	'application/octet-stream',
	''
]);

export interface StagingUploadResult {
	iri: string;
	assetId: string;
	originalName: string;
	originalMimeType: string;
	stagingAreaIri: string;
	stagingFolderIri: string;
}

export interface StagingUploadOptions {
	project: string;
	stagingAreaIri: string;
	stagingFolderIri: string;
	file: File;
	quotaBytes: number | null;
	onProgress?: (percent: number) => void;
	signal?: AbortSignal;
}

interface UploadDependencies {
	accessToken: () => string | null;
	renewToken: () => Promise<string | null>;
	mediaBaseUrl: () => string;
	xhr: () => XMLHttpRequest;
	identifier: () => string;
}

const defaultDependencies: UploadDependencies = {
	accessToken: currentAccessToken,
	renewToken: renewAccessToken,
	mediaBaseUrl: getMediaBaseUrl,
	xhr: () => new XMLHttpRequest(),
	identifier: () => `staging-${crypto.randomUUID()}`
};

/** A stable error with the HTTP status returned by the media server. */
export class StagingUploadError extends Error {
	constructor(
		message: string,
		readonly status: number
	) {
		super(message);
		this.name = 'StagingUploadError';
	}
}

/** Validate the deliberately small first increment: one still image. */
export function validateStagingImage(file: File, quotaBytes: number | null): void {
	const extension = file.name.split('.').pop()?.toLocaleLowerCase() ?? '';
	if (!IMAGE_EXTENSIONS.has(extension) || !IMAGE_MIME_TYPES.has(file.type.toLocaleLowerCase())) {
		throw new StagingUploadError('Only JPEG, PNG, HEIC, and HEIF images are supported.', 415);
	}
	if (file.size <= 0) throw new StagingUploadError('The selected file is empty.', 400);
	if (quotaBytes !== null && file.size > quotaBytes) {
		throw new StagingUploadError('The selected file exceeds the working-area quota.', 413);
	}
}

function responseMessage(xhr: XMLHttpRequest): string {
	try {
		const payload = JSON.parse(xhr.responseText) as { message?: unknown; error?: unknown };
		if (typeof payload.message === 'string') return payload.message;
		if (typeof payload.error === 'string') return payload.error;
	} catch {
		// Fall back to the transport status below.
	}
	return `Upload failed (HTTP ${xhr.status || 0}).`;
}

function send(
	options: StagingUploadOptions,
	token: string,
	identifier: string,
	dependencies: UploadDependencies
): Promise<StagingUploadResult> {
	return new Promise((resolve, reject) => {
		const xhr = dependencies.xhr();
		const abort = () => xhr.abort();
		options.signal?.addEventListener('abort', abort, { once: true });
		xhr.open('POST', `${dependencies.mediaBaseUrl()}/upload`);
		xhr.setRequestHeader('Authorization', `Bearer ${token}`);
		xhr.setRequestHeader('Accept', 'application/json');
		xhr.upload.onprogress = (event) => {
			if (event.lengthComputable) {
				options.onProgress?.(Math.min(100, Math.round((event.loaded / event.total) * 100)));
			}
		};
		xhr.onerror = () => reject(new StagingUploadError('The media server is unreachable.', 0));
		xhr.onabort = () => reject(new DOMException('Upload cancelled.', 'AbortError'));
		xhr.onload = () => {
			options.signal?.removeEventListener('abort', abort);
			if (xhr.status < 200 || xhr.status >= 300) {
				reject(new StagingUploadError(responseMessage(xhr), xhr.status));
				return;
			}
			try {
				const payload = JSON.parse(xhr.responseText) as Partial<StagingUploadResult>;
				if (
					typeof payload.iri !== 'string' ||
					typeof payload.assetId !== 'string' ||
					typeof payload.originalName !== 'string' ||
					typeof payload.originalMimeType !== 'string' ||
					typeof payload.stagingAreaIri !== 'string' ||
					payload.stagingAreaIri.length === 0 ||
					typeof payload.stagingFolderIri !== 'string' ||
					payload.stagingFolderIri.length === 0
				) {
					throw new Error('Incomplete upload response');
				}
				// OLDAP owns target authorization and may canonicalize a submitted
				// project QName into its equivalent absolute IRI. The browser checks
				// the closed response shape, but must not reject that normalization.
				resolve(payload as StagingUploadResult);
			} catch {
				reject(new StagingUploadError('The media server returned an invalid response.', 502));
			}
		};

		const form = new FormData();
		form.set('file', options.file);
		form.set('resourceClass', 'shared:StagingMediaObject');
		form.set('projectId', options.project);
		form.set('stagingAreaIri', options.stagingAreaIri);
		form.set('stagingFolderIri', options.stagingFolderIri);
		form.set('identifier', identifier);
		form.set('targetFormat', 'tiff');
		xhr.send(form);
	});
}

/** Upload one image and retry once after an expired access token. */
export async function uploadStagingImage(
	options: StagingUploadOptions,
	dependencies: UploadDependencies = defaultDependencies
): Promise<StagingUploadResult> {
	validateStagingImage(options.file, options.quotaBytes);
	if (options.signal?.aborted) throw new DOMException('Upload cancelled.', 'AbortError');
	const identifier = dependencies.identifier();
	const token = dependencies.accessToken();
	if (!token) throw new StagingUploadError('No authenticated session is available.', 401);
	try {
		return await send(options, token, identifier, dependencies);
	} catch (error) {
		if (!(error instanceof StagingUploadError) || error.status !== 401) throw error;
		const renewedToken = await dependencies.renewToken();
		if (!renewedToken) throw error;
		return send(options, renewedToken, identifier, dependencies);
	}
}
