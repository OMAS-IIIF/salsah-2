import { describe, expect, it, vi } from 'vitest';
import { StagingUploadError, uploadStagingImage, validateStagingImage } from './upload';

class FakeXhr {
	status = 200;
	responseText = JSON.stringify({
		iri: 'chama:StagedImage',
		assetId: 'staging-fixed',
		originalName: 'IMG_2001.HEIC',
		originalMimeType: 'image/heic',
		stagingAreaIri: 'https://chama.salsah.org/ns/Area',
		stagingFolderIri: 'https://chama.salsah.org/ns/Photos'
	});
	upload: { onprogress: ((event: ProgressEvent) => void) | null } = { onprogress: null };
	onload: (() => void) | null = null;
	onerror: (() => void) | null = null;
	onabort: (() => void) | null = null;
	method = '';
	url = '';
	headers = new Map<string, string>();
	body: FormData | null = null;

	open(method: string, url: string): void {
		this.method = method;
		this.url = url;
	}
	setRequestHeader(name: string, value: string): void {
		this.headers.set(name, value);
	}
	send(body: FormData): void {
		this.body = body;
		this.upload.onprogress?.({ lengthComputable: true, loaded: 5, total: 10 } as ProgressEvent);
		this.onload?.();
	}
	abort(): void {
		this.onabort?.();
	}
}

function image(): File {
	return new File(['image'], 'IMG_2001.HEIC', { type: 'image/heic' });
}

describe('staging image upload', () => {
	it('rejects unsupported files and files larger than the visible quota', () => {
		expect(() => validateStagingImage(new File(['x'], 'notes.txt'), null)).toThrow(
			StagingUploadError
		);
		expect(() => validateStagingImage(image(), 2)).toThrow(/quota/i);
	});

	it('sends only the selected target and verifies the response target', async () => {
		const xhr = new FakeXhr();
		const progress = vi.fn();
		const result = await uploadStagingImage(
			{
				project: 'chama',
				stagingAreaIri: 'chama:Area',
				stagingFolderIri: 'chama:Photos',
				file: image(),
				quotaBytes: 100,
				onProgress: progress
			},
			{
				accessToken: () => 'access-token',
				renewToken: async () => null,
				mediaBaseUrl: () => 'http://media.test',
				xhr: () => xhr as unknown as XMLHttpRequest,
				identifier: () => 'staging-fixed'
			}
		);

		expect(result.iri).toBe('chama:StagedImage');
		expect(result.stagingAreaIri).toBe('https://chama.salsah.org/ns/Area');
		expect(result.stagingFolderIri).toBe('https://chama.salsah.org/ns/Photos');
		expect(xhr.method).toBe('POST');
		expect(xhr.url).toBe('http://media.test/upload');
		expect(xhr.headers.get('Authorization')).toBe('Bearer access-token');
		expect(xhr.body?.get('resourceClass')).toBe('shared:StagingMediaObject');
		expect(xhr.body?.get('stagingAreaIri')).toBe('chama:Area');
		expect(xhr.body?.get('stagingFolderIri')).toBe('chama:Photos');
		expect(xhr.body?.has('path')).toBe(false);
		expect(xhr.body?.has('attachedToRole')).toBe(false);
		expect(progress).toHaveBeenCalledWith(50);
	});
});
