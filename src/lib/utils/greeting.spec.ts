import { describe, expect, it } from 'vitest';
import { getGreetingPeriod } from './greeting';

describe('getGreetingPeriod', () => {
	it.each([
		[5, 'morning'],
		[11, 'morning'],
		[12, 'afternoon'],
		[17, 'afternoon'],
		[18, 'evening'],
		[4, 'evening']
	] as const)('maps hour %i to %s', (hour, expected) => {
		expect(getGreetingPeriod(hour)).toBe(expected);
	});

	it.each([-1, 24, 2.5])('rejects invalid hour %s', (hour) => {
		expect(() => getGreetingPeriod(hour)).toThrow(RangeError);
	});
});
