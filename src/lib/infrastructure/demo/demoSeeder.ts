/**
 * Demo seeder service for Groupwheel.
 *
 * Seeds the application's repositories with demo data to simulate
 * a teacher's full school year of usage.
 *
 * @module infrastructure/demo/demoSeeder
 */

import type { InMemoryEnvironment } from '$lib/infrastructure/inMemoryEnvironment';
import {
	generateDemoData,
	shouldActivateDemoMode,
	isDemoDataLoaded,
	markDemoDataLoaded,
	clearDemoDataMarker,
	type DemoDataSet
} from './demoData';

/**
 * Result of seeding demo data.
 */
export interface SeedDemoResult {
	success: boolean;
	message: string;
	data?: DemoDataSet;
}

/**
 * Seeds the environment with demo data.
 *
 * This function is idempotent when `force` is false - it won't re-seed
 * if demo data has already been loaded.
 *
 * @param env - The application environment with repositories
 * @param force - Force re-seeding even if already loaded
 * @returns Result with success status and message
 */
export async function seedDemoData(
	env: InMemoryEnvironment,
	force: boolean = false
): Promise<SeedDemoResult> {
	// Check if already loaded (unless forcing)
	if (!force && isDemoDataLoaded()) {
		return {
			success: true,
			message: 'Demo data already loaded. Use force=true to reload.'
		};
	}

	try {
		console.log('[Demo] Generating demo data...');
		const data = generateDemoData();

		// Note: We don't seed staff because the default 'owner-1' staff
		// is created by createInMemoryEnvironment. The demo data uses
		// 'demo-staff-1' but references 'owner-1' for compatibility.

		console.log('[Demo] Seeding students...', data.students.length, 'students');
		await env.studentRepo.saveMany(data.students);

		console.log('[Demo] Seeding pools...', data.pools.length, 'pools');
		for (const pool of data.pools) {
			await env.poolRepo.save(pool);
		}

		console.log('[Demo] Seeding programs...', data.programs.length, 'programs');
		for (const program of data.programs) {
			await env.programRepo.save(program);
		}

		console.log('[Demo] Seeding preferences...', data.preferences.length, 'preferences');
		// Group preferences by programId for efficient saving
		const prefsByProgram = new Map<string, typeof data.preferences>();
		for (const pref of data.preferences) {
			const existing = prefsByProgram.get(pref.programId) || [];
			existing.push(pref);
			prefsByProgram.set(pref.programId, existing);
		}

		for (const [programId, prefs] of prefsByProgram) {
			if (env.preferenceRepo.setForProgram) {
				await env.preferenceRepo.setForProgram(programId, prefs);
			} else {
				for (const pref of prefs) {
					await env.preferenceRepo.save(pref);
				}
			}
		}

		console.log('[Demo] Seeding scenarios...', data.scenarios.length, 'scenarios');
		for (const scenario of data.scenarios) {
			await env.scenarioRepo.save(scenario);
		}

		console.log('[Demo] Seeding sessions...', data.sessions.length, 'sessions');
		for (const session of data.sessions) {
			await env.sessionRepo.save(session);
		}

		console.log('[Demo] Seeding placements...', data.placements.length, 'placements');
		for (const placement of data.placements) {
			await env.placementRepo.save(placement);
		}

		console.log('[Demo] Seeding group templates...', data.groupTemplates.length, 'templates');
		for (const template of data.groupTemplates) {
			await env.groupTemplateRepo.save(template);
		}

		// Mark as loaded
		markDemoDataLoaded();

		console.log('[Demo] Demo data seeded successfully!');
		console.log('[Demo] Summary:');
		console.log(`  - ${data.students.length} students`);
		console.log(`  - ${data.pools.length} class rosters`);
		console.log(`  - ${data.programs.length} activities`);
		console.log(`  - ${data.scenarios.length} groupings`);
		console.log(`  - ${data.sessions.length} published sessions`);
		console.log(`  - ${data.placements.length} placements`);
		console.log(`  - ${data.groupTemplates.length} templates`);

		return {
			success: true,
			message: `Demo data seeded: ${data.students.length} students, ${data.programs.length} activities`,
			data
		};
	} catch (error) {
		console.error('[Demo] Failed to seed demo data:', error);
		return {
			success: false,
			message: `Failed to seed demo data: ${error instanceof Error ? error.message : 'Unknown error'}`
		};
	}
}

/**
 * Clears demo data marker and deletes demo data where possible.
 *
 * Note: Not all repositories support delete operations.
 * This function deletes what it can (programs, scenarios, sessions, templates)
 * and clears the demo loaded marker. A full clear requires clearing IndexedDB.
 *
 * @param env - The application environment with repositories
 */
