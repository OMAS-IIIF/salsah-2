import { OldapResourceError } from '$lib/resources/client';
import type { ZipImportJob } from './zipImport';

export type ZipImportReportStatus = 'READY' | 'INVALID' | 'FAILED';
export type ZipImportIssueSeverity = 'INFO' | 'WARNING' | 'ERROR';
export type ZipImportDisposition = 'IMPORT' | 'IGNORE' | 'REJECT';

export interface ZipImportIssue {
	code: string;
	severity: ZipImportIssueSeverity;
	blocking: boolean;
	messageKey: string;
	entryIndex?: number;
	path?: string;
}

export interface ZipImportReportSummary {
	entriesObserved: number;
	entriesDeclared?: number;
	inventoryComplete: boolean;
	files: number;
	directories: number;
	importableFiles: number;
	importableDirectories: number;
	ignoredEntries: number;
	rejectedEntries: number;
	warningCount: number;
	errorCount: number;
	compressedBytes: number;
	extractedBytes: number;
	maxDepth: number;
}

export interface ZipImportReportEntry {
	entryIndex: number;
	sourcePath: string;
	normalizedPath: string;
	entryType: 'file' | 'directory';
	disposition: ZipImportDisposition;
	sizeBytes: number;
	detectedCategory?: 'image' | 'audio' | 'video' | 'document' | 'unsupported';
	detectedMimeType?: string;
	issues: ZipImportIssue[];
}

export interface ZipImportReport {
	documentType: 'oldap.zip-import.report';
	schemaVersion: '1.0.0';
	importId: string;
	generatedAt: string;
	status: ZipImportReportStatus;
	canConfirm: boolean;
	expiresAt?: string;
	target: ZipImportJob['target'];
	sip: { originalFileName: string; sizeBytes: number; sha256: string };
	summary: ZipImportReportSummary;
	issues: ZipImportIssue[];
	entries: ZipImportReportEntry[];
	manifestSha256?: string;
	manifestCanonicalization?: 'RFC8785';
}

function record(value: unknown, name: string): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new OldapResourceError(`OLDAP returned an invalid ZIP ${name}.`, 502);
	}
	return value as Record<string, unknown>;
}

function text(value: unknown, name: string): string {
	if (typeof value !== 'string' || !value) {
		throw new OldapResourceError(`OLDAP returned an invalid ZIP report ${name}.`, 502);
	}
	return value;
}

function integer(value: unknown, name: string): number {
	if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
		throw new OldapResourceError(`OLDAP returned an invalid ZIP report ${name}.`, 502);
	}
	return value;
}

function boolean(value: unknown, name: string): boolean {
	if (typeof value !== 'boolean') {
		throw new OldapResourceError(`OLDAP returned an invalid ZIP report ${name}.`, 502);
	}
	return value;
}

function parseIssue(value: unknown): ZipImportIssue {
	const issue = record(value, 'report issue');
	const severity = issue.severity;
	if (!['INFO', 'WARNING', 'ERROR'].includes(String(severity))) {
		throw new OldapResourceError('OLDAP returned an invalid ZIP issue severity.', 502);
	}
	if (typeof issue.blocking !== 'boolean') {
		throw new OldapResourceError('OLDAP returned an invalid ZIP issue boundary.', 502);
	}
	return {
		code: text(issue.code, 'issue code'),
		severity: severity as ZipImportIssueSeverity,
		blocking: issue.blocking,
		messageKey: text(issue.messageKey, 'issue message key'),
		entryIndex:
			issue.entryIndex === undefined ? undefined : integer(issue.entryIndex, 'issue entry index'),
		path: issue.path === undefined ? undefined : text(issue.path, 'issue path')
	};
}

function parseSummary(value: unknown): ZipImportReportSummary {
	const summary = record(value, 'report summary');
	return {
		entriesObserved: integer(summary.entriesObserved, 'observed entry count'),
		entriesDeclared:
			summary.entriesDeclared === undefined
				? undefined
				: integer(summary.entriesDeclared, 'declared entry count'),
		inventoryComplete: boolean(summary.inventoryComplete, 'inventory state'),
		files: integer(summary.files, 'file count'),
		directories: integer(summary.directories, 'directory count'),
		importableFiles: integer(summary.importableFiles, 'importable file count'),
		importableDirectories: integer(summary.importableDirectories, 'importable directory count'),
		ignoredEntries: integer(summary.ignoredEntries, 'ignored entry count'),
		rejectedEntries: integer(summary.rejectedEntries, 'rejected entry count'),
		warningCount: integer(summary.warningCount, 'warning count'),
		errorCount: integer(summary.errorCount, 'error count'),
		compressedBytes: integer(summary.compressedBytes, 'compressed byte count'),
		extractedBytes: integer(summary.extractedBytes, 'extracted byte count'),
		maxDepth: integer(summary.maxDepth, 'maximum depth')
	};
}

