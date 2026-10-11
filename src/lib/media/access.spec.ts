import { expect, it, vi } from 'vitest';
import { authenticatedFetch } from '$lib/api/client';
import { assertIiifServiceIdentity, managedImageTarget, loadMediaCapability } from './access';
import { localIiifUrl } from './baseUrl';
vi.mock('$env/dynamic/public', () => ({
	env: { PUBLIC_MEDIA_URL: 'https://media.test', PUBLIC_API_URL: 'https://api.test' }
}));
vi.mock('$lib/api/client', () => ({ authenticatedFetch: vi.fn() }));
it('keeps IIIF prefixes, isolates credentials and rejects other origins', () => {
	expect(
		managedImageTarget(
			'https://media.test/iiif/3/project/sub/a%20b/full/max/0/default.jpg?token=stale'
		)?.assetId
	).toBe('a b');
	expect(managedImageTarget('https://external.test/iiif/3/a/info.json')).toBeNull();
	expect(localIiifUrl('https://old-deployment.test/iiif/3/a/info.json')).toBe(
		'https://media.test/iiif/3/a/info.json'
	);
	expect(() =>
		assertIiifServiceIdentity('https://media.test/iiif/3/a/info.json', {
			id: 'https://external.test/iiif/3/a'
		})
	).toThrow();
	expect(() =>
		assertIiifServiceIdentity('https://media.test/iiif/3/a/info.json', {
			'@id': 'https://media.test/iiif/3/a'
		})
	).not.toThrow();
});
it('uses the existing authenticated API boundary and validates returned capabilities', async () => {
	const token =
		'h.' +
		btoa(JSON.stringify({ typ: 'media', id: 'a', exp: Math.floor(Date.now() / 1000) + 60 })) +
		'.s';
	vi.mocked(authenticatedFetch).mockResolvedValueOnce(Response.json({ token }));
	expect((await loadMediaCapability('a')).token).toBe(token);
	expect(authenticatedFetch).toHaveBeenLastCalledWith(
		'https://api.test/data/mediaobject/id/a',
		expect.objectContaining({ redirect: 'error' })
	);
	vi.mocked(authenticatedFetch).mockResolvedValueOnce(Response.json({}, { status: 403 }));
	await expect(loadMediaCapability('a')).rejects.toThrow();
	vi.mocked(authenticatedFetch).mockResolvedValueOnce(Response.json({ token }));
	await expect(loadMediaCapability('b')).rejects.toThrow();
});

it('rejects conflicting IIIF v2/v3 identifiers before tile authorization', () => {
	expect(() =>
		assertIiifServiceIdentity('https://media.test/iiif/3/a/info.json', {
			id: 'https://media.test/iiif/3/a',
			'@id': 'https://external.test/a'
		})
	).toThrow();
});
