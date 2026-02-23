/**
 * Test data fixtures for manual testing of preference-adaptive UI (WP8).
 *
 * Provides multiple roster + preference scenarios that can be seeded into
 * any activity via the dev console. Each fixture is a self-contained dataset
 * with students, group names, and varying levels of preference data.
 *
 * Usage (browser console):
 *   window.__groupwheel_test.list()
 *   window.__groupwheel_test.seed('full-prefs')
 *   window.__groupwheel_test.seed('no-prefs')
 *
 * @module infrastructure/demo/testFixtures
 */

import type { StudentPreference } from '$lib/domain/preference';

// =============================================================================
// TYPES
// =============================================================================

export interface TestStudent {
  firstName: string;
  lastName: string;
}

export interface TestFixture {
  id: string;
  name: string;
  description: string;
  students: TestStudent[];
  /** Group names used by preferences (and for generation). */
  groupNames: string[];
  /** Per-student preferences keyed by "firstName lastName". null = no preference for that student. */
  preferences: Record<string, Pick<StudentPreference, 'likeGroupIds' | 'avoidGroupIds' | 'avoidStudentIds'> | null>;
}

// =============================================================================
// STUDENT ROSTERS
// =============================================================================

const ROSTER_20: TestStudent[] = [
  { firstName: 'Alex', lastName: 'Chen' },
  { firstName: 'Bella', lastName: 'Davis' },
  { firstName: 'Carlos', lastName: 'Garcia' },
  { firstName: 'Diana', lastName: 'Hall' },
  { firstName: 'Ethan', lastName: 'Ivanov' },
  { firstName: 'Fatima', lastName: 'Jones' },
  { firstName: 'Gabriel', lastName: 'Kim' },
  { firstName: 'Hannah', lastName: 'Lopez' },
  { firstName: 'Isaac', lastName: 'Martinez' },
  { firstName: 'Jasmine', lastName: 'Nguyen' },
  { firstName: 'Kai', lastName: 'O\'Brien' },
  { firstName: 'Luna', lastName: 'Patel' },
  { firstName: 'Mason', lastName: 'Quinn' },
  { firstName: 'Nora', lastName: 'Rivera' },
  { firstName: 'Omar', lastName: 'Singh' },
  { firstName: 'Priya', lastName: 'Torres' },
  { firstName: 'Quinn', lastName: 'Ueda' },
  { firstName: 'Riley', lastName: 'Vasquez' },
  { firstName: 'Sofia', lastName: 'Wang' },
  { firstName: 'Tyler', lastName: 'Xu' }
];

const GROUPS_5 = ['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5'];
const GROUPS_4 = ['Dragons', 'Phoenix', 'Griffins', 'Unicorns'];

// =============================================================================
// FIXTURES
// =============================================================================

/**
 * No preferences at all. Tests that the transient-posture UI stays clean.
 */
const NO_PREFS: TestFixture = {
  id: 'no-prefs',
  name: 'No Preferences (20 students)',
  description: 'Clean roster, no preference data. Verifies transient posture: no badges, no analytics, no roster dots.',
  students: ROSTER_20,
  groupNames: GROUPS_5,
  preferences: {}
};

/**
 * Only 2 students have preferences — below the >=3 threshold for analytics panel.
 */
const FEW_PREFS: TestFixture = {
  id: 'few-prefs',
  name: 'Below Threshold (2 of 20)',
  description: 'Only 2 students have preferences. Badges appear on those 2 but analytics panel stays hidden (threshold is 3).',
  students: ROSTER_20,
  groupNames: GROUPS_5,
  preferences: {
    'Alex Chen': { likeGroupIds: ['Table 1', 'Table 3'], avoidGroupIds: [], avoidStudentIds: [] },
    'Bella Davis': { likeGroupIds: ['Table 2'], avoidGroupIds: [], avoidStudentIds: [] }
  }
};

/**
 * Exactly 3 students with preferences — at the threshold for analytics panel.
 */
const THRESHOLD_PREFS: TestFixture = {
  id: 'threshold-prefs',
  name: 'At Threshold (3 of 20)',
  description: 'Exactly 3 students have preferences. Analytics panel should appear. Minimal but visible.',
  students: ROSTER_20,
  groupNames: GROUPS_5,
  preferences: {
    'Alex Chen': { likeGroupIds: ['Table 1', 'Table 3'], avoidGroupIds: [], avoidStudentIds: [] },
    'Bella Davis': { likeGroupIds: ['Table 2', 'Table 1'], avoidGroupIds: [], avoidStudentIds: [] },
    'Carlos Garcia': { likeGroupIds: ['Table 1'], avoidGroupIds: ['Table 5'], avoidStudentIds: [] }
  }
};

