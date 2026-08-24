/** Add a short-lived media capability without overwriting existing query parameters. */
export function withMediaCapability(url: string, capability: string | null): string {
	if (!capability) return url;
	const authorizedUrl = new URL(url);
	authorizedUrl.searchParams.set('token', capability);
	return authorizedUrl.toString();
}
