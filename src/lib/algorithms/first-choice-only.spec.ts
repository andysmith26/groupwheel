import { describe, it, expect } from 'vitest';
import { assignFirstChoiceOnly } from './first-choice-only';
import type { AssignmentOptions } from './types';
import type { Group, Student, StudentPreference } from '$lib/domain';

function makeGroup(id: string, name: string, capacity: number | null = null): Group {
  return { id, name, capacity, memberIds: [] };
}

function makeStudent(id: string): Student {
  return { id, firstName: id };
}

function makePref(studentId: string, likeGroupIds: string[]): StudentPreference {
  return { studentId, likeGroupIds, avoidStudentIds: [], avoidGroupIds: [] };
}

function makeOptions(overrides?: Partial<AssignmentOptions>): AssignmentOptions {
  const groups = overrides?.groups ?? [makeGroup('g1', 'Art'), makeGroup('g2', 'Music')];
  const studentOrder = overrides?.studentOrder ?? ['alice', 'bob', 'carol'];
  const studentsById = overrides?.studentsById ?? {
    alice: makeStudent('alice'),
    bob: makeStudent('bob'),
    carol: makeStudent('carol')
  };

  return {
    groups,
    studentOrder,
    preferencesById: overrides?.preferencesById ?? {},
    studentsById,
    seed: overrides?.seed ?? 42,
    ...overrides
  };
}

describe('assignFirstChoiceOnly', () => {
  it('should assign students to their first choice', () => {
    const result = assignFirstChoiceOnly(
      makeOptions({
        preferencesById: {
          alice: makePref('alice', ['g1']),
          bob: makePref('bob', ['g2']),
          carol: makePref('carol', ['g1'])
        }
      })
    );

    const artMembers = result.groups.find((g) => g.id === 'g1')!.memberIds;
    const musicMembers = result.groups.find((g) => g.id === 'g2')!.memberIds;

    expect(artMembers).toContain('alice');
    expect(artMembers).toContain('carol');
    expect(musicMembers).toContain('bob');
    expect(result.unassignedStudentIds).toHaveLength(0);
  });

  it('should leave students without preferences unassigned', () => {
    const result = assignFirstChoiceOnly(
      makeOptions({
        preferencesById: {
          alice: makePref('alice', ['g1'])
        }
      })
    );

    expect(result.unassignedStudentIds).toContain('bob');
    expect(result.unassignedStudentIds).toContain('carol');
  });

  it('should leave students with empty likeGroupIds unassigned', () => {
    const result = assignFirstChoiceOnly(
      makeOptions({
        preferencesById: {
          alice: makePref('alice', [])
        }
      })
    );

    expect(result.unassignedStudentIds).toContain('alice');
  });

  it('should ignore capacity limits', () => {
    const result = assignFirstChoiceOnly(
      makeOptions({
        groups: [makeGroup('g1', 'Art', 1), makeGroup('g2', 'Music', 1)],
        preferencesById: {
          alice: makePref('alice', ['g1']),
          bob: makePref('bob', ['g1']),
          carol: makePref('carol', ['g1'])
        }
      })
    );

    const artMembers = result.groups.find((g) => g.id === 'g1')!.memberIds;
    expect(artMembers).toHaveLength(3);
  });

  it('should find groups by name (case-insensitive) when ID does not match', () => {
    const result = assignFirstChoiceOnly(
      makeOptions({
        groups: [makeGroup('g1', 'Art Club'), makeGroup('g2', 'Music')],
        preferencesById: {
          alice: makePref('alice', ['art club'])
        }
      })
    );

    const artMembers = result.groups.find((g) => g.id === 'g1')!.memberIds;
    expect(artMembers).toContain('alice');
  });

  it('should leave students unassigned when their first choice group does not exist', () => {
    const result = assignFirstChoiceOnly(
      makeOptions({
        preferencesById: {
          alice: makePref('alice', ['nonexistent-group'])
        }
      })
    );

    expect(result.unassignedStudentIds).toContain('alice');
  });

  it('should produce deterministic results with same seed', () => {
    const opts = makeOptions({
      preferencesById: {
        alice: makePref('alice', ['g1']),
        bob: makePref('bob', ['g1']),
        carol: makePref('carol', ['g2'])
      },
      seed: 123
    });

    const result1 = assignFirstChoiceOnly(opts);
    const result2 = assignFirstChoiceOnly(opts);

    expect(result1.groups.map((g) => g.memberIds)).toEqual(result2.groups.map((g) => g.memberIds));
  });

  it('should start with empty memberIds', () => {
    const groups = [
      { ...makeGroup('g1', 'Art'), memberIds: ['existing-student'] },
      makeGroup('g2', 'Music')
    ];

    const result = assignFirstChoiceOnly(
      makeOptions({
        groups,
        preferencesById: {
          alice: makePref('alice', ['g1'])
        }
      })
    );

    // The existing memberIds should be cleared
    const artMembers = result.groups.find((g) => g.id === 'g1')!.memberIds;
    expect(artMembers).not.toContain('existing-student');
    expect(artMembers).toContain('alice');
  });
});
