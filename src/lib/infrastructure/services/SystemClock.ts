import type { Clock } from '$lib/application/ports/Clock';

/**
 * Clock implementation that returns the current system time.
 */
export class SystemClock implements Clock {
	now(): Date {
		return new Date();
	}
}