/**
 * Half the class has preferences with ranked choices — realistic club admin scenario.
 */
const HALF_PREFS: TestFixture = {
  id: 'half-prefs',
  name: 'Half Class (10 of 20)',
  description: 'Half the students submitted preferences with 1-3 ranked choices. Realistic scenario for testing mixed badges.',
  students: ROSTER_20,
  groupNames: GROUPS_4,
  preferences: {
    'Alex Chen': { likeGroupIds: ['Dragons', 'Phoenix', 'Griffins'], avoidGroupIds: [], avoidStudentIds: [] },
    'Bella Davis': { likeGroupIds: ['Phoenix', 'Dragons'], avoidGroupIds: [], avoidStudentIds: [] },
    'Carlos Garcia': { likeGroupIds: ['Griffins'], avoidGroupIds: ['Unicorns'], avoidStudentIds: [] },
    'Diana Hall': { likeGroupIds: ['Unicorns', 'Dragons', 'Griffins'], avoidGroupIds: [], avoidStudentIds: [] },
    'Ethan Ivanov': { likeGroupIds: ['Dragons', 'Unicorns'], avoidGroupIds: [], avoidStudentIds: [] },
    'Fatima Jones': { likeGroupIds: ['Phoenix', 'Griffins', 'Dragons'], avoidGroupIds: [], avoidStudentIds: [] },
    'Gabriel Kim': { likeGroupIds: ['Griffins', 'Phoenix'], avoidGroupIds: [], avoidStudentIds: [] },
    'Hannah Lopez': { likeGroupIds: ['Dragons'], avoidGroupIds: [], avoidStudentIds: ['Isaac Martinez'] },
    'Isaac Martinez': { likeGroupIds: ['Unicorns', 'Phoenix', 'Griffins'], avoidGroupIds: [], avoidStudentIds: [] },
    'Jasmine Nguyen': { likeGroupIds: ['Phoenix', 'Dragons'], avoidGroupIds: [], avoidStudentIds: [] }
  }
};

/**
 * Every student has multi-ranked preferences — full sovereign posture scenario.
 */
const FULL_PREFS: TestFixture = {
  id: 'full-prefs',
  name: 'Full Preferences (20 of 20)',
  description: 'Every student has 2-3 ranked choices. Full sovereign posture: all badges visible, analytics rich, suggestions active.',
  students: ROSTER_20,
  groupNames: GROUPS_4,
  preferences: {
    'Alex Chen': { likeGroupIds: ['Dragons', 'Phoenix', 'Griffins'], avoidGroupIds: [], avoidStudentIds: [] },
    'Bella Davis': { likeGroupIds: ['Phoenix', 'Dragons'], avoidGroupIds: [], avoidStudentIds: [] },
    'Carlos Garcia': { likeGroupIds: ['Griffins', 'Unicorns'], avoidGroupIds: [], avoidStudentIds: [] },
    'Diana Hall': { likeGroupIds: ['Unicorns', 'Dragons', 'Griffins'], avoidGroupIds: [], avoidStudentIds: [] },
    'Ethan Ivanov': { likeGroupIds: ['Dragons', 'Unicorns'], avoidGroupIds: [], avoidStudentIds: [] },
    'Fatima Jones': { likeGroupIds: ['Phoenix', 'Griffins', 'Dragons'], avoidGroupIds: [], avoidStudentIds: [] },
    'Gabriel Kim': { likeGroupIds: ['Griffins', 'Phoenix'], avoidGroupIds: [], avoidStudentIds: [] },
    'Hannah Lopez': { likeGroupIds: ['Dragons', 'Phoenix'], avoidGroupIds: [], avoidStudentIds: [] },
    'Isaac Martinez': { likeGroupIds: ['Unicorns', 'Phoenix', 'Griffins'], avoidGroupIds: [], avoidStudentIds: [] },
    'Jasmine Nguyen': { likeGroupIds: ['Phoenix', 'Dragons'], avoidGroupIds: [], avoidStudentIds: [] },
    'Kai O\'Brien': { likeGroupIds: ['Dragons', 'Griffins'], avoidGroupIds: [], avoidStudentIds: [] },
    'Luna Patel': { likeGroupIds: ['Unicorns', 'Phoenix'], avoidGroupIds: [], avoidStudentIds: [] },
    'Mason Quinn': { likeGroupIds: ['Griffins', 'Dragons', 'Phoenix'], avoidGroupIds: [], avoidStudentIds: [] },
    'Nora Rivera': { likeGroupIds: ['Phoenix', 'Unicorns'], avoidGroupIds: [], avoidStudentIds: [] },
    'Omar Singh': { likeGroupIds: ['Dragons', 'Griffins'], avoidGroupIds: ['Unicorns'], avoidStudentIds: [] },
    'Priya Torres': { likeGroupIds: ['Unicorns', 'Dragons', 'Phoenix'], avoidGroupIds: [], avoidStudentIds: [] },
    'Quinn Ueda': { likeGroupIds: ['Griffins', 'Phoenix'], avoidGroupIds: [], avoidStudentIds: [] },
    'Riley Vasquez': { likeGroupIds: ['Phoenix', 'Dragons', 'Unicorns'], avoidGroupIds: [], avoidStudentIds: [] },
    'Sofia Wang': { likeGroupIds: ['Dragons', 'Unicorns'], avoidGroupIds: [], avoidStudentIds: [] },
    'Tyler Xu': { likeGroupIds: ['Griffins', 'Dragons', 'Phoenix'], avoidGroupIds: [], avoidStudentIds: [] }
  }
};

