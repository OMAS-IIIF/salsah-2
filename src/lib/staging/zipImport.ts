import { authenticatedFetch } from '$lib/api/client';
import { getApiBaseUrl } from '$lib/api/baseUrl';
import { OldapResourceError } from '$lib/resources/client';
import { parseZipImportReport, type ZipImportReport } from './zipImportReport';

export const MAX_ZIP_IMPORT_BYTES = 500_000_000;

export const ZIP_IMPORT_STATES = [
	'UPLOADING',
	'VALIDATING',
	'READY',
	'IMPORTING',
	'IMPORTED',
	'INVALID',
	'FAILED',
	'CANCELLED',
	'EXPIRED'
] as const;

export type ZipImportState = (typeof ZIP_IMPORT_STATES)[number];

export interface ZipImportJob {
	importId: string;
	state: ZipImportState;
	stateVersion: number;
	createdAt: string;
	updatedAt: string;
	expiresAt?: string;
	target: {
		projectShortName: string;
		stagingAreaIri: string;
		stagingAreaName: string;
		targetRootFolderIri: string;
		targetRootFolderName: string;
	};
	originalFileName: string;
	declaredCompressedSizeBytes: number;
	actualCompressedSizeBytes?: number;
	extractedSizeBytes?: number;
	reportAvailable: boolean;
	canConfirm: boolean;
	cleanupPending: boolean;
	failureCode?: string;
}

export interface ZipImportUploadAuthorization {
	url: string;
	method: 'PUT';
	contentType: 'application/zip';
	bearerToken: string;
	expiresAt: string;
	maxBytes: number;
}

export interface ZipImportUploadReceipt {
	importId: string;
	uploadRequestId: string;
	storedAt: string;
	sizeBytes: number;
	sha256: string;
	stateNotification: 'PENDING' | 'DELIVERED';
}

export interface StartZipImportOptions {
	project: string;
	stagingAreaIri: string;
	targetRootFolderIri: string;
	file: File;
	onProgress?: (percent: number) => void;
	signal?: AbortSignal;
}

export interface StartedZipImport {
	job: ZipImportJob;
	receipt: ZipImportUploadReceipt;
}

export interface ZipImportJobPage {
	items: ZipImportJob[];
	nextCursor?: string;
}

export type ZipImportFileProblem = 'name' | 'extension' | 'empty' | 'size';

interface ZipImportDependencies {
	fetch: typeof authenticatedFetch;
	apiBaseUrl: () => string;
	xhr: () => XMLHttpRequest;
	requestId: () => string;
}

const defaultDependencies: ZipImportDependencies = {
	fetch: authenticatedFetch,
	apiBaseUrl: getApiBaseUrl,
	xhr: () => new XMLHttpRequest(),
	requestId: () => crypto.randomUUID()
};

/** Return the first browser-visible ZIP envelope problem, if any. */
export function zipImportFileProblem(
	file: Pick<File, 'name' | 'size'>
): ZipImportFileProblem | null {
	const name = file.name.normalize('NFC');
	if (!name || name.length > 255) return 'name';
	if (!name.toLocaleLowerCase('en-US').endsWith('.zip')) return 'extension';
	if (file.size < 1) return 'empty';
	if (file.size > MAX_ZIP_IMPORT_BYTES) return 'size';
	return null;
}

/** Validate the closed browser-visible envelope before reserving server quota. */
export function validateZipImportFile(file: Pick<File, 'name' | 'size'>): void {
	const problem = zipImportFileProblem(file);
	if (!problem) return;
	const messages: Record<ZipImportFileProblem, string> = {
		name: 'The ZIP filename must contain 1 to 255 characters.',
		extension: 'The selected file must have a .zip extension.',
		empty: 'The selected ZIP file is empty.',
		size: 'The ZIP file exceeds the 500 MB upload limit.'
	};
	const statuses: Record<ZipImportFileProblem, number> = {
		name: 400,
		extension: 415,
		empty: 400,
		size: 413
	};
	throw new OldapResourceError(messages[problem], statuses[problem]);
}

function isZipImportState(value: unknown): value is ZipImportState {
	return typeof value === 'string' && ZIP_IMPORT_STATES.includes(value as ZipImportState);
}

