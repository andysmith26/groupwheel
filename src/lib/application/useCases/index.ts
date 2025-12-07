/**
 * Application layer use cases.
 *
 * Use cases encode the "verbs" of the system. They are the only sanctioned
 * way to perform meaningful operations on the domain.
 *
 * Each use case:
 * - Is a function, not a class
 * - Takes a `deps` object of ports and a typed `input`
 * - Returns a `Result<Success, ErrorUnion>`
 * - Does NOT import from infrastructure or Svelte
 *
 * @module application/useCases
 */

// Pool/Roster operations
export * from './importPoolFromCsv';
export * from './importRoster';
export * from './createPoolFromRosterData';
export * from './listPools';

// Program operations
export * from './createProgram';
export * from './getProgram';
export * from './listPrograms';

// Scenario operations
export * from './generateScenario';
export * from './computeScenarioAnalytics';
export * from './getStudentView';

// Composite operations
export * from './createGroupingActivity';
