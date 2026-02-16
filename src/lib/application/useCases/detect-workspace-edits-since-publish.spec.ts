import { describe, expect, it } from 'vitest';
import { detectWorkspaceEditsSincePublish } from './detect-workspace-edits-since-publish';

describe('detectWorkspaceEditsSincePublish', () => {
	it('returns true when publish timestamp is missing', () => {
		const result = detectWorkspaceEditsSincePublish({
			scenarioLastModifiedAt: new Date('2026-02-01T12:00:00Z'),
			latestPublishedAt: null
		});

			if (result.status !== 'ok') {
				throw new Error('Expected ok result');
			}

		expect(result.value.hasEditsSincePublish).toBe(true);
	});

	it('returns true when scenario timestamp is missing', () => {
		const result = detectWorkspaceEditsSincePublish({
			scenarioLastModifiedAt: null,
			latestPublishedAt: new Date('2026-02-01T12:00:00Z')
		});

			if (result.status !== 'ok') {
				throw new Error('Expected ok result');
			}

		expect(result.value.hasEditsSincePublish).toBe(true);
	});

	it('returns false when scenario was not modified after publish', () => {
		const result = detectWorkspaceEditsSincePublish({
			scenarioLastModifiedAt: new Date('2026-02-01T11:00:00Z'),
			latestPublishedAt: new Date('2026-02-01T12:00:00Z')
		});

			if (result.status !== 'ok') {
				throw new Error('Expected ok result');
			}

		expect(result.value.hasEditsSincePublish).toBe(false);
	});

	it('returns true when scenario was modified after publish', () => {
		const result = detectWorkspaceEditsSincePublish({
			scenarioLastModifiedAt: new Date('2026-02-01T13:00:00Z'),
			latestPublishedAt: new Date('2026-02-01T12:00:00Z')
		});

			if (result.status !== 'ok') {
				throw new Error('Expected ok result');
			}

		expect(result.value.hasEditsSincePublish).toBe(true);
	});
});