function parseJob(value: unknown): ZipImportJob {
	if (!value || typeof value !== 'object') {
		throw new OldapResourceError('OLDAP returned an invalid ZIP import job.', 502);
	}
	const job = value as Partial<ZipImportJob>;
	if (
		typeof job.importId !== 'string' ||
		!job.importId ||
		!isZipImportState(job.state) ||
		typeof job.stateVersion !== 'number' ||
		!Number.isInteger(job.stateVersion) ||
		!job.target ||
		typeof job.target.projectShortName !== 'string' ||
		typeof job.target.stagingAreaIri !== 'string' ||
		typeof job.target.stagingAreaName !== 'string' ||
		typeof job.target.targetRootFolderIri !== 'string' ||
		typeof job.target.targetRootFolderName !== 'string' ||
		typeof job.createdAt !== 'string' ||
		typeof job.updatedAt !== 'string' ||
		typeof job.originalFileName !== 'string' ||
		typeof job.declaredCompressedSizeBytes !== 'number' ||
		!Number.isFinite(job.declaredCompressedSizeBytes) ||
		typeof job.reportAvailable !== 'boolean' ||
		typeof job.canConfirm !== 'boolean' ||
		typeof job.cleanupPending !== 'boolean'
	) {
		throw new OldapResourceError('OLDAP returned an incomplete ZIP import job.', 502);
	}
	return job as ZipImportJob;
}

function parseAuthorization(value: unknown): ZipImportUploadAuthorization {
	if (!value || typeof value !== 'object') {
		throw new OldapResourceError('OLDAP returned no ZIP upload authorization.', 502);
	}
	const authorization = value as Partial<ZipImportUploadAuthorization>;
	if (
		typeof authorization.url !== 'string' ||
		!authorization.url ||
		authorization.method !== 'PUT' ||
		authorization.contentType !== 'application/zip' ||
		typeof authorization.bearerToken !== 'string' ||
		!authorization.bearerToken ||
		typeof authorization.maxBytes !== 'number' ||
		!Number.isFinite(authorization.maxBytes)
	) {
		throw new OldapResourceError('OLDAP returned an invalid ZIP upload authorization.', 502);
	}
	return authorization as ZipImportUploadAuthorization;
}

async function responseMessage(response: Response): Promise<string | null> {
	try {
		const value = (await response.clone().json()) as { message?: unknown };
		return typeof value.message === 'string' ? value.message : null;
	} catch {
		return null;
	}
}

/** Create an immutable, permission-checked ZIP import job for one selected folder. */
export async function createZipImportJob(
	options: StartZipImportOptions,
	dependencies: ZipImportDependencies = defaultDependencies
): Promise<{ job: ZipImportJob; upload: ZipImportUploadAuthorization }> {
	validateZipImportFile(options.file);
	const response = await dependencies.fetch(`${dependencies.apiBaseUrl()}/imports`, {
		method: 'POST',
		headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
		body: JSON.stringify({
			projectShortName: options.project,
			stagingAreaIri: options.stagingAreaIri,
			targetRootFolderIri: options.targetRootFolderIri,
			originalFileName: options.file.name.normalize('NFC'),
			compressedSizeBytes: options.file.size
		})
	});
	if (!response.ok) {
		throw new OldapResourceError(
			(await responseMessage(response)) ?? `ZIP import creation failed (HTTP ${response.status}).`,
			response.status
		);
	}
	const value = (await response.json()) as { job?: unknown; upload?: unknown };
	const job = parseJob(value.job);
	const upload = parseAuthorization(value.upload);
	if (
		job.target.projectShortName !== options.project ||
		job.originalFileName.normalize('NFC') !== options.file.name.normalize('NFC')
	) {
		throw new OldapResourceError('OLDAP returned a ZIP job for a different project or file.', 502);
	}
	return { job, upload };
}

