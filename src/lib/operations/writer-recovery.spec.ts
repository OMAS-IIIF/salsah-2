import { describe, it, expect, vi } from 'vitest';
import { parseAttempt, parseStatus, parseOperation } from './writer-recovery-contract';
import { begin, finish, operation } from './writer-recovery';
const fetchMock = vi.hoisted(() => vi.fn());
vi.mock('$lib/api/client', () => ({ authenticatedFetch: fetchMock }));
vi.mock('$lib/api/baseUrl', () => ({ getApiBaseUrl: () => 'http://fixture.test' }));
const id = 'a0f8b171-5dd9-4010-957f-e401e45c99a8';
const result = {
	operationId: id,
	state: 'ready',
	canFinish: true,
	requestedAt: '2026-09-10T00:00:00Z',
	reason: 'Reviewed interruption'
};
describe('writer recovery', () => {
	it('keeps exact retries and does not accept evidence or runtime targets', async () => {
		const attempt = {
			operationId: id,
			expectedRevision: 'a'.repeat(64),
			reason: 'Reviewed interruption'
		};
		expect(parseAttempt({ ...attempt, evidence: true })).toEqual(attempt);
		fetchMock.mockResolvedValue({ ok: true, json: async () => result });
		await begin(attempt);
		await begin(attempt);
		expect(fetchMock.mock.calls[0][1].body).toBe(fetchMock.mock.calls[1][1].body);
		await finish(id);
		expect(fetchMock.mock.lastCall?.[1].body).toBe('{}');
		await operation(id);
		expect(fetchMock.mock.lastCall?.[1].method).toBe('GET');
	});
	it('rejects malformed diagnostics and premature release flags', () => {
		expect(() => parseStatus({ state: 'occupied' })).toThrow();
		expect(() => parseOperation({ ...result, state: 'awaiting_operator' })).toThrow();
	});
});
