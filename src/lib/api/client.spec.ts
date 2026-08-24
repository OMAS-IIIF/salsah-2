import { get } from 'svelte/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authSession } from '$lib/auth/session';
import { authenticatedFetch, AuthenticationRequiredError } from './client';

vi.mock('$lib/api/baseUrl', () => ({ getApiBaseUrl: () => 'https://api.example' }));

const user = {
	userIri: 'urn:uuid:researcher',
	userId: 'researcher',
	givenName: 'Ada',
	familyName: 'Archivist',
	email: '',
	isActive: true,
	inProjects: [],
	hasRole: {}
};

function tokenWithSubject(subject: string): string {
	const payload = btoa(JSON.stringify({ sub: subject }))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
	return `header.${payload}.signature`;
}

describe('authenticatedFetch', () => {
	afterEach(() => {
		authSession.set({ status: 'anonymous', user: null, accessToken: null });
		vi.unstubAllGlobals();
	});

	it('rejects requests without an authenticated session', async () => {
		await expect(authenticatedFetch('https://api.example/data/test/item')).rejects.toBeInstanceOf(
			AuthenticationRequiredError
		);
	});

	it('shares one renewal across concurrent 401 responses and retries with the new token', async () => {
		authSession.set({ status: 'authenticated', user, accessToken: 'expired-token' });
		let refreshCalls = 0;
		const renewedToken = tokenWithSubject('researcher');
		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: RequestInfo | URL) => {
				const request = input instanceof Request ? input : new Request(input);
				if (request.url === 'https://api.example/admin/auth/refresh') {
					refreshCalls += 1;
					await Promise.resolve();
					return Response.json({ accessToken: renewedToken });
				}
				if (request.url === 'https://api.example/admin/user/researcher') {
					return Response.json(user);
				}
				return request.headers.get('Authorization') === `Bearer ${renewedToken}`
					? Response.json({ ok: true })
					: Response.json({ message: 'expired' }, { status: 401 });
			})
		);

		const responses = await Promise.all([
			authenticatedFetch('https://api.example/data/test/one'),
			authenticatedFetch('https://api.example/data/test/two')
		]);

		expect(refreshCalls).toBe(1);
		expect(responses.map(({ status }) => status)).toEqual([200, 200]);
		expect(get(authSession)).toMatchObject({
			status: 'authenticated',
			accessToken: renewedToken
		});
	});
});
