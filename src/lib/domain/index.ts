/**
 * Domain layer exports.
 *
 * This is the single source of truth for all business entities and value objects
 * in the Friend Hat application. All domain types should be imported from here
 * (or from specific domain modules), NOT from src/lib/types/.
 *
 * @module domain
 */

// Core entities
export * from './student';
export * from './staff';
export * from './pool';
export * from './program';
export * from './group';
export * from './groupTemplate';
export * from './scenario';
export * from './preference';
export * from './analytics';

// Re-export commonly used types at top level for convenience
export type { Student } from './student';

export type { Group, GroupCreationMode } from './group';

export type { StudentPreference, Preference, StudentId, GroupId } from './preference';

export type { Scenario, ScenarioStatus } from './scenario';

export type { ScenarioSatisfaction } from './analytics';

export type { GroupTemplate, TemplateGroup } from './groupTemplate';
