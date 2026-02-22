/**
 * Use case for creating or linking a student to an identity.
 *
 * Handles the core identity linking logic during import:
 * - If teacher confirms match: link student to existing identity
 * - If teacher says "new person": create new identity
 * - If teacher skips: create new identity (can link later)
 *
 * @module application/useCases/createOrLinkStudent
 */

import type { Student, StudentIdentity } from '$lib/domain';
import {
  createStudentIdentity,
  addNameVariant,
  computeDisplayName
} from '$lib/domain/studentIdentity';
import type { StudentRepository } from '$lib/application/ports/StudentRepository';
import type { StudentIdentityRepository } from '$lib/application/ports/StudentIdentityRepository';
import type { IdGenerator, Clock } from '$lib/application/ports';
import { ok, err, isOk, type Result } from '$lib/types/result';

// ============================================================================
// Types
// ============================================================================

export interface CreateOrLinkStudentDeps {
  studentRepo: StudentRepository;
  studentIdentityRepo: StudentIdentityRepository;
  idGenerator: IdGenerator;
  clock: Clock;
}

export interface StudentToImport {
  /** Student's first name */
  firstName: string;
  /** Student's last name (optional) */
  lastName?: string;
  /** Grade level (optional) */
  gradeLevel?: string;
  /** Gender (optional) */
  gender?: string;
  /** Additional metadata */
  meta?: Record<string, unknown>;
}

export interface LinkToExistingInput {
  type: 'LINK_TO_EXISTING';
  /** The student data being imported */
  student: StudentToImport;
  /** The existing identity to link to */
  existingIdentityId: string;
  /** Source of this import (e.g., activity name) for variant tracking */
  source: string;
  /** User ID for multi-tenant isolation */
  userId?: string;
}

export interface CreateNewIdentityInput {
  type: 'CREATE_NEW';
  /** The student data being imported */
  student: StudentToImport;
  /** Source of this import (e.g., activity name) for variant tracking */
  source: string;
  /** User ID for multi-tenant isolation */
  userId?: string;
}

export type CreateOrLinkStudentInput = LinkToExistingInput | CreateNewIdentityInput;

export interface CreateOrLinkStudentResult {
  /** The created student record */
  student: Student;
  /** The identity (new or existing) the student is linked to */
  identity: StudentIdentity;
  /** Whether a new identity was created */
  isNewIdentity: boolean;
}

export type CreateOrLinkStudentError =
  | { type: 'IDENTITY_NOT_FOUND'; message: string }
  | { type: 'SAVE_FAILED'; message: string };

// ============================================================================
// Use Case
// ============================================================================

/**
 * Create a student and either link to existing identity or create new one.
 */
export async function createOrLinkStudent(
  deps: CreateOrLinkStudentDeps,
  input: CreateOrLinkStudentInput
): Promise<Result<CreateOrLinkStudentResult, CreateOrLinkStudentError>> {
  const { studentRepo, studentIdentityRepo, idGenerator, clock } = deps;

  if (input.type === 'LINK_TO_EXISTING') {
    return linkToExistingIdentity(deps, input);
  } else {
    return createNewStudentWithIdentity(deps, input);
  }
}

/**
 * Link a new student record to an existing identity.
 */