/**
 * Conflict-heavy scenario where many students want the same group.
 */
const CONFLICT_PREFS: TestFixture = {
  id: 'conflict-prefs',
  name: 'Conflicts (popular group)',
  description: '15 of 20 students want Dragons as 1st choice. Tests analytics "Room for improvement" + suggestions.',
  students: ROSTER_20,
  groupNames: GROUPS_4,
  preferences: {
    'Alex Chen': { likeGroupIds: ['Dragons'], avoidGroupIds: [], avoidStudentIds: [] },
    'Bella Davis': { likeGroupIds: ['Dragons', 'Phoenix'], avoidGroupIds: [], avoidStudentIds: [] },
    'Carlos Garcia': { likeGroupIds: ['Dragons'], avoidGroupIds: [], avoidStudentIds: [] },
    'Diana Hall': { likeGroupIds: ['Dragons', 'Griffins'], avoidGroupIds: [], avoidStudentIds: [] },
    'Ethan Ivanov': { likeGroupIds: ['Dragons'], avoidGroupIds: [], avoidStudentIds: [] },
    'Fatima Jones': { likeGroupIds: ['Dragons', 'Phoenix'], avoidGroupIds: [], avoidStudentIds: [] },
    'Gabriel Kim': { likeGroupIds: ['Dragons'], avoidGroupIds: [], avoidStudentIds: [] },
    'Hannah Lopez': { likeGroupIds: ['Dragons', 'Unicorns'], avoidGroupIds: [], avoidStudentIds: [] },
    'Isaac Martinez': { likeGroupIds: ['Dragons'], avoidGroupIds: [], avoidStudentIds: [] },
    'Jasmine Nguyen': { likeGroupIds: ['Dragons', 'Phoenix'], avoidGroupIds: [], avoidStudentIds: [] },
    'Kai O\'Brien': { likeGroupIds: ['Dragons'], avoidGroupIds: [], avoidStudentIds: [] },
    'Luna Patel': { likeGroupIds: ['Dragons', 'Phoenix'], avoidGroupIds: [], avoidStudentIds: [] },
    'Mason Quinn': { likeGroupIds: ['Dragons'], avoidGroupIds: [], avoidStudentIds: [] },
    'Nora Rivera': { likeGroupIds: ['Dragons', 'Griffins'], avoidGroupIds: [], avoidStudentIds: [] },
    'Omar Singh': { likeGroupIds: ['Dragons'], avoidGroupIds: [], avoidStudentIds: [] },
    'Priya Torres': { likeGroupIds: ['Phoenix', 'Unicorns'], avoidGroupIds: [], avoidStudentIds: [] },
    'Quinn Ueda': { likeGroupIds: ['Griffins', 'Phoenix'], avoidGroupIds: [], avoidStudentIds: [] },
    'Riley Vasquez': { likeGroupIds: ['Unicorns'], avoidGroupIds: [], avoidStudentIds: [] },
    'Sofia Wang': { likeGroupIds: ['Phoenix', 'Griffins'], avoidGroupIds: [], avoidStudentIds: [] },
    'Tyler Xu': { likeGroupIds: ['Griffins', 'Dragons'], avoidGroupIds: [], avoidStudentIds: [] }
  }
};

// =============================================================================
// REGISTRY
// =============================================================================

export const TEST_FIXTURES: TestFixture[] = [
  NO_PREFS,
  FEW_PREFS,
  THRESHOLD_PREFS,
  HALF_PREFS,
  FULL_PREFS,
  CONFLICT_PREFS
];

export function getFixtureById(id: string): TestFixture | undefined {
  return TEST_FIXTURES.find((f) => f.id === id);
}
