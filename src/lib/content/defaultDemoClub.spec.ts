import { describe, expect, it } from 'vitest';
import { DEFAULT_DEMO_CLUB } from './defaultDemoClub';

describe('DEFAULT_DEMO_CLUB', () => {
  it('provides a 16-member sample roster for groups of four', () => {
    expect(DEFAULT_DEMO_CLUB.id).toBe('sample-club');
    expect(DEFAULT_DEMO_CLUB.members).toHaveLength(16);
    expect(DEFAULT_DEMO_CLUB.groupSize).toBe(4);
  });
});
