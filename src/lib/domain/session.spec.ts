import { describe, it, expect } from 'vitest';
import { createSession, createPublishedSession } from './session';
import type { CreateSessionParams, CreatePublishedSessionParams } from './session';

function validParams(overrides?: Partial<CreateSessionParams>): CreateSessionParams {
  return {
    id: 'session-1',
    programId: 'program-1',
    name: 'Fall Session',
    academicYear: '2024-2025',
    startDate: new Date('2024-09-01'),
    endDate: new Date('2024-12-20'),
    createdAt: new Date('2024-08-15'),
    ...overrides
  };
}

describe('createSession', () => {
  it('should create a valid session', () => {
    const session = createSession(validParams());

    expect(session.id).toBe('session-1');
    expect(session.programId).toBe('program-1');
    expect(session.name).toBe('Fall Session');
    expect(session.academicYear).toBe('2024-2025');
    expect(session.status).toBe('DRAFT');
    expect(session.scenarioId).toBeUndefined();
    expect(session.publishedAt).toBeUndefined();
  });

  it('should trim the name', () => {
    const session = createSession(validParams({ name: '  Fall Session  ' }));
    expect(session.name).toBe('Fall Session');
  });

  it('should throw for empty name', () => {
    expect(() => createSession(validParams({ name: '' }))).toThrow(
      'Session name must not be empty'
    );
  });

  it('should throw for whitespace-only name', () => {
    expect(() => createSession(validParams({ name: '   ' }))).toThrow(
      'Session name must not be empty'
    );
  });

  it('should throw if endDate is before startDate', () => {
    expect(() =>
      createSession(
        validParams({
          startDate: new Date('2024-12-20'),
          endDate: new Date('2024-09-01')
        })
      )
    ).toThrow('Session endDate must be after startDate');
  });

  it('should allow endDate equal to startDate', () => {
    const date = new Date('2024-09-01');
    const session = createSession(validParams({ startDate: date, endDate: date }));
    expect(session.startDate).toEqual(date);
    expect(session.endDate).toEqual(date);
  });

  it('should include optional createdByStaffId', () => {
    const session = createSession(validParams({ createdByStaffId: 'staff-1' }));
    expect(session.createdByStaffId).toBe('staff-1');
  });

  it('should include optional userId', () => {
    const session = createSession(validParams({ userId: 'user-123' }));
    expect(session.userId).toBe('user-123');
  });

  it('should default status to DRAFT', () => {
    const session = createSession(validParams());
    expect(session.status).toBe('DRAFT');
  });
});

function validPublishedParams(
  overrides?: Partial<CreatePublishedSessionParams>
): CreatePublishedSessionParams {
  return {
    id: 'session-pub-1',
    programId: 'program-1',
    name: 'Published Session',
    academicYear: '2024-2025',
    startDate: new Date('2024-09-01'),
    endDate: new Date('2024-12-20'),
    createdAt: new Date('2024-09-01'),
    scenarioId: 'scenario-1',
    publishedAt: new Date('2024-09-01'),
    ...overrides
  };
}

describe('createPublishedSession', () => {
  it('should create a session with PUBLISHED status', () => {
    const session = createPublishedSession(validPublishedParams());

    expect(session.id).toBe('session-pub-1');
    expect(session.status).toBe('PUBLISHED');
    expect(session.scenarioId).toBe('scenario-1');
    expect(session.publishedAt).toEqual(new Date('2024-09-01'));
  });

  it('should set all fields correctly', () => {
    const session = createPublishedSession(validPublishedParams());

    expect(session.programId).toBe('program-1');
    expect(session.name).toBe('Published Session');
    expect(session.academicYear).toBe('2024-2025');
    expect(session.startDate).toEqual(new Date('2024-09-01'));
    expect(session.endDate).toEqual(new Date('2024-12-20'));
    expect(session.createdAt).toEqual(new Date('2024-09-01'));
  });

  it('should trim the name', () => {
    const session = createPublishedSession(validPublishedParams({ name: '  Published  ' }));
    expect(session.name).toBe('Published');
  });

  it('should throw for empty name', () => {
    expect(() => createPublishedSession(validPublishedParams({ name: '' }))).toThrow(
      'Session name must not be empty'
    );
  });

  it('should throw if endDate is before startDate', () => {
    expect(() =>
      createPublishedSession(
        validPublishedParams({
          startDate: new Date('2024-12-20'),
          endDate: new Date('2024-09-01')
        })
      )
    ).toThrow('Session endDate must be after startDate');
  });

  it('should include optional publishedByStaffId', () => {
    const session = createPublishedSession(validPublishedParams({ publishedByStaffId: 'staff-1' }));
    expect(session.publishedByStaffId).toBe('staff-1');
  });

  it('should include optional userId', () => {
    const session = createPublishedSession(validPublishedParams({ userId: 'user-123' }));
    expect(session.userId).toBe('user-123');
  });
});
