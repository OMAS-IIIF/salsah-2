import { get, writable } from 'svelte/store';
import { getApiBaseUrl } from '$lib/api/baseUrl';
import type { AuthenticatedUser, AuthSessionState } from './types';

interface AccessTokenResponse {
	accessToken: string;
}

export const authSession = writable<AuthSessionState>({
	status: 'initializing',
	user: null,
	accessToken: null
});

let restorePromise: Promise<boolean> | null = null;
let renewalPromise: Promise<string | null> | null = null;

function accessTokenFromResponse(value: unknown): string {
	if (!value || typeof value !== 'object') throw new Error('Invalid authentication response.');
	const token = (value as Partial<AccessTokenResponse>).accessToken;
	if (typeof token !== 'string' || !token)
		throw new Error('Authentication returned no access token.');
	return token;
}

/** Read the subject claim without treating unverified client-side claims as authorization. */
export function userIdFromAccessToken(token: string): string {
	try {
		const payloadPart = token.split('.')[1];
		if (!payloadPart) throw new Error();
		const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
		const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))) as {
			sub?: unknown;
		};
		if (typeof payload.sub !== 'string' || !payload.sub.trim()) throw new Error();
		return payload.sub;
	} catch {
		throw new Error('The access token contains no valid user identity.');
	}
}

async function responseMessage(response: Response): Promise<string | null> {
	try {
		const value = (await response.json()) as { message?: unknown };
		return typeof value.message === 'string' ? value.message : null;
	} catch {
		return null;
	}
}

async function fetchUser(
	baseUrl: string,
	userId: string,
	accessToken: string
): Promise<AuthenticatedUser> {
	const response = await fetch(`${baseUrl}/admin/user/${encodeURIComponent(userId)}`, {
		headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` }
	});
	if (!response.ok)
		throw new Error(
			(await responseMessage(response)) ?? `User profile request failed (HTTP ${response.status}).`
		);
	const value = (await response.json()) as Partial<AuthenticatedUser>;
	if (!value.userId || !value.userIri || !value.givenName || !value.familyName) {
		throw new Error('The OLDAP user profile is incomplete.');
	}
	return {
		userIri: value.userIri,
		userId: value.userId,
		givenName: value.givenName,
		familyName: value.familyName,
		email: value.email ?? '',
		isActive: value.isActive ?? false,
		inProjects: value.inProjects ?? [],
		hasRole: value.hasRole ?? {}
	};
}

async function establishSession(
	baseUrl: string,
	accessToken: string,
	userId?: string
): Promise<void> {
	const resolvedUserId = userId ?? userIdFromAccessToken(accessToken);
	const user = await fetchUser(baseUrl, resolvedUserId, accessToken);
	authSession.set({ status: 'authenticated', user, accessToken });
}

/** Authenticate a named OLDAP user and keep the short-lived access token in memory only. */
export async function login(userId: string, password: string): Promise<void> {
	const baseUrl = getApiBaseUrl();
	const response = await fetch(`${baseUrl}/admin/auth/${encodeURIComponent(userId)}`, {
		method: 'POST',
		credentials: 'include',
		headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
		body: JSON.stringify({ password })
	});
	if (!response.ok) {
		if ([401, 403, 404].includes(response.status)) throw new Error('LOGIN_INVALID');
		if (response.status === 503) throw new Error('LOGIN_UNAVAILABLE');
		throw new Error((await responseMessage(response)) ?? `Login failed (HTTP ${response.status}).`);
	}
	await establishSession(baseUrl, accessTokenFromResponse(await response.json()), userId);
}

/** Restore the browser session through the HttpOnly refresh cookie exactly once. */
export function restoreSession(): Promise<boolean> {
	if (get(authSession).status === 'authenticated') return Promise.resolve(true);
	if (restorePromise) return restorePromise;

	restorePromise = (async () => {
		try {
			const baseUrl = getApiBaseUrl();
			const response = await fetch(`${baseUrl}/admin/auth/refresh`, {
				method: 'POST',
				credentials: 'include',
				headers: { Accept: 'application/json' }
			});
			if (!response.ok) {
				authSession.set({ status: 'anonymous', user: null, accessToken: null });
				return false;
			}
			await establishSession(baseUrl, accessTokenFromResponse(await response.json()));
			return true;
		} catch {
			authSession.set({ status: 'anonymous', user: null, accessToken: null });
			return false;
		} finally {
			restorePromise = null;
		}
	})();
	return restorePromise;
}

/**
 * Renew the in-memory access token through the HttpOnly refresh cookie.
 * Concurrent callers share one request so an expired token cannot trigger a
 * refresh storm from several resource requests.
 */
export function renewAccessToken(): Promise<string | null> {
	if (renewalPromise) return renewalPromise;

	renewalPromise = (async () => {
		try {
			const baseUrl = getApiBaseUrl();
			const response = await fetch(`${baseUrl}/admin/auth/refresh`, {
				method: 'POST',
				credentials: 'include',
				headers: { Accept: 'application/json' }
			});
			if (!response.ok) {
				authSession.set({ status: 'anonymous', user: null, accessToken: null });
				return null;
			}
			const accessToken = accessTokenFromResponse(await response.json());
			await establishSession(baseUrl, accessToken);
			return accessToken;
		} catch {
			authSession.set({ status: 'anonymous', user: null, accessToken: null });
			return null;
		} finally {
			renewalPromise = null;
		}
	})();

	return renewalPromise;
}

/** Revoke the cookie-backed session and always clear in-memory credentials. */
export async function logout(): Promise<void> {
	try {
		await fetch(`${getApiBaseUrl()}/admin/auth/logout`, {
			method: 'POST',
			credentials: 'include',
			headers: { Accept: 'application/json' }
		});
	} finally {
		authSession.set({ status: 'anonymous', user: null, accessToken: null });
	}
}

/** Return the current access token for later authenticated API clients. */
export function currentAccessToken(): string | null {
	const session = get(authSession);
	return session.status === 'authenticated' ? session.accessToken : null;
}
