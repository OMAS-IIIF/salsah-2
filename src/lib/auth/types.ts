export interface AuthenticatedUser {
	userIri: string;
	userId: string;
	givenName: string;
	familyName: string;
	email: string;
	isActive: boolean;
	inProjects: Array<{ project: string; permissions: string[] }>;
	hasRole: Record<string, string | null>;
}

export type AuthSessionState =
	| { status: 'initializing'; user: null; accessToken: null }
	| { status: 'anonymous'; user: null; accessToken: null }
	| { status: 'authenticated'; user: AuthenticatedUser; accessToken: string };
