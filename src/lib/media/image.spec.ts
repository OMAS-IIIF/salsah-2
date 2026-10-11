import { afterEach, expect, it, vi } from 'vitest';
import { writable } from 'svelte/store';
import type { AuthSessionState } from '$lib/auth/types';
import { authSession } from '$lib/auth/session';
import { loadMediaCapability } from './access';
import { authorizedImage, IMAGE_PLACEHOLDER } from './image';
vi.mock('$env/dynamic/public', () => ({ env: { PUBLIC_MEDIA_URL: 'https://media.test' } }));
vi.mock('$lib/auth/session', () => ({
	authSession: writable({ status: 'anonymous', user: null, accessToken: null })
}));
vi.mock('./access', async (original) => ({
	...(await original<typeof import('./access')>()),
	loadMediaCapability: vi.fn()
}));
afterEach(() => {
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});
it('acquires only near the viewport, isolates reader changes and ignores disposed requests', async () => {
	let intersect!: (entries: { isIntersecting: boolean }[]) => void;
	const doc = Object.assign(new EventTarget(), { hidden: false });
	vi.stubGlobal('document', doc);
	vi.stubGlobal('window', new EventTarget());
	vi.stubGlobal(
		'IntersectionObserver',
		class {
			constructor(callback: typeof intersect) {
				intersect = callback;
			}
			observe() {}
			disconnect() {}
		}
	);
	const image = Object.assign(new EventTarget(), {
		src: '',
		referrerPolicy: ''
	}) as unknown as HTMLImageElement;
	const login = (id: string, token = 'access') =>
		authSession.set({
			status: 'authenticated',
			accessToken: token,
			user: { userIri: id, userId: id }
		} as AuthSessionState);
	login('unknown');
	vi.mocked(loadMediaCapability).mockResolvedValue({
		token: 'fresh',
		expiresAt: Date.now() + 60000
	});
	const binding = authorizedImage(
		image,
		'https://media.test/iiif/3/a/full/max/0/default.jpg?token=stale'
	);
	expect(image.src).toBe(IMAGE_PLACEHOLDER);
	expect(loadMediaCapability).not.toHaveBeenCalled();
	intersect([{ isIntersecting: true }]);
	await Promise.resolve();
	await Promise.resolve();
	expect(image.src).toContain('token=fresh');
	login('unknown', 'rotated');
	expect(loadMediaCapability).toHaveBeenCalledTimes(1);
	let resolve!: (cap: { token: string; expiresAt: number }) => void;
	vi.mocked(loadMediaCapability).mockImplementation(
		() =>
			new Promise((r) => {
				resolve = r;
			})
	);
	login('editor');
	expect(image.src).toBe(IMAGE_PLACEHOLDER);
	binding.destroy();
	resolve({ token: 'late', expiresAt: Date.now() + 60000 });
	await Promise.resolve();
	expect(image.src).toBe(IMAGE_PLACEHOLDER);
});

it('uses a complete transparent one-pixel GIF for deferred images', () => {
	const gif = Buffer.from(IMAGE_PLACEHOLDER.split(',')[1], 'base64');
	expect(gif.subarray(0, 6).toString()).toBe('GIF89a');
	expect(gif.readUInt16LE(6)).toBe(1);
	expect(gif.readUInt16LE(8)).toBe(1);
	// Global palette, transparent graphics control, LZW sub-block and terminator.
	expect(gif[10] & 0x80).toBeTruthy();
	expect(gif.includes(Buffer.from([0x21, 0xf9, 4, 1]))).toBe(true);
	expect([...gif.subarray(-5)]).toEqual([2, 1, 0x44, 0, 0x3b]);
});
