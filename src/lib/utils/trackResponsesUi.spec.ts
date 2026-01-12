import { describe, expect, it } from 'vitest';
import {
	formatRelativeUpdatedLabel,
	getFilterForStatusTarget,
	getNextHeaderCollapseState
} from '$lib/utils/trackResponsesUi';

describe('trackResponsesUi', () => {
	describe('formatRelativeUpdatedLabel', () => {
		it('formats short durations as just now', () => {
			const now = new Date('2024-05-01T12:00:00Z');
			const recent = new Date('2024-05-01T11:59:40Z');
			expect(formatRelativeUpdatedLabel(recent, now)).toBe('Updated just now');
		});

		it('formats minutes, hours, and days', () => {
			const now = new Date('2024-05-01T12:00:00Z');
			expect(formatRelativeUpdatedLabel(new Date('2024-05-01T11:57:00Z'), now)).toBe(
				'Updated 3m ago'
			);
			expect(formatRelativeUpdatedLabel(new Date('2024-05-01T10:00:00Z'), now)).toBe(
				'Updated 2h ago'
			);
			expect(formatRelativeUpdatedLabel(new Date('2024-04-29T12:00:00Z'), now)).toBe(
				'Updated 2d ago'
			);
		});
	});

	describe('getFilterForStatusTarget', () => {
		it('maps status clicks to filters', () => {
			expect(getFilterForStatusTarget('all')).toBe('all');
			expect(getFilterForStatusTarget('submitted')).toBe('submitted');
			expect(getFilterForStatusTarget('ignored')).toBe('ignored');
			expect(getFilterForStatusTarget('unresolved')).toBe('not_submitted');
		});
	});

	describe('getNextHeaderCollapseState', () => {
		it('collapses when scrolling down past the threshold', () => {
			expect(
				getNextHeaderCollapseState({
					currentScrollY: 120,
					previousScrollY: 90,
					threshold: 80,
					isCollapsed: false
				})
			).toBe(true);
		});

		it('expands on scroll up', () => {
			expect(
				getNextHeaderCollapseState({
					currentScrollY: 60,
					previousScrollY: 120,
					threshold: 80,
					isCollapsed: true
				})
			).toBe(false);
		});
	});
});
