export type GreetingPeriod = 'morning' | 'afternoon' | 'evening';

/** Returns the greeting period for a local wall-clock hour. */
export function getGreetingPeriod(hour: number): GreetingPeriod {
	if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
		throw new RangeError('Hour must be an integer between 0 and 23.');
	}

	if (hour >= 5 && hour < 12) return 'morning';
	if (hour >= 12 && hour < 18) return 'afternoon';
	return 'evening';
}