export async function clearDemoData(env: InMemoryEnvironment): Promise<SeedDemoResult> {
	try {
		console.log('[Demo] Clearing demo data...');

		// Get all programs and filter for demo ones
		const allPrograms = await env.programRepo.listAll();
		const demoPrograms = allPrograms.filter(p => p.id.startsWith('demo-'));

		// Delete scenarios for demo programs
		for (const program of demoPrograms) {
			// ScenarioRepository.getByProgramId returns a single scenario
			const scenario = await env.scenarioRepo.getByProgramId(program.id);
			if (scenario) {
				await env.scenarioRepo.delete(scenario.id);
			}
		}

		// Delete demo programs
		for (const program of demoPrograms) {
			await env.programRepo.delete(program.id);
		}

		// Delete demo sessions
		const allSessions = await env.sessionRepo.listAll();
		const demoSessions = allSessions.filter(s => s.id.startsWith('demo-'));
		for (const session of demoSessions) {
			await env.sessionRepo.delete(session.id);
		}

		// Delete demo templates
		const allTemplates = await env.groupTemplateRepo.listAll();
		const demoTemplates = allTemplates.filter(t => t.id.startsWith('demo-'));
		for (const template of demoTemplates) {
			await env.groupTemplateRepo.delete(template.id);
		}

		// Note: Pool and Student repos don't have delete methods in their interfaces
		// These will remain until IndexedDB is cleared

		// Clear the demo loaded marker
		clearDemoDataMarker();

		console.log('[Demo] Demo data cleared (programs, scenarios, sessions, templates)');
		console.log('[Demo] Note: Students and pools remain. Clear IndexedDB for full reset.');

		return {
			success: true,
			message: 'Demo data cleared. Refresh page for full effect.'
		};
	} catch (error) {
		console.error('[Demo] Failed to clear demo data:', error);
		return {
			success: false,
			message: `Failed to clear demo data: ${error instanceof Error ? error.message : 'Unknown error'}`
		};
	}
}

/**
 * Checks URL parameters and seeds demo data if requested.
 * Call this during app initialization.
 *
 * @param env - The application environment
 * @returns Result of the operation
 */
export async function initializeDemoModeIfRequested(
	env: InMemoryEnvironment
): Promise<SeedDemoResult | null> {
	if (!shouldActivateDemoMode()) {
		return null;
	}

	// Clean up the URL to remove the demo parameter
	if (typeof window !== 'undefined') {
		const params = new URLSearchParams(window.location.search);
		params.delete('demo');
		const newUrl = params.toString()
			? `${window.location.pathname}?${params.toString()}`
			: window.location.pathname;
		window.history.replaceState({}, '', newUrl);
	}

	return seedDemoData(env);
}

/**
 * Clears IndexedDB completely (nuclear option for demo reset).
 */
export async function clearIndexedDB(): Promise<void> {
	if (typeof window === 'undefined') return;

	const databases = await indexedDB.databases();
	for (const db of databases) {
		if (db.name) {
			console.log('[Demo] Deleting IndexedDB:', db.name);
			indexedDB.deleteDatabase(db.name);
		}
	}
	clearDemoDataMarker();
	console.log('[Demo] IndexedDB cleared. Refresh page to start fresh.');
}

/**
 * Expose demo functions on window for developer access.
 * Accessible via browser console:
 * - window.__groupwheel_demo.seed() - Seed demo data
 * - window.__groupwheel_demo.clear() - Clear demo data
 * - window.__groupwheel_demo.reseed() - Force re-seed demo data
 * - window.__groupwheel_demo.nuke() - Clear IndexedDB completely
 */
export function exposeDemoFunctionsToWindow(env: InMemoryEnvironment): void {
	if (typeof window === 'undefined') return;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(window as any).__groupwheel_demo = {
		seed: () => seedDemoData(env),
		clear: () => clearDemoData(env),
		reseed: () => seedDemoData(env, true),
		nuke: clearIndexedDB,
		isLoaded: isDemoDataLoaded
	};

	console.log('[Demo] Demo functions available:');
	console.log('  window.__groupwheel_demo.seed()   - Seed demo data');
	console.log('  window.__groupwheel_demo.clear()  - Clear demo data');
	console.log('  window.__groupwheel_demo.reseed() - Force re-seed');
	console.log('  window.__groupwheel_demo.nuke()   - Clear IndexedDB completely');
	console.log('  window.__groupwheel_demo.isLoaded() - Check if loaded');
}
