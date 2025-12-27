/**
 * Synced repository wrappers.
 *
 * These wrappers add server synchronization capability to local repositories.
 * They implement the same interfaces as local repos, making them drop-in replacements.
 *
 * @module infrastructure/repositories/synced
 */

export { SyncedStudentRepository } from './SyncedStudentRepository';
export { SyncedStaffRepository } from './SyncedStaffRepository';
export { SyncedPoolRepository } from './SyncedPoolRepository';
export { SyncedProgramRepository } from './SyncedProgramRepository';
export { SyncedScenarioRepository } from './SyncedScenarioRepository';
export { SyncedPreferenceRepository } from './SyncedPreferenceRepository';
export { SyncedGroupTemplateRepository } from './SyncedGroupTemplateRepository';
