import { describe, expect, it, vi } from 'vitest';
import {
	confirmZipImport,
	createZipImportJob,
	listZipImportJobs,
	loadZipImportJob,
	loadZipImportReport,
	shouldPollZipImport,
	startZipImport,
	validateZipImportFile
} from './zipImport';
import { canConfirmZipImport, parseZipImportReport } from './zipImportReport';

const importId = 'cb97109d-e7c7-4bf2-8f3c-0e68681049df';

function file(): File {
	return new File(['zip-content'], 'chama-photos.zip', { type: 'application/zip' });
}

function job(state: Parameters<typeof shouldPollZipImport>[0] = 'UPLOADING') {
	return {
		importId,
		state,
		stateVersion: state === 'UPLOADING' ? 0 : 1,
		createdAt: '2026-08-30T00:00:00Z',
		updatedAt: '2026-08-30T00:00:01Z',
		requestedByIri: 'https://example.org/users/researcher',
		target: {
			projectShortName: 'chama',
			stagingAreaIri: 'https://chama.salsah.org/ns/ChamaDemoStaging',
			stagingAreaName: 'Chama Demo Staging',
			targetRootFolderIri: 'https://chama.salsah.org/ns/ChamaOwnPhotographs',
			targetRootFolderName: 'Eigene Fotografien'
		},
		originalFileName: 'chama-photos.zip',
		declaredCompressedSizeBytes: file().size,
		quotaReservedBytes: 100,
		reportAvailable: state === 'READY',
		canConfirm: state === 'READY',
		cleanupPending: false
	};
}

class FakeXhr {
	status = 200;
	responseText = JSON.stringify({
		importId,
		uploadRequestId: 'request-id',
		storedAt: '2026-08-30T00:00:02Z',
		sizeBytes: file().size,
		sha256: 'a'.repeat(64),
		stateNotification: 'DELIVERED'
	});
	timeout = 0;
	upload: { onprogress: ((event: ProgressEvent) => void) | null } = { onprogress: null };
	onload: (() => void) | null = null;
	onerror: (() => void) | null = null;
	onabort: (() => void) | null = null;
	ontimeout: (() => void) | null = null;
	method = '';
	url = '';
	headers = new Map<string, string>();
	body: File | null = null;

	open(method: string, url: string): void {
		this.method = method;
		this.url = url;
	}
	setRequestHeader(name: string, value: string): void {
		this.headers.set(name, value);
	}
	send(body: File): void {
		this.body = body;
		this.upload.onprogress?.({ lengthComputable: true, loaded: 5, total: 10 } as ProgressEvent);
		this.onload?.();
	}
	abort(): void {
		this.onabort?.();
	}
}

function creationResponse(): Response {
	return new Response(
		JSON.stringify({
			job: job(),
			upload: {
				url: `http://media.test/imports/${importId}/sip`,
				method: 'PUT',
				contentType: 'application/zip',
				bearerToken: 'zip-capability',
				expiresAt: '2026-08-30T00:15:00Z',
				maxBytes: 500_000_000
			}
		}),
		{ status: 201, headers: { 'Content-Type': 'application/json' } }
	);
}

function report() {
	return {
		documentType: 'oldap.zip-import.report',
		schemaVersion: '1.0.0',
		importId,
		generatedAt: '2026-08-30T00:00:03Z',
		status: 'READY',
		canConfirm: true,
		expiresAt: '2026-08-31T00:00:00Z',
		target: job('READY').target,
		sip: {
			originalFileName: 'chama-photos.zip',
			sizeBytes: file().size,
			sha256: 'b'.repeat(64)
		},
		summary: {
			entriesObserved: 2,
			entriesDeclared: 2,
			inventoryComplete: true,
			files: 1,
			directories: 1,
			importableFiles: 1,
			importableDirectories: 1,
			ignoredEntries: 0,
			rejectedEntries: 0,
			warningCount: 0,
			errorCount: 0,
			compressedBytes: file().size,
			extractedBytes: 12,
			maxDepth: 2
		},
		issues: [],
		entries: [
			{
				entryIndex: 0,
				sourcePath: 'Batch/',
				normalizedPath: 'Batch/',
				entryType: 'directory',
				disposition: 'IMPORT',
				sizeBytes: 0,
				issues: []
			},
			{
				entryIndex: 1,
				sourcePath: 'Batch/IMG_2001.JPG',
				normalizedPath: 'Batch/IMG_2001.JPG',
				entryType: 'file',
				disposition: 'IMPORT',
				sizeBytes: 12,
				detectedCategory: 'image',
				detectedMimeType: 'image/jpeg',
				issues: []
			}
		],
		manifestSha256: 'c'.repeat(64),
		manifestCanonicalization: 'RFC8785'
	};
}

