import { describe, expect, it } from 'vitest';
import type { Tag } from '$lib/domain';
import { resolveCardTagStyling } from './cardTagStyling';
import { resolveTagColorHex } from './tagColors';

const tags: Tag[] = [
  { id: 'ell', programId: 'program', name: 'ELL', colorIndex: 0 },
  { id: 'iep', programId: 'program', name: 'IEP', colorIndex: 1 },
  { id: 'math', programId: 'program', name: 'Math', colorIndex: 2 }
];
const tagsById = Object.fromEntries(tags.map((tag) => [tag.id, tag]));

describe('resolveCardTagStyling', () => {
  it('returns defaults when no tags are assigned', () => {
    expect(resolveCardTagStyling({}, tagsById, {})).toEqual({
      backgroundHex: null,
      borderHex: null,
      conflicts: []
    });
  });

  it('applies one background tag color', () => {
    expect(resolveCardTagStyling({ tagIds: ['ell'] }, tagsById, { ell: 'background' })).toEqual({
      backgroundHex: resolveTagColorHex(tags[0]),
      borderHex: null,
      conflicts: []
    });
  });

  it('applies one border tag color', () => {
    expect(resolveCardTagStyling({ tagIds: ['ell'] }, tagsById, { ell: 'border' })).toEqual({
      backgroundHex: null,
      borderHex: resolveTagColorHex(tags[0]),
      conflicts: []
    });
  });

  it('applies one background and one border color', () => {
    expect(
      resolveCardTagStyling({ tagIds: ['ell', 'iep'] }, tagsById, {
        ell: 'background',
        iep: 'border'
      })
    ).toEqual({
      backgroundHex: resolveTagColorHex(tags[0]),
      borderHex: resolveTagColorHex(tags[1]),
      conflicts: []
    });
  });

  it('reports background conflicts and uses the default background', () => {
    expect(
      resolveCardTagStyling({ tagIds: ['ell', 'iep'] }, tagsById, {
        ell: 'background',
        iep: 'background'
      })
    ).toEqual({
      backgroundHex: null,
      borderHex: null,
      conflicts: ['Conflicting background colors: ELL, IEP. Change one in Cards options.']
    });
  });

  it('reports border conflicts and uses the default border', () => {
    expect(
      resolveCardTagStyling({ tagIds: ['ell', 'iep'] }, tagsById, {
        ell: 'border',
        iep: 'border'
      })
    ).toEqual({
      backgroundHex: null,
      borderHex: null,
      conflicts: ['Conflicting border colors: ELL, IEP. Change one in Cards options.']
    });
  });

  it('keeps a valid border color when background colors conflict', () => {
    expect(
      resolveCardTagStyling({ tagIds: ['ell', 'iep', 'math'] }, tagsById, {
        ell: 'background',
        iep: 'background',
        math: 'border'
      })
    ).toEqual({
      backgroundHex: null,
      borderHex: resolveTagColorHex(tags[2]),
      conflicts: ['Conflicting background colors: ELL, IEP. Change one in Cards options.']
    });
  });

  it('ignores unknown tags and tags without a color mode', () => {
    expect(
      resolveCardTagStyling({ tagIds: ['unknown', 'ell', 'iep'] }, tagsById, {
        iep: 'border'
      })
    ).toEqual({
      backgroundHex: null,
      borderHex: resolveTagColorHex(tags[1]),
      conflicts: []
    });
  });
});
