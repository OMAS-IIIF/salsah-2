import { afterEach, expect, it, vi } from 'vitest';
import { MediaCapabilitySession, readMediaCapability } from './renewal';
const jwt = (id: string, exp: number) =>
	'header.' + btoa(JSON.stringify({ typ: 'media', id, exp })) + '.signature';
afterEach(() => vi.useRealTimers());
it('binds expiry to the requested image without trusting claims as authorization', () => {
	expect(readMediaCapability(jwt('a', 100), 'a', 0).expiresAt).toBe(100000);
	expect(() => readMediaCapability(jwt('b', 100), 'a', 0)).toThrow();
	expect(() => readMediaCapability(jwt('a', 100), 'a', 100000)).toThrow();
});
it('coalesces renewals, renews before expiry and disposes timers', async () => {
	vi.useFakeTimers();
	vi.setSystemTime(0);
	const load = vi.fn(async () => ({ token: 'fresh', expiresAt: Date.now() + 10000 }));
	const apply = vi.fn();
	const fail = vi.fn();
	const session = new MediaCapabilitySession(load, apply, fail);
	await Promise.all([session.refresh(), session.refresh()]);
	expect(load).toHaveBeenCalledTimes(1);
	await vi.advanceTimersByTimeAsync(8000);
	expect(load).toHaveBeenCalledTimes(2);
	session.dispose();
	await vi.advanceTimersByTimeAsync(20000);
	expect(apply).toHaveBeenCalledTimes(2);
	expect(fail).not.toHaveBeenCalled();
});
it('bounds stalled requests and discards their late results', async () => {
	vi.useFakeTimers();
	vi.setSystemTime(0);
	let finish!: (cap: { token: string; expiresAt: number }) => void;
	const apply = vi.fn(),
		fail = vi.fn();
	const session = new MediaCapabilitySession(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
		apply,
		fail
	);
	const pending = session.refresh();
	await vi.advanceTimersByTimeAsync(10000);
	finish({ token: 'late', expiresAt: 90000 });
	await pending;
	expect(fail).toHaveBeenCalledOnce();
	expect(apply).not.toHaveBeenCalled();
});
it('renews after sleep and stops on denial instead of retrying anonymously', async () => {
	vi.useFakeTimers();
	vi.setSystemTime(0);
	const load = vi
		.fn()
		.mockResolvedValueOnce({ token: 'first', expiresAt: 10000 })
		.mockRejectedValue(new Error('403'));
	const fail = vi.fn();
	const session = new MediaCapabilitySession(load, () => {}, fail);
	await session.refresh();
	vi.setSystemTime(20000);
	session.resume();
	await vi.advanceTimersByTimeAsync(0);
	expect(fail).toHaveBeenCalledOnce();
	await vi.advanceTimersByTimeAsync(60000);
	expect(load).toHaveBeenCalledTimes(2);
});
