# Candidate Grouping Algorithms (Technical)

This document describes the algorithms used to generate candidate groupings for a program.
All algorithms conform to the `GroupingAlgorithm` port and are selected by `algorithmConfig.algorithm`.

## Overview

When the candidate gallery is generated, the app cycles through a set of algorithms to produce diverse options.
Each candidate stores:
- `algorithmId`: machine identifier (e.g. `round-robin`)
- `algorithmLabel`: human-readable label (e.g. `Round Robin`)
- `algorithmConfig`: the config used for that run (includes a seed and algorithm id)

The current mix is:
- Balanced
- Random Shuffle
- Round Robin
- Preference-First
- Simulated Annealing
- Genetic Algorithm

See `src/lib/infrastructure/inMemoryEnvironment.ts` for registration and
`src/lib/infrastructure/algorithms/multiAlgorithm.ts` for dispatching.

## Shared Inputs

All algorithms accept:
- `programId`
- `studentIds`
- `algorithmConfig`

The shared config shape (from `groupingUtils.ts`) includes:
- `groups`: predefined group shells
- `targetGroupCount`, `minGroupSize`, `maxGroupSize`
- `seed`: deterministic randomness
- `algorithm`: algorithm selector id

If `groups` is not provided, default groups are generated based on size constraints.

## Algorithms

### Balanced

**Id**: `balanced`

**Purpose**: Preference-aware assignment with balancing heuristics.

**Implementation**: `src/lib/infrastructure/algorithms/balancedGrouping.ts`

**Notes**:
- Fetches student preferences and converts them to algorithm inputs.
- Uses `assignBalanced` to optimize satisfaction while respecting group sizes.
- Optionally shuffles student order by seed for variation.

### Random Shuffle

**Id**: `random`

**Purpose**: Baseline random assignment across available groups.

**Implementation**: `src/lib/infrastructure/algorithms/randomGrouping.ts`

**Notes**:
- Shuffles student order with a seed when provided.
- Assigns each student to a random group with remaining capacity.
- Useful for generating an unbiased control option.

### Round Robin

**Id**: `round-robin`

**Purpose**: Even distribution without preference weighting.

**Implementation**: `src/lib/infrastructure/algorithms/roundRobinGrouping.ts`

**Notes**:
- Cycles through groups, placing students in sequence.
- Seed controls student order to introduce variation.
- Ensures balanced group sizes with deterministic placement.

### Preference-First

**Id**: `preference-first`

**Purpose**: Greedy assignment to highest-ranked preferred group.

**Implementation**: `src/lib/infrastructure/algorithms/preferenceFirstGrouping.ts`

**Notes**:
- Reads preferences and attempts to place each student in their top available choice.
- Falls back to round-robin fill for unassigned students.
- Good for maximizing top-choice rate, may be less globally balanced.

### Simulated Annealing

**Id**: `simulated-annealing`

**Purpose**: Iteratively improve a grouping by swapping students to raise preference satisfaction.

**Implementation**: `src/lib/infrastructure/algorithms/simulatedAnnealingGrouping.ts`

**Notes**:
- Starts from a randomized grouping and performs many small swaps.
- Accepts some worse swaps early to escape local optima.
- Produces more refined results at the cost of extra runtime.

### Genetic Algorithm

**Id**: `genetic`

**Purpose**: Evolve a population of candidate groupings to improve satisfaction.

**Implementation**: `src/lib/infrastructure/algorithms/geneticGrouping.ts`

**Notes**:
- Generates multiple candidate orderings and recombines the strongest.
- Uses crossover + mutation over a few generations.
- More compute-intensive but can surface higher-quality options.

## Candidate Generation Strategy

The candidate generator samples from the algorithm mix and applies a unique seed per candidate.
This ensures:
- Algorithmic variety across options
- Mixed trade-offs between preference satisfaction and balance

Implementation: `src/lib/application/useCases/generateMultipleCandidates.ts`

## Extending the Set

To add another algorithm:
1. Implement `GroupingAlgorithm` in `src/lib/infrastructure/algorithms/`.
2. Register it in `createInMemoryEnvironment()` via `MultiAlgorithmGroupingAlgorithm`.
3. Add it to the algorithm list in `generateMultipleCandidates()` with an id and label.
4. (Optional) Document the algorithm here and in `docs/ALGORITHMS_TUTORIAL.md`.
