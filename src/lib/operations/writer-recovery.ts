/** Project-neutral recovery transport; uses SALSAH's shared authentication boundary. */
import { authenticatedFetch } from '$lib/api/client';
import { getApiBaseUrl } from '$lib/api/baseUrl';
import {
	parseCapabilities,
	parseStatus,
	parseOperation,
	type RecoveryAttempt
} from './writer-recovery-contract';
async function request(path: string, body?: unknown): Promise<unknown> {
	const response = await authenticatedFetch(`${getApiBaseUrl()}/admin/writer-recovery${path}`, {
		method: body === undefined ? 'GET' : 'POST',
		cache: 'no-store',
		signal: AbortSignal.timeout(30000),
		headers: {
			Accept: 'application/json',
			...(body === undefined ? {} : { 'Content-Type': 'application/json' })
		},
		...(body === undefined ? {} : { body: JSON.stringify(body) })
	});
	if (!response.ok) throw new Error(`Recovery HTTP ${response.status}`);
	return response.json();
}
export const storageScope = getApiBaseUrl;
export const capabilities = async () => parseCapabilities(await request('/capabilities'));
export const status = async () => parseStatus(await request('/status'));
export const operation = async (id: string) =>
	parseOperation(await request(`/operations/${encodeURIComponent(id)}`));
export const begin = async (body: RecoveryAttempt) =>
	parseOperation(await request('/operations', body));
export const finish = async (id: string) =>
	parseOperation(await request(`/operations/${encodeURIComponent(id)}/finish`, {}));
