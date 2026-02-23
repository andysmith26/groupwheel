/**
 * Test data seeder for dev console.
 *
 * Creates a fresh activity populated with a chosen test fixture (roster + preferences).
 * Designed for manual testing of the preference-adaptive UI (WP8).
 *
 * Exposed on `window.__groupwheel_test` alongside the existing `__groupwheel_demo`.
 *
 * @module infrastructure/demo/testSeeder
 */

import type { InMemoryEnvironment } from '$lib/infrastructure/inMemoryEnvironment';
import type { Preference } from '$lib/domain';
import type { StudentPreference } from '$lib/domain/preference';
import { createActivityInline, addStudentToPool } from '$lib/services/appEnvUseCases';
import { isErr } from '$lib/types/result';
import { TEST_FIXTURES, getFixtureById, type TestFixture } from './testFixtures';

export interface SeedFixtureResult {
  success: boolean;
  message: string;
  activityId?: string;
  activityUrl?: string;
}

/**
 * Seed a test fixture as a new activity with students and preferences.
 *
 * @param env - The application environment
 * @param fixtureId - ID of the fixture to seed (e.g., 'full-prefs')
 * @returns Result with the new activity URL
 */
export async function seedTestFixture(
  env: InMemoryEnvironment,
  fixtureId: string
): Promise<SeedFixtureResult> {
  const fixture = getFixtureById(fixtureId);
  if (!fixture) {
    const ids = TEST_FIXTURES.map((f) => f.id).join(', ');
    return {
      success: false,
      message: `Unknown fixture "${fixtureId}". Available: ${ids}`
    };
  }

  try {
    console.log(`[Test] Seeding fixture: ${fixture.name}`);
    console.log(`[Test] ${fixture.description}`);

    // 1. Create activity
    const activityResult = await createActivityInline(env, {
      name: `[TEST] ${fixture.name}`
    });
    if (isErr(activityResult)) {
      return { success: false, message: `Failed to create activity: ${activityResult.error.message}` };
    }
    const { program, pool } = activityResult.value;

    // 2. Add students
    const studentIdByName: Record<string, string> = {};
    for (const student of fixture.students) {
      const result = await addStudentToPool(env, {
        poolId: pool.id,
        firstName: student.firstName,
        lastName: student.lastName
      });
      if (!isErr(result)) {
        const fullName = `${student.firstName} ${student.lastName}`;
        studentIdByName[fullName] = result.value.student.id;
      }
    }
    console.log(`[Test] Added ${Object.keys(studentIdByName).length} students`);

    // 3. Save preferences
    const preferences: Preference[] = [];
    let prefCount = 0;
    for (const [fullName, prefData] of Object.entries(fixture.preferences)) {
      if (!prefData) continue;
      const studentId = studentIdByName[fullName];
      if (!studentId) {
        console.warn(`[Test] Student "${fullName}" not found in roster, skipping preference`);
        continue;
      }

      const payload: StudentPreference = {
        studentId,
        likeGroupIds: prefData.likeGroupIds ?? [],
        avoidGroupIds: prefData.avoidGroupIds ?? [],
        avoidStudentIds: (prefData.avoidStudentIds ?? []).map((name) => studentIdByName[name] ?? name)
      };

      preferences.push({
        id: env.idGenerator.generateId(),
        programId: program.id,
        studentId,
        payload
      });
      prefCount++;
    }

    if (preferences.length > 0) {
      if (env.preferenceRepo.setForProgram) {
        await env.preferenceRepo.setForProgram(program.id, preferences);
      } else {
        for (const pref of preferences) {
          await env.preferenceRepo.save(pref);
        }
      }
    }
    console.log(`[Test] Saved ${prefCount} preferences`);

    const url = `/activity/${program.id}`;
    console.log(`[Test] Activity created: ${url}`);
    console.log(`[Test] Navigate there or run: window.location.href = '${url}'`);

    return {
      success: true,
      message: `Created "${fixture.name}" with ${fixture.students.length} students and ${prefCount} preferences`,
      activityId: program.id,
      activityUrl: url
    };
  } catch (error) {
    console.error('[Test] Failed to seed fixture:', error);
    return {
      success: false,
      message: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * List all available test fixtures.
 */
export function listFixtures(): void {
  console.log('\n%c Available Test Fixtures', 'font-size: 14px; font-weight: bold; color: #0d9488');
  console.log('%c For testing preference-adaptive UI (WP8)\n', 'color: #6b7280');

  for (const fixture of TEST_FIXTURES) {
    const prefCount = Object.values(fixture.preferences).filter(Boolean).length;
    const studentCount = fixture.students.length;
    console.log(
      `  %c${fixture.id.padEnd(18)}%c ${fixture.name}`,
      'color: #0d9488; font-weight: bold',
      'color: inherit'
    );
    console.log(
      `  ${''.padEnd(18)} ${studentCount} students, ${prefCount} with preferences`
    );
    console.log(`  ${''.padEnd(18)} ${fixture.description}\n`);
  }

  console.log('%c Usage:', 'font-weight: bold');
  console.log("  await window.__groupwheel_test.seed('full-prefs')");
  console.log("  await window.__groupwheel_test.seed('no-prefs')");
  console.log("  await window.__groupwheel_test.seed('conflict-prefs')");
  console.log('');
}

/**
 * Seed a fixture and navigate to the new activity.
 */
export async function seedAndNavigate(
  env: InMemoryEnvironment,
  fixtureId: string
): Promise<SeedFixtureResult> {
  const result = await seedTestFixture(env, fixtureId);
  if (result.success && result.activityUrl && typeof window !== 'undefined') {
    window.location.href = result.activityUrl;
  }
  return result;
}

/**
 * Expose test fixture functions on window for developer access.
 */
export function exposeTestFixturesToWindow(env: InMemoryEnvironment): void {
  if (typeof window === 'undefined') return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__groupwheel_test = {
    list: () => listFixtures(),
    seed: (fixtureId: string) => seedTestFixture(env, fixtureId),
    go: (fixtureId: string) => seedAndNavigate(env, fixtureId),
    fixtures: TEST_FIXTURES
  };
}

/**
 * Print the directory of all console commands (demo + test).
 */
export function printConsoleDirectory(): void {
  console.log(
    '\n%c ╔══════════════════════════════════════════════════════════╗',
    'color: #0d9488'
  );
  console.log(
    '%c ║           Groupwheel Developer Console                  ║',
    'color: #0d9488; font-weight: bold'
  );
  console.log(
    '%c ╚══════════════════════════════════════════════════════════╝',
    'color: #0d9488'
  );

  console.log('\n%c Demo Data', 'font-size: 12px; font-weight: bold; color: #7c3aed');
  console.log('  __groupwheel_demo.seed()       Seed full demo dataset (8 activities)');
  console.log('  __groupwheel_demo.clear()      Clear demo data');
  console.log('  __groupwheel_demo.reseed()     Force re-seed');
  console.log('  __groupwheel_demo.nuke()       Clear IndexedDB completely');
  console.log('  __groupwheel_demo.isLoaded()   Check if demo data is loaded');

  console.log('\n%c Test Fixtures (WP8)', 'font-size: 12px; font-weight: bold; color: #0d9488');
  console.log('  __groupwheel_test.list()       List all available fixtures');
  console.log("  __groupwheel_test.seed(id)     Create activity from fixture (stays on page)");
  console.log("  __groupwheel_test.go(id)       Create activity and navigate to it");
  console.log('  __groupwheel_test.fixtures     Raw fixture data array');

  console.log('\n%c Fixture IDs:', 'font-weight: bold; color: #6b7280');
  for (const f of TEST_FIXTURES) {
    const prefCount = Object.values(f.preferences).filter(Boolean).length;
    console.log(`  ${f.id.padEnd(18)} — ${f.students.length} students, ${prefCount} prefs`);
  }

  console.log('\n%c Quick start:', 'font-weight: bold; color: #6b7280');
  console.log("  await __groupwheel_test.go('full-prefs')    // Full preference data");
  console.log("  await __groupwheel_test.go('no-prefs')      // Clean transient UI");
  console.log("  await __groupwheel_test.go('conflict-prefs') // Oversubscribed groups\n");
}