function parseEntry(value: unknown): ZipImportReportEntry {
	const entry = record(value, 'report entry');
	if (!['file', 'directory'].includes(String(entry.entryType))) {
		throw new OldapResourceError('OLDAP returned an invalid ZIP entry type.', 502);
	}
	if (!['IMPORT', 'IGNORE', 'REJECT'].includes(String(entry.disposition))) {
		throw new OldapResourceError('OLDAP returned an invalid ZIP entry disposition.', 502);
	}
	if (
		entry.detectedCategory !== undefined &&
		!['image', 'audio', 'video', 'document', 'unsupported'].includes(String(entry.detectedCategory))
	) {
		throw new OldapResourceError('OLDAP returned an invalid ZIP content category.', 502);
	}
	if (!Array.isArray(entry.issues)) {
		throw new OldapResourceError('OLDAP returned invalid ZIP entry issues.', 502);
	}
	return {
		entryIndex: integer(entry.entryIndex, 'entry index'),
		sourcePath: text(entry.sourcePath, 'source path'),
		normalizedPath: text(entry.normalizedPath, 'normalized path'),
		entryType: entry.entryType as 'file' | 'directory',
		disposition: entry.disposition as ZipImportDisposition,
		sizeBytes: integer(entry.sizeBytes, 'entry byte count'),
		detectedCategory: entry.detectedCategory as ZipImportReportEntry['detectedCategory'],
		detectedMimeType:
			entry.detectedMimeType === undefined
				? undefined
				: text(entry.detectedMimeType, 'detected MIME type'),
		issues: entry.issues.map(parseIssue)
	};
}

/** Validate the immutable v1 ZIP report before it controls a confirmation action. */
export function parseZipImportReport(value: unknown): ZipImportReport {
	const report = record(value, 'report');
	if (
		report.documentType !== 'oldap.zip-import.report' ||
		report.schemaVersion !== '1.0.0' ||
		!['READY', 'INVALID', 'FAILED'].includes(String(report.status)) ||
		typeof report.canConfirm !== 'boolean' ||
		!Array.isArray(report.issues) ||
		!Array.isArray(report.entries)
	) {
		throw new OldapResourceError('OLDAP returned an unsupported ZIP report.', 502);
	}
	const target = record(report.target, 'report target');
	const sip = record(report.sip, 'report SIP');
	const status = report.status as ZipImportReportStatus;
	const expiresAt = report.expiresAt === undefined ? undefined : text(report.expiresAt, 'expiry');
	const manifestSha256 =
		report.manifestSha256 === undefined
			? undefined
			: text(report.manifestSha256, 'manifest checksum');
	if (
		(status === 'READY') !== report.canConfirm ||
		(status === 'READY') !== Boolean(expiresAt) ||
		(status !== 'FAILED') !== Boolean(manifestSha256) ||
		(status !== 'FAILED') !== (report.manifestCanonicalization === 'RFC8785') ||
		!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
			text(report.importId, 'import ID')
		) ||
		!/^[0-9a-f]{64}$/.test(text(sip.sha256, 'SIP checksum')) ||
		(manifestSha256 !== undefined && !/^[0-9a-f]{64}$/.test(manifestSha256))
	) {
		throw new OldapResourceError('OLDAP returned inconsistent ZIP report evidence.', 502);
	}
	return {
		documentType: 'oldap.zip-import.report',
		schemaVersion: '1.0.0',
		importId: report.importId as string,
		generatedAt: text(report.generatedAt, 'generation time'),
		status,
		canConfirm: report.canConfirm,
		expiresAt,
		target: {
			projectShortName: text(target.projectShortName, 'target project'),
			stagingAreaIri: text(target.stagingAreaIri, 'staging-area IRI'),
			stagingAreaName: text(target.stagingAreaName, 'staging-area name'),
			targetRootFolderIri: text(target.targetRootFolderIri, 'target-folder IRI'),
			targetRootFolderName: text(target.targetRootFolderName, 'target-folder name')
		},
		sip: {
			originalFileName: text(sip.originalFileName, 'SIP filename'),
			sizeBytes: integer(sip.sizeBytes, 'SIP byte count'),
			sha256: sip.sha256 as string
		},
		summary: parseSummary(report.summary),
		issues: report.issues.map(parseIssue),
		entries: report.entries.map(parseEntry),
		manifestSha256,
		manifestCanonicalization: report.manifestCanonicalization === 'RFC8785' ? 'RFC8785' : undefined
	};
}

/**
 * Decide whether the UI may offer the confirmation request.
 *
 * This is deliberately only an identity and lifecycle consistency check. OLDAP
 * remains authoritative for expiry, current authorization, target integrity,
 * quota, collisions, and the optimistic state version when the request arrives.
 */
export function canConfirmZipImport(job: ZipImportJob, report: ZipImportReport | null): boolean {
	if (!report) return false;
	return job.state === 'READY' && report.importId === job.importId && report.status === 'READY';
}