describe('generic ZIP staging import', () => {
	it('rejects invalid ZIP envelopes before creating a job', () => {
		expect(() => validateZipImportFile(new File([], 'empty.zip'))).toThrow(/empty/i);
		expect(() => validateZipImportFile(new File(['x'], 'photo.jpg'))).toThrow(/\.zip/i);
	});

	it('creates a project-neutral job with the selected QName target', async () => {
		const fetch = vi.fn().mockResolvedValue(creationResponse());
		const selected = file();
		const result = await createZipImportJob(
			{
				project: 'chama',
				stagingAreaIri: 'chama:ChamaDemoStaging',
				targetRootFolderIri: 'chama:ChamaOwnPhotographs',
				file: selected
			},
			{
				fetch,
				apiBaseUrl: () => 'http://api.test',
				xhr: vi.fn(),
				requestId: vi.fn()
			}
		);

		expect(fetch).toHaveBeenCalledOnce();
		expect(fetch.mock.calls[0][0]).toBe('http://api.test/imports');
		expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({
			projectShortName: 'chama',
			stagingAreaIri: 'chama:ChamaDemoStaging',
			targetRootFolderIri: 'chama:ChamaOwnPhotographs',
			originalFileName: 'chama-photos.zip',
			compressedSizeBytes: selected.size
		});
		expect(result.job.importId).toBe(importId);
	});

	it('uploads with the dedicated capability and verifies the receipt identity', async () => {
		const xhr = new FakeXhr();
		const progress = vi.fn();
		const result = await startZipImport(
			{
				project: 'chama',
				stagingAreaIri: 'chama:ChamaDemoStaging',
				targetRootFolderIri: 'chama:ChamaOwnPhotographs',
				file: file(),
				onProgress: progress
			},
			{
				fetch: vi.fn().mockResolvedValue(creationResponse()),
				apiBaseUrl: () => 'http://api.test',
				xhr: () => xhr as unknown as XMLHttpRequest,
				requestId: () => 'request-id'
			}
		);

		expect(result.receipt.importId).toBe(importId);
		expect(xhr.method).toBe('PUT');
		expect(xhr.url).toBe(`http://media.test/imports/${importId}/sip`);
		expect(xhr.headers.get('Authorization')).toBe('Bearer zip-capability');
		expect(xhr.headers.get('Content-Type')).toBe('application/zip');
		expect(xhr.headers.get('X-Upload-Request-Id')).toBe('request-id');
		expect(xhr.body?.name).toBe('chama-photos.zip');
		expect(progress.mock.calls.map(([value]) => value)).toEqual([50, 100]);
	});

	it('loads authoritative status and identifies polling states', async () => {
		const fetch = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(job('VALIDATING')), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			})
		);
		const result = await loadZipImportJob(importId, {
			fetch,
			apiBaseUrl: () => 'http://api.test'
		});
		expect(result.state).toBe('VALIDATING');
		expect(shouldPollZipImport(result.state)).toBe(true);
		expect(shouldPollZipImport('READY')).toBe(false);
	});

	it('lists caller-owned jobs through the existing paginated OLDAP contract', async () => {
		const fetch = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ items: [job('READY')], nextCursor: 'opaque-cursor' }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			})
		);
		const result = await listZipImportJobs(20, {
			fetch,
			apiBaseUrl: () => 'http://api.test'
		});

		expect(fetch.mock.calls[0][0]).toBe('http://api.test/imports?limit=20');
		expect(result.items.map((item) => item.importId)).toEqual([importId]);
		expect(result.nextCursor).toBe('opaque-cursor');
	});

	it('validates the immutable report and confirms only the reviewed state version', async () => {
		const readyJob = { ...job('READY'), canConfirm: true, stateVersion: 2 };
		const responses = [
			new Response(JSON.stringify(report()), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			}),
			new Response(
				JSON.stringify({ ...readyJob, state: 'IMPORTING', stateVersion: 3, canConfirm: false }),
				{ status: 202, headers: { 'Content-Type': 'application/json' } }
			)
		];
		const fetch = vi.fn().mockImplementation(() => Promise.resolve(responses.shift()));
		const dependencies = { fetch, apiBaseUrl: () => 'http://api.test' };

		const loadedReport = await loadZipImportReport(importId, dependencies);
		expect(canConfirmZipImport(readyJob, loadedReport)).toBe(true);
		const confirmed = await confirmZipImport(readyJob, dependencies);

		expect(confirmed.state).toBe('IMPORTING');
		expect(JSON.parse(String(fetch.mock.calls[1][1]?.body))).toEqual({ expectedStateVersion: 2 });
	});

	it('rejects contradictory report evidence before confirmation', () => {
		expect(() => parseZipImportReport({ ...report(), canConfirm: false })).toThrow(/inconsistent/i);
	});

	it('does not confuse equivalent target serializations with confirmation authorization', () => {
		const readyJob = { ...job('READY'), canConfirm: true };
		const equivalentReport = parseZipImportReport({
			...report(),
			target: {
				...report().target,
				stagingAreaIri: 'chama:ChamaDemoStaging',
				targetRootFolderIri: 'chama:ChamaOwnPhotographs'
			}
		});

		expect(canConfirmZipImport(readyJob, equivalentReport)).toBe(true);
	});
});
