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
export * from './importRosterWithMapping';
export * from './listPools';

// Program operations
export * from './createProgram';
export * from './getProgram';
export * from './listPrograms';

// Scenario operations
export * from './generateScenario';
export {
	generateCandidate,
	type GenerateCandidateInput,
	type GenerateCandidateError,
	type CandidateGrouping as CandidateGroupingSingle
} from './generateCandidate';
export {
	generateMultipleCandidates,
	type GenerateMultipleCandidatesInput,
	type GenerateMultipleCandidatesError,
	type CandidateGrouping as CandidateGroupingMultiple
} from './generateMultipleCandidates';
export * from './createScenarioFromGroups';
export * from './computeScenarioAnalytics';
export * from './computeAnalyticsSync';
export * from './getStudentView';

// Composite operations
export * from './createGroupingActivity';
