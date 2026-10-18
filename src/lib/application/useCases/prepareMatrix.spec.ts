import { describe, it, expect } from 'vitest';
import { prepareChoices } from './prepareGroupingActivityImport';
import type { ParsedStudent } from './createGroupingActivity';

function student(id: string, first: string, last: string): ParsedStudent {
  return { id, firstName: first, lastName: last, displayName: `${first} ${last}` };
}

const roster = [student('ann@x.org', 'Ann', 'Lee'), student('bo@x.org', 'Bo', 'Kim')];
const header = [
  'Timestamp',
  'Email Address',
  'Your First &amp; Last Name',
  'Please Request Four Clubs: [Car Club]',
  'Please Request Four Clubs: [Book Club]',
  "Please Request Four Clubs: [Scholar's Bowl]"
].join('\t');
const row = (...c: string[]) => c.join('\t');

describe('prepareChoices matrix (Google Form)', () => {
  const text = [
    header,
    row('1/1', 'ann@x.org', 'Ann Lee', '2nd Choice', '1st Choice', ''),
    row('1/2', 'nobody@x.org', 'Nobody', '1st Choice', '', ''),
    row('1/3', 'ANN@x.org', 'Ann Lee', '1st Choice', '', '2nd Choice')
  ].join('\n');

  it('defaults to the email column, matches on id, keeps latest duplicate', () => {
    const r = prepareChoices(text, roster);
    expect(r.error).toBeUndefined();
    const m = r.matrix!;
    expect(m.idColumnIndex).toBe(1);
    expect(r.preferences).toEqual([
      { studentId: 'ann@x.org', likeGroupIds: ['Car Club', "Scholar's Bowl"] }
    ]);
    expect(r.groupNames).toEqual(['Car Club', 'Book Club', "Scholar's Bowl"]);
    expect(m.stats).toMatchObject({
      totalRows: 3,
      matchedRows: 2,
      unmatchedRows: 1,
      duplicateRows: 1,
      studentsWithChoices: 1
    });
    expect(m.duplicates).toHaveLength(1);
    expect(m.samples).toHaveLength(3);
    expect(m.samples[0].rawCells.map((c) => c.header)).toContain('Your First & Last Name');
  });

  it('supports first-row duplicate strategy and manual id column', () => {
    const first = prepareChoices(text, roster, undefined, { duplicates: 'first' });
    expect(first.preferences[0].likeGroupIds).toEqual(['Book Club', 'Car Club']);
    const manual = prepareChoices(text, roster, undefined, { idColumn: 2 });
    expect(manual.matrix!.idColumnIndex).toBe(2);
    expect(manual.preferences).toEqual([]);
  });
});