async function linkToExistingIdentity(
  deps: CreateOrLinkStudentDeps,
  input: LinkToExistingInput
): Promise<Result<CreateOrLinkStudentResult, CreateOrLinkStudentError>> {
  const { studentRepo, studentIdentityRepo, idGenerator } = deps;
  const { student: studentData, existingIdentityId, source, userId } = input;

  // Fetch the existing identity
  const existingIdentity = await studentIdentityRepo.getById(existingIdentityId);
  if (!existingIdentity) {
    return err({
      type: 'IDENTITY_NOT_FOUND',
      message: `Student identity ${existingIdentityId} not found`
    });
  }

  // Create new student record linked to this identity
  const studentId = idGenerator.generateId();
  const student: Student = {
    id: studentId,
    canonicalId: existingIdentityId,
    firstName: studentData.firstName.trim(),
    lastName: studentData.lastName?.trim(),
    gradeLevel: studentData.gradeLevel?.trim(),
    gender: studentData.gender?.trim(),
    meta: studentData.meta
  };

  // Add this name variant to the identity if not already present
  const updatedIdentity = addNameVariant(existingIdentity, {
    firstName: studentData.firstName,
    lastName: studentData.lastName,
    source
  });

  // Update grade level and gender if not set on identity but provided in import
  if (!updatedIdentity.gradeLevel && studentData.gradeLevel) {
    updatedIdentity.gradeLevel = studentData.gradeLevel.trim();
  }
  if (!updatedIdentity.gender && studentData.gender) {
    updatedIdentity.gender = studentData.gender.trim();
  }

  try {
    await Promise.all([
      studentRepo.saveMany([student]),
      studentIdentityRepo.update(updatedIdentity)
    ]);

    return ok({
      student,
      identity: updatedIdentity,
      isNewIdentity: false
    });
  } catch (e) {
    return err({
      type: 'SAVE_FAILED',
      message: e instanceof Error ? e.message : 'Failed to save student'
    });
  }
}

/**
 * Create a new student with a new identity.
 */
async function createNewStudentWithIdentity(
  deps: CreateOrLinkStudentDeps,
  input: CreateNewIdentityInput
): Promise<Result<CreateOrLinkStudentResult, CreateOrLinkStudentError>> {
  const { studentRepo, studentIdentityRepo, idGenerator, clock } = deps;
  const { student: studentData, source, userId } = input;

  // Generate IDs
  const identityId = idGenerator.generateId();
  const studentId = idGenerator.generateId();

  // Create the identity
  const displayName = computeDisplayName(studentData.firstName, studentData.lastName);
  const identity = createStudentIdentity({
    id: identityId,
    displayName,
    knownVariants: [
      {
        firstName: studentData.firstName,
        lastName: studentData.lastName,
        source
      }
    ],
    createdAt: clock.now(),
    userId,
    gradeLevel: studentData.gradeLevel?.trim(),
    gender: studentData.gender?.trim()
  });

  // Create the student record linked to this identity
  const student: Student = {
    id: studentId,
    canonicalId: identityId,
    firstName: studentData.firstName.trim(),
    lastName: studentData.lastName?.trim(),
    gradeLevel: studentData.gradeLevel?.trim(),
    gender: studentData.gender?.trim(),
    meta: studentData.meta
  };

  try {
    await Promise.all([studentIdentityRepo.save(identity), studentRepo.saveMany([student])]);

    return ok({
      student,
      identity,
      isNewIdentity: true
    });
  } catch (e) {
    return err({
      type: 'SAVE_FAILED',
      message: e instanceof Error ? e.message : 'Failed to save student'
    });
  }
}

// ============================================================================
// Batch Operations
// ============================================================================

export interface BatchCreateOrLinkInput {
  /** Array of link/create decisions for each student */
  decisions: CreateOrLinkStudentInput[];
}

export interface BatchCreateOrLinkResult {
  /** Successfully processed students */
  successful: CreateOrLinkStudentResult[];
  /** Failed students with their errors */
  failed: Array<{
    input: CreateOrLinkStudentInput;
    error: CreateOrLinkStudentError;
  }>;
}

/**
 * Process a batch of student link/create decisions.
 *
 * Useful for handling the results of the matching review UI.
 */
export async function batchCreateOrLinkStudents(
  deps: CreateOrLinkStudentDeps,
  input: BatchCreateOrLinkInput
): Promise<Result<BatchCreateOrLinkResult, never>> {
  const successful: CreateOrLinkStudentResult[] = [];
  const failed: Array<{ input: CreateOrLinkStudentInput; error: CreateOrLinkStudentError }> = [];

  for (const decision of input.decisions) {
    const result = await createOrLinkStudent(deps, decision);

    if (isOk(result)) {
      successful.push(result.value);
    } else {
      failed.push({ input: decision, error: result.error });
    }
  }

  return ok({ successful, failed });
}
