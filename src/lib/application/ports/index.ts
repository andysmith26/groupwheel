/**
 * Application layer ports (interfaces).
 *
 * Ports define how the application layer communicates with the outside world.
 * They are implemented by adapters in the infrastructure layer.
 *
 * @module application/ports
 */

// Repository ports
export * from './StudentRepository';
export * from './StaffRepository';
export * from './PoolRepository';
export * from './ProgramRepository';
export * from './ScenarioRepository';
export * from './PreferenceRepository';

// Service ports
export * from './IdGenerator';
export * from './Clock';
export * from './GroupingAlgorithm';
