import { currentAccessToken, renewAccessToken } from '$lib/auth/session';

/** Error returned when no authenticated OLDAP request can be made. */
export class AuthenticationRequiredError extends Error {
	constructor() {
		super('An authenticated OLDAP session is required.');
		this.name = 'AuthenticationRequiredError';
	}
}

function authorizedRequest(request: Request, accessToken: string): Request {
	const headers = new Headers(request.headers);
	headers.set('Authorization', `Bearer ${accessToken}`);
	return new Request(request, { headers });
}

/**
 * Fetch an OLDAP resource with the current in-memory access token.
 *
 * One 401 response triggers the shared cookie-backed token renewal and a
 * single retry. Request cloning keeps this boundary usable for later JSON
 * writes without attempting to consume a request body twice.
 */
export async function authenticatedFetch(
	input: RequestInfo | URL,
	init?: RequestInit
): Promise<Response> {
	const accessToken = currentAccessToken();
	if (!accessToken) throw new AuthenticationRequiredError();

	const request = new Request(input, init);
	let response = await fetch(authorizedRequest(request.clone(), accessToken));
	if (response.status !== 401) return response;

	const renewedToken = await renewAccessToken();
	if (!renewedToken) throw new AuthenticationRequiredError();
	response = await fetch(authorizedRequest(request.clone(), renewedToken));
	return response;
}
