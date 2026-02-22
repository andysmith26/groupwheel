import { describe, expect, it, vi } from 'vitest';
import { importWorkspacePreferences } from './import-workspace-preferences';

describe('importWorkspacePreferences', () => {
  it('uses idGenerator for new preferences and preserves existing ids', () => {
    const generateId = vi.fn(() => 'pref-new-1');

    const result = importWorkspacePreferences(
      {
        idGenerator: {
          generateId
        }
      },
      {
        programId: 'program-1',
        validStudentIds: ['stu-1', 'stu-2', 'stu-3'],
        parsedPreferences: [
          { studentId: 'stu-1', likeGroupIds: ['grp-1'], avoidStudentIds: ['stu-2'] },
          { studentId: 'stu-2', likeGroupIds: ['grp-2', 'grp-2'] },
          { studentId: 'missing-student', likeGroupIds: ['grp-1'] }
        ],
        existingPreferences: [
          {
            id: 'pref-existing-1',
            programId: 'program-1',
            studentId: 'stu-1',
            payload: {
              studentId: 'stu-1',
              likeGroupIds: [],
              avoidStudentIds: [],
              avoidGroupIds: []
            }
          }
        ]
      }
    );

    if (result.status !== 'ok') {
      throw new Error('Expected ok result');
    }

    expect(result.value.importedCount).toBe(2);
    expect(result.value.skippedCount).toBe(1);
    expect(generateId).toHaveBeenCalledTimes(1);

    const byStudent = new Map(
      result.value.preferences.map((preference) => [preference.studentId, preference])
    );
    expect(byStudent.get('stu-1')?.id).toBe('pref-existing-1');
    expect(byStudent.get('stu-2')?.id).toBe('pref-new-1');
    expect(byStudent.get('stu-2')?.payload).toEqual({
      studentId: 'stu-2',
      likeGroupIds: ['grp-2'],
      avoidStudentIds: [],
      avoidGroupIds: []
    });
  });

  it('returns invalid_preference_input for empty student id set', () => {
    const result = importWorkspacePreferences(
      {
        idGenerator: {
          generateId: () => 'pref-1'
        }
      },
      {
        programId: 'program-1',
        validStudentIds: [],
        parsedPreferences: [],
        existingPreferences: []
      }
    );

    expect(result.status).toBe('err');
    if (result.status !== 'err') return;
    expect(result.error.type).toBe('invalid_preference_input');
  });
});