function parseReceipt(xhr: XMLHttpRequest): ZipImportUploadReceipt {
	let value: unknown;
	try {
		value = JSON.parse(xhr.responseText);
	} catch {
		throw new OldapResourceError('The media server returned no valid ZIP receipt.', 502);
	}
	if (!value || typeof value !== 'object') {
		throw new OldapResourceError('The media server returned no valid ZIP receipt.', 502);
	}
	const receipt = value as Partial<ZipImportUploadReceipt>;
	if (
		typeof receipt.importId !== 'string' ||
		typeof receipt.uploadRequestId !== 'string' ||
		typeof receipt.storedAt !== 'string' ||
		typeof receipt.sizeBytes !== 'number' ||
		typeof receipt.sha256 !== 'string' ||
		!/^[0-9a-f]{64}$/.test(receipt.sha256) ||
		!['PENDING', 'DELIVERED'].includes(receipt.stateNotification ?? '')
	) {
		throw new OldapResourceError('The media server returned an incomplete ZIP receipt.', 502);
	}
	return receipt as ZipImportUploadReceipt;
}

function xhrMessage(xhr: XMLHttpRequest): string {
	try {
		const value = JSON.parse(xhr.responseText) as { message?: unknown; error?: unknown };
		if (typeof value.message === 'string') return value.message;
		if (typeof value.error === 'string') return value.error;
	} catch {
		// Use the stable status fallback below.
	}
	return `ZIP upload failed (HTTP ${xhr.status || 0}).`;
}

/** Stream the ZIP directly to quarantine with the dedicated short-lived capability. */
export function uploadZipImport(
	authorization: ZipImportUploadAuthorization,
	file: File,
	options: Pick<StartZipImportOptions, 'onProgress' | 'signal'>,
	dependencies: ZipImportDependencies = defaultDependencies
): Promise<ZipImportUploadReceipt> {
	if (options.signal?.aborted) {
		return Promise.reject(new DOMException('ZIP upload cancelled.', 'AbortError'));
	}
	if (file.size > authorization.maxBytes) {
		return Promise.reject(
			new OldapResourceError('The ZIP exceeds the server-authorized upload limit.', 413)
		);
	}
	return new Promise((resolve, reject) => {
		const xhr = dependencies.xhr();
		const uploadRequestId = dependencies.requestId();
		const abort = () => xhr.abort();
		const cleanup = () => options.signal?.removeEventListener('abort', abort);
		options.signal?.addEventListener('abort', abort, { once: true });
		xhr.open('PUT', authorization.url);
		xhr.timeout = 30 * 60 * 1000;
		xhr.setRequestHeader('Authorization', `Bearer ${authorization.bearerToken}`);
		xhr.setRequestHeader('Content-Type', 'application/zip');
		xhr.setRequestHeader('X-Upload-Request-Id', uploadRequestId);
		xhr.upload.onprogress = (event) => {
			const total = event.lengthComputable && event.total > 0 ? event.total : file.size;
			options.onProgress?.(Math.min(99, Math.round((event.loaded / total) * 100)));
		};
		xhr.onerror = () => {
			cleanup();
			reject(new OldapResourceError('The media server is unreachable.', 0));
		};
		xhr.onabort = () => {
			cleanup();
			reject(new DOMException('ZIP upload cancelled.', 'AbortError'));
		};
		xhr.ontimeout = () => {
			cleanup();
			reject(new OldapResourceError('The ZIP upload timed out.', 408));
		};
		xhr.onload = () => {
			cleanup();
			if (xhr.status < 200 || xhr.status >= 300) {
				reject(new OldapResourceError(xhrMessage(xhr), xhr.status));
				return;
			}
			try {
				const receipt = parseReceipt(xhr);
				if (receipt.uploadRequestId !== uploadRequestId) {
					throw new OldapResourceError(
						'The ZIP receipt belongs to a different upload request.',
						502
					);
				}
				options.onProgress?.(100);
				resolve(receipt);
			} catch (error) {
				reject(error);
			}
		};
		xhr.send(file);
	});
}

/** Create and upload one ZIP without routing its capability through token refresh. */
export async function startZipImport(
	options: StartZipImportOptions,
	dependencies: ZipImportDependencies = defaultDependencies
): Promise<StartedZipImport> {
	const created = await createZipImportJob(options, dependencies);
	const receipt = await uploadZipImport(created.upload, options.file, options, dependencies);
	if (receipt.importId !== created.job.importId) {
		throw new OldapResourceError('The ZIP receipt belongs to a different import job.', 502);
	}
	return { job: created.job, receipt };
}

