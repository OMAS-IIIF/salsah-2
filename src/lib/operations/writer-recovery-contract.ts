/** Closed browser projections of WR-03. Runtime evidence never enters this contract. */
export interface RecoveryCapabilities {
	enabled: boolean;
	canRecover: boolean;
}
export interface RecoveryStatus {
	state: 'free' | 'occupied' | 'recovery_required' | 'recovery_in_progress' | 'store_unavailable';
	revision?: string;
	startedAt?: string;
	operationId?: string;
}
export interface RecoveryOperation {
	operationId: string;
	state: 'awaiting_operator' | 'controller_blocked' | 'ready' | 'completed';
	requestedAt: string;
	reason: string;
	canFinish: boolean;
	completedAt?: string;
}
export interface RecoveryAttempt {
	operationId: string;
	expectedRevision: string;
	reason: string;
}
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function record(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value))
		throw new Error('Invalid recovery response');
	return value as Record<string, unknown>;
}
export function parseCapabilities(value: unknown): RecoveryCapabilities {
	const v = record(value);
	if (
		typeof v.enabled !== 'boolean' ||
		typeof v.canRecover !== 'boolean' ||
		(!v.enabled && v.canRecover)
	)
		throw new Error('Invalid capabilities');
	return v as unknown as RecoveryCapabilities;
}
export function parseAttempt(value: unknown): RecoveryAttempt {
	const v = record(value);
	if (
		typeof v.operationId !== 'string' ||
		!uuidPattern.test(v.operationId) ||
		typeof v.expectedRevision !== 'string' ||
		!/^[0-9a-f]{64}$/.test(v.expectedRevision) ||
		typeof v.reason !== 'string' ||
		v.reason.trim().length < 10 ||
		v.reason.length > 2000
	)
		throw new Error('Invalid saved recovery');
	return { operationId: v.operationId, expectedRevision: v.expectedRevision, reason: v.reason };
}
export function parseStatus(value: unknown): RecoveryStatus {
	const v = record(value);
	if (
		![
			'free',
			'occupied',
			'recovery_required',
			'recovery_in_progress',
			'store_unavailable'
		].includes(String(v.state))
	)
		throw new Error('Invalid status');
	if (
		['occupied', 'recovery_required'].includes(String(v.state)) &&
		(typeof v.revision !== 'string' ||
			!/^[0-9a-f]{64}$/.test(v.revision) ||
			typeof v.startedAt !== 'string' ||
			!Number.isFinite(Date.parse(v.startedAt)))
	)
		throw new Error('Invalid owner revision');
	if (
		v.state === 'recovery_in_progress' &&
		(typeof v.operationId !== 'string' || !uuidPattern.test(v.operationId))
	)
		throw new Error('Invalid recovery ID');
	return v as unknown as RecoveryStatus;
}
export function parseOperation(value: unknown): RecoveryOperation {
	const v = record(value);
	if (
		typeof v.operationId !== 'string' ||
		!uuidPattern.test(v.operationId) ||
		!['awaiting_operator', 'controller_blocked', 'ready', 'completed'].includes(String(v.state)) ||
		v.canFinish !== (v.state === 'ready') ||
		typeof v.reason !== 'string' ||
		typeof v.requestedAt !== 'string' ||
		!Number.isFinite(Date.parse(v.requestedAt))
	)
		throw new Error('Invalid operation');
	return v as unknown as RecoveryOperation;
}
