import { describe, it, expect, beforeEach } from 'vitest';
import { getObservationTrends } from './getObservationTrends';
import { InMemoryObservationRepository } from '$lib/infrastructure/repositories/inMemory/InMemoryObservationRepository';
import { InMemorySessionRepository } from '$lib/infrastructure/repositories/inMemory/InMemorySessionRepository';
import type { Observation } from '$lib/domain/observation';
import type { Session } from '$lib/domain/session';

function makeSession(overrides: Partial<Session> & { id: string; programId: string }): Session {
	const now = new Date();
	return {
		name: 'Session',
		academicYear: '2025-2026',
		startDate: now,
		endDate: now,
		status: 'PUBLISHED',
		createdAt: now,
		...overrides
	};
}

function makeObservation(
	overrides: Partial<Observation> & { id: string; programId: string; groupId: string; groupName: string }
): Observation {
	return {
		content: 'test',
		createdAt: new Date(),
		...overrides
	};
}

describe('getObservationTrends', () => {
	let observationRepo: InMemoryObservationRepository;
	let sessionRepo: InMemorySessionRepository;

	beforeEach(() => {
		observationRepo = new InMemoryObservationRepository();
		sessionRepo = new InMemorySessionRepository();
	});

	it('returns empty summaries when no observations exist', async () => {
		await sessionRepo.save(makeSession({ id: 's1', programId: 'p1', createdAt: new Date('2026-01-01') }));
		await sessionRepo.save(makeSession({ id: 's2', programId: 'p1', createdAt: new Date('2026-01-02') }));
		await sessionRepo.save(makeSession({ id: 's3', programId: 'p1', createdAt: new Date('2026-01-03') }));

		const result = await getObservationTrends(
			{ observationRepo, sessionRepo },
			{ programId: 'p1' }
		);

		expect(result.status).toBe('ok');
		if (result.status !== 'ok') return;
		expect(result.value.sessionSummaries).toEqual([]);
		expect(result.value.totals).toEqual({ positive: 0, neutral: 0, negative: 0, total: 0 });
		expect(result.value.coverageRatio).toEqual({ sessionsWithObservations: 0, totalSessions: 3 });
	});

	it('computes per-session sentiment counts correctly', async () => {
		await sessionRepo.save(makeSession({ id: 's1', programId: 'p1', createdAt: new Date('2026-01-01') }));
		await sessionRepo.save(makeSession({ id: 's2', programId: 'p1', createdAt: new Date('2026-01-02') }));

		// Session 1: 2 POSITIVE, 1 NEGATIVE
		await observationRepo.save(makeObservation({ id: 'o1', programId: 'p1', sessionId: 's1', groupId: 'g1', groupName: 'Group 1', sentiment: 'POSITIVE' }));
		await observationRepo.save(makeObservation({ id: 'o2', programId: 'p1', sessionId: 's1', groupId: 'g1', groupName: 'Group 1', sentiment: 'POSITIVE' }));
		await observationRepo.save(makeObservation({ id: 'o3', programId: 'p1', sessionId: 's1', groupId: 'g2', groupName: 'Group 2', sentiment: 'NEGATIVE' }));

		// Session 2: 1 POSITIVE, 2 NEUTRAL
		await observationRepo.save(makeObservation({ id: 'o4', programId: 'p1', sessionId: 's2', groupId: 'g1', groupName: 'Group 1', sentiment: 'POSITIVE' }));
		await observationRepo.save(makeObservation({ id: 'o5', programId: 'p1', sessionId: 's2', groupId: 'g2', groupName: 'Group 2', sentiment: 'NEUTRAL' }));
		await observationRepo.save(makeObservation({ id: 'o6', programId: 'p1', sessionId: 's2', groupId: 'g2', groupName: 'Group 2', sentiment: 'NEUTRAL' }));

		const result = await getObservationTrends(
			{ observationRepo, sessionRepo },
			{ programId: 'p1' }
		);

		expect(result.status).toBe('ok');
		if (result.status !== 'ok') return;

		// Sorted chronologically (oldest first)
		expect(result.value.sessionSummaries[0].positive).toBe(2);
		expect(result.value.sessionSummaries[0].negative).toBe(1);
		expect(result.value.sessionSummaries[0].neutral).toBe(0);

		expect(result.value.sessionSummaries[1].positive).toBe(1);
		expect(result.value.sessionSummaries[1].neutral).toBe(2);
		expect(result.value.sessionSummaries[1].negative).toBe(0);
	});

	it('sessions sorted chronologically (oldest first)', async () => {
		await sessionRepo.save(makeSession({ id: 's3', programId: 'p1', createdAt: new Date('2026-01-03') }));
		await sessionRepo.save(makeSession({ id: 's1', programId: 'p1', createdAt: new Date('2026-01-01') }));
		await sessionRepo.save(makeSession({ id: 's2', programId: 'p1', createdAt: new Date('2026-01-02') }));

		await observationRepo.save(makeObservation({ id: 'o1', programId: 'p1', sessionId: 's1', groupId: 'g1', groupName: 'G1', sentiment: 'POSITIVE' }));
		await observationRepo.save(makeObservation({ id: 'o2', programId: 'p1', sessionId: 's2', groupId: 'g1', groupName: 'G1', sentiment: 'NEUTRAL' }));
		await observationRepo.save(makeObservation({ id: 'o3', programId: 'p1', sessionId: 's3', groupId: 'g1', groupName: 'G1', sentiment: 'NEGATIVE' }));

		const result = await getObservationTrends(
			{ observationRepo, sessionRepo },
			{ programId: 'p1' }
		);

		expect(result.status).toBe('ok');
		if (result.status !== 'ok') return;

		const dates = result.value.sessionSummaries.map((s) => s.sessionDate.getTime());
		expect(dates[0]).toBeLessThan(dates[1]);
		expect(dates[1]).toBeLessThan(dates[2]);
	});

	it('positiveRatio computed correctly', async () => {
		await sessionRepo.save(makeSession({ id: 's1', programId: 'p1', createdAt: new Date('2026-01-01') }));

		// 3 POSITIVE, 1 NEGATIVE → ratio = 0.75
		await observationRepo.save(makeObservation({ id: 'o1', programId: 'p1', sessionId: 's1', groupId: 'g1', groupName: 'G1', sentiment: 'POSITIVE' }));
		await observationRepo.save(makeObservation({ id: 'o2', programId: 'p1', sessionId: 's1', groupId: 'g1', groupName: 'G1', sentiment: 'POSITIVE' }));
		await observationRepo.save(makeObservation({ id: 'o3', programId: 'p1', sessionId: 's1', groupId: 'g1', groupName: 'G1', sentiment: 'POSITIVE' }));
		await observationRepo.save(makeObservation({ id: 'o4', programId: 'p1', sessionId: 's1', groupId: 'g1', groupName: 'G1', sentiment: 'NEGATIVE' }));

		const result = await getObservationTrends(
			{ observationRepo, sessionRepo },
			{ programId: 'p1' }
		);

		expect(result.status).toBe('ok');
		if (result.status !== 'ok') return;
		expect(result.value.sessionSummaries[0].positiveRatio).toBe(0.75);
	});

	it('sessionLimit caps results to most recent N sessions', async () => {
		for (let i = 1; i <= 5; i++) {
			await sessionRepo.save(makeSession({ id: `s${i}`, programId: 'p1', createdAt: new Date(`2026-01-0${i}`) }));
			await observationRepo.save(makeObservation({ id: `o${i}`, programId: 'p1', sessionId: `s${i}`, groupId: 'g1', groupName: 'G1', sentiment: 'POSITIVE' }));
		}

		const result = await getObservationTrends(
			{ observationRepo, sessionRepo },
			{ programId: 'p1', sessionLimit: 3 }
		);

		expect(result.status).toBe('ok');
		if (result.status !== 'ok') return;

		// Only the 3 most recent sessions (s3, s4, s5) should be included
		expect(result.value.sessionSummaries).toHaveLength(3);
		const sessionIds = result.value.sessionSummaries.map((s) => s.sessionId);
		expect(sessionIds).toContain('s3');
		expect(sessionIds).toContain('s4');
		expect(sessionIds).toContain('s5');
		expect(sessionIds).not.toContain('s1');
		expect(sessionIds).not.toContain('s2');
	});

	it('observations without sessionId are excluded from per-session counts', async () => {
		await sessionRepo.save(makeSession({ id: 's1', programId: 'p1', createdAt: new Date('2026-01-01') }));

		// One observation with sessionId, one without
		await observationRepo.save(makeObservation({ id: 'o1', programId: 'p1', sessionId: 's1', groupId: 'g1', groupName: 'G1', sentiment: 'POSITIVE' }));
		await observationRepo.save(makeObservation({ id: 'o2', programId: 'p1', groupId: 'g1', groupName: 'G1', sentiment: 'NEGATIVE' }));

		const result = await getObservationTrends(
			{ observationRepo, sessionRepo },
			{ programId: 'p1' }
		);

		expect(result.status).toBe('ok');
		if (result.status !== 'ok') return;

		// Only the observation with sessionId should be counted
		expect(result.value.sessionSummaries).toHaveLength(1);
		expect(result.value.sessionSummaries[0].total).toBe(1);
		expect(result.value.sessionSummaries[0].positive).toBe(1);
	});

	it('coverageRatio counts correctly', async () => {
		// 5 sessions, only 3 have observations
		for (let i = 1; i <= 5; i++) {
			await sessionRepo.save(makeSession({ id: `s${i}`, programId: 'p1', createdAt: new Date(`2026-01-0${i}`) }));
		}
		await observationRepo.save(makeObservation({ id: 'o1', programId: 'p1', sessionId: 's1', groupId: 'g1', groupName: 'G1', sentiment: 'POSITIVE' }));
		await observationRepo.save(makeObservation({ id: 'o2', programId: 'p1', sessionId: 's3', groupId: 'g1', groupName: 'G1', sentiment: 'NEUTRAL' }));
		await observationRepo.save(makeObservation({ id: 'o3', programId: 'p1', sessionId: 's5', groupId: 'g1', groupName: 'G1', sentiment: 'NEGATIVE' }));

		const result = await getObservationTrends(
			{ observationRepo, sessionRepo },
			{ programId: 'p1' }
		);

		expect(result.status).toBe('ok');
		if (result.status !== 'ok') return;
		expect(result.value.coverageRatio).toEqual({
			sessionsWithObservations: 3,
			totalSessions: 5
		});
	});
});