/** Load one caller-owned authoritative ZIP import job. */
export async function loadZipImportJob(
	importId: string,
	dependencies: Pick<ZipImportDependencies, 'fetch' | 'apiBaseUrl'> = defaultDependencies
): Promise<ZipImportJob> {
	const response = await dependencies.fetch(
		`${dependencies.apiBaseUrl()}/imports/${encodeURIComponent(importId)}`,
		{ headers: { Accept: 'application/json' } }
	);
	if (!response.ok) {
		throw new OldapResourceError(
			(await responseMessage(response)) ?? `ZIP import status failed (HTTP ${response.status}).`,
			response.status
		);
	}
	return parseJob(await response.json());
}

/**
 * List the authenticated user's newest ZIP import jobs.
 *
 * OLDAP deliberately owns pagination and caller scoping. Project filtering remains
 * a SALSAH concern because the API contract exposes no project query parameter.
 */
export async function listZipImportJobs(
	limit = 25,
	dependencies: Pick<ZipImportDependencies, 'fetch' | 'apiBaseUrl'> = defaultDependencies
): Promise<ZipImportJobPage> {
	if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
		throw new OldapResourceError('The ZIP import page limit must be between 1 and 100.', 400);
	}
	const url = new URL(`${dependencies.apiBaseUrl()}/imports`);
	url.searchParams.set('limit', String(limit));
	const response = await dependencies.fetch(url.toString(), {
		headers: { Accept: 'application/json' }
	});
	if (!response.ok) {
		throw new OldapResourceError(
			(await responseMessage(response)) ?? `ZIP import history failed (HTTP ${response.status}).`,
			response.status
		);
	}
	const value = (await response.json()) as { items?: unknown; nextCursor?: unknown };
	if (!Array.isArray(value.items)) {
		throw new OldapResourceError('OLDAP returned an invalid ZIP import history.', 502);
	}
	if (value.nextCursor !== undefined && typeof value.nextCursor !== 'string') {
		throw new OldapResourceError('OLDAP returned an invalid ZIP import cursor.', 502);
	}
	return {
		items: value.items.map(parseJob),
		...(value.nextCursor ? { nextCursor: value.nextCursor } : {})
	};
}

/** Load and validate the protected immutable report through OLDAP. */
export async function loadZipImportReport(
	importId: string,
	dependencies: Pick<ZipImportDependencies, 'fetch' | 'apiBaseUrl'> = defaultDependencies
): Promise<ZipImportReport> {
	const response = await dependencies.fetch(
		`${dependencies.apiBaseUrl()}/imports/${encodeURIComponent(importId)}/report`,
		{ headers: { Accept: 'application/json' } }
	);
	if (!response.ok) {
		throw new OldapResourceError(
			(await responseMessage(response)) ?? `ZIP import report failed (HTTP ${response.status}).`,
			response.status
		);
	}
	const report = parseZipImportReport(await response.json());
	if (report.importId !== importId) {
		throw new OldapResourceError('OLDAP returned a report for a different ZIP import.', 502);
	}
	return report;
}

/** Confirm exactly the READY state version that the user reviewed. */
export async function confirmZipImport(
	job: ZipImportJob,
	dependencies: Pick<ZipImportDependencies, 'fetch' | 'apiBaseUrl'> = defaultDependencies
): Promise<ZipImportJob> {
	if (job.state !== 'READY') {
		throw new OldapResourceError('The ZIP import is not ready for confirmation.', 409);
	}
	const response = await dependencies.fetch(
		`${dependencies.apiBaseUrl()}/imports/${encodeURIComponent(job.importId)}/confirm`,
		{
			method: 'POST',
			headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
			body: JSON.stringify({ expectedStateVersion: job.stateVersion })
		}
	);
	if (!response.ok) {
		throw new OldapResourceError(
			(await responseMessage(response)) ??
				`ZIP import confirmation failed (HTTP ${response.status}).`,
			response.status
		);
	}
	const confirmed = parseJob(await response.json());
	if (confirmed.importId !== job.importId || confirmed.state !== 'IMPORTING') {
		throw new OldapResourceError('OLDAP returned an invalid ZIP confirmation result.', 502);
	}
	return confirmed;
}

/** Return whether validation or import execution still needs browser polling. */
export function shouldPollZipImport(state: ZipImportState): boolean {
	return ['UPLOADING', 'VALIDATING', 'IMPORTING'].includes(state);
}
