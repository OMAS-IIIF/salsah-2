import { describe, expect, it } from 'vitest';
import { userIdFromAccessToken } from './session';

function tokenWithPayload(payload: object): string {
	const encoded = btoa(JSON.stringify(payload))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
	return `header.${encoded}.signature`;
}

describe('userIdFromAccessToken', () => {
	it('reads the OLDAP subject from a JWT payload', () => {
		expect(userIdFromAccessToken(tokenWithPayload({ sub: 'researcher' }))).toBe('researcher');
	});

	it.each(['invalid', tokenWithPayload({}), tokenWithPayload({ sub: '' })])(
		'rejects a token without a usable subject',
		(token) => {
			expect(() => userIdFromAccessToken(token)).toThrow('valid user identity');
		}
	);
});
