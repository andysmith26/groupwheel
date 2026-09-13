/**
 * Activity File Export/Import Utilities
 *
 * Functions for exporting activity data to JSON files and parsing imported files.
 * Enables sharing activities between users via file transfer.
 *
 * @module utils/activityFile
 */

import { normalizePeerRequestText } from '$lib/domain/peerRequest';
import type { Tag } from '$lib/domain/tag';
import type {
  PeerRequestCandidate,
  PeerRequestResolutionAuditAction,
  PeerRequestResolutionAuditEntry,
  PeerRequestResolutionSource,
  PeerRequestResolutionStatus
} from '$lib/domain/peerRequest';
import type { ProgramType } from '$lib/domain/program';

// =============================================================================
// Export Data Schema
// =============================================================================

/**
 * Schema version for the export format.
 * v1: roster, preferences, scenario (groups)
 * v2: adds sessions, placements, observations, pool metadata
 * v3: adds peer requests
 * v4: adds program tag registry and student tagIds
 */
export const ACTIVITY_FILE_VERSION = 4;

/**
 * Student data for export (subset of domain Student).
 */
export interface ExportedStudent {
  id: string;
  firstName: string;
  preferredName?: string;
  lastName?: string;
  gradeLevel?: string;
  gender?: string;
  tagIds?: string[];
  meta?: Record<string, unknown>;
}

/**
 * Preference data for export.
 */
export interface ExportedPreference {
  studentId: string;
  likeGroupIds: string[];
  avoidStudentIds: string[];
  avoidGroupIds: string[];
}

/**
 * Group data for export.
 * Note: capacity uses null (not undefined) to match domain Group type.
 */
export interface ExportedGroup {
  id: string;
  name: string;
  capacity: number | null;
  memberIds: string[];
  colorIndex?: number;
}

/**
 * Scenario data for export (optional - activity may not have groups yet).
 */
export interface ExportedScenario {
  groups: ExportedGroup[];
  algorithmConfig?: unknown;
}

/**
 * Session data for export (v2+).
 */
export interface ExportedSession {
  id: string;
  name: string;
  academicYear: string;
  startDate: string; // ISO
  endDate: string; // ISO
  status: string;
  scenarioId?: string;
  publishedAt?: string; // ISO
  createdAt: string; // ISO
}

/**
 * Placement data for export (v2+).
 */
export interface ExportedPlacement {
  id: string;
  sessionId: string;
  studentId: string;
  groupId: string;
  groupName: string;
  preferenceRank: number | null;
  preferenceSnapshot?: string[];
  assignedAt: string; // ISO
  startDate: string; // ISO
  endDate?: string; // ISO
  type: string;
  correctsPlacementId?: string;
  reason?: string;
}

/**
 * Observation data for export (v2+).
 */
export interface ExportedObservation {
  id: string;
  sessionId?: string;
  groupId: string;
  groupName: string;
  content: string;
  sentiment?: string;
  tags?: string[];
  createdAt: string; // ISO
}

/**
 * Peer request data for export (v3+).
 */
export interface ExportedPeerRequest {
  id: string;
  requesterStudentId: string;
  rank: number;
  rawText: string;
  normalizedText: string;
  status: PeerRequestResolutionStatus;
  resolvedStudentId?: string;
  resolutionSource: PeerRequestResolutionSource;
  initialResolvedStudentId?: string;
  initialResolutionSource?: Exclude<PeerRequestResolutionSource, 'NONE'>;
  resolutionHistory: PeerRequestResolutionAuditEntry[];
  candidates: PeerRequestCandidate[];
}

/**
 * Complete activity export data structure.
 * v1 fields: activity, roster, preferences, scenario
 * v2 fields: sessions, placements, observations, pool
 * v3 fields: peer requests
 */
export interface ActivityExportData {
  version: number;
  exportedAt: string; // ISO date string
  activity: {
    name: string;
    type: ProgramType;
  };
  roster: {
    students: ExportedStudent[];
  };
  tags?: Tag[];
  preferences: ExportedPreference[];
  scenario?: ExportedScenario;
  // v2 fields
  pool?: {
    name: string;
    type: string;
  };
  sessions?: ExportedSession[];
  placements?: ExportedPlacement[];
  observations?: ExportedObservation[];
  peerRequests?: ExportedPeerRequest[];
}

// =============================================================================
// Export Functions
// =============================================================================

/**
 * Serialize activity data to JSON string.
 */
export function serializeActivityToJson(data: ActivityExportData): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Generate a filename for the exported activity.
 * Format: {activity-name}-{YYYY-MM-DD}-{HHMMSS}.json
 */
export function generateExportFilename(activityName: string): string {
  const now = new Date();

  // Format date as YYYY-MM-DD
  const date = now.toISOString().split('T')[0];

  // Format time as HHMMSS (no colons for filesystem compatibility)
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const time = `${hours}${minutes}${seconds}`;

  // Sanitize activity name for filename
  const safeName = activityName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50); // Limit length

  return `${safeName}-${date}-${time}.json`;
}

/**
 * Download activity data as a JSON file.
 * Creates a temporary anchor element to trigger browser download.
 */
export function downloadActivityFile(data: ActivityExportData, filename: string): void {
  const json = serializeActivityToJson(data);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();

  // Cleanup
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Download a full-page screenshot of the current document as a PNG.
 */
export async function downloadActivityScreenshot(filename: string): Promise<boolean> {
  try {
    const { toBlob } = await import('html-to-image');
    const page = document.documentElement;
    const blob = await toBlob(page, {
      backgroundColor: '#ffffff',
      width: page.scrollWidth,
      height: page.scrollHeight
    });

    if (!blob) return false;

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// Import/Validation Functions
// =============================================================================

/**
 * Validation result for imported activity data.
 */
export type ActivityFileValidation =
  | { valid: true; data: ActivityExportData }
  | { valid: false; error: string };

/**
 * Parse and validate an activity file's JSON content.
 */
export function parseActivityFile(jsonString: string): ActivityFileValidation {
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return { valid: false, error: 'Invalid JSON format' };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, error: 'File must contain a JSON object' };
  }

  const data = parsed as Record<string, unknown>;

  // Check version
  if (typeof data.version !== 'number') {
    return { valid: false, error: 'Missing or invalid version field' };
  }

  if (data.version > ACTIVITY_FILE_VERSION) {
    return {
      valid: false,
      error: `File version ${data.version} is newer than supported version ${ACTIVITY_FILE_VERSION}. Please update Groupwheel.`
    };
  }

  // Check required fields
  if (!data.activity || typeof data.activity !== 'object') {
    return { valid: false, error: 'Missing activity information' };
  }

  const activity = data.activity as Record<string, unknown>;
  if (typeof activity.name !== 'string' || !activity.name.trim()) {
    return { valid: false, error: 'Activity name is required' };
  }

  if (!data.roster || typeof data.roster !== 'object') {
    return { valid: false, error: 'Missing roster information' };
  }

  const roster = data.roster as Record<string, unknown>;
  if (!Array.isArray(roster.students)) {
    return { valid: false, error: 'Missing students array' };
  }

  // Validate students
  for (let i = 0; i < roster.students.length; i++) {
    const student = roster.students[i];
    if (!student || typeof student !== 'object') {
      return { valid: false, error: `Invalid student at index ${i}` };
    }
    const s = student as Record<string, unknown>;
    if (typeof s.id !== 'string' || !s.id.trim()) {
      return { valid: false, error: `Student at index ${i} is missing an ID` };
    }
    if (typeof s.firstName !== 'string' || !s.firstName.trim()) {
      return { valid: false, error: `Student at index ${i} is missing a first name` };
    }
  }

  // Validate preferences (optional but must be array if present)
  if (data.preferences !== undefined && !Array.isArray(data.preferences)) {
    return { valid: false, error: 'Preferences must be an array' };
  }

  if (data.peerRequests !== undefined && !Array.isArray(data.peerRequests)) {
    return { valid: false, error: 'Peer requests must be an array' };
  }

  // Validate scenario if present
  if (data.scenario !== undefined) {
    if (typeof data.scenario !== 'object' || data.scenario === null) {
      return { valid: false, error: 'Invalid scenario format' };
    }
    const scenario = data.scenario as Record<string, unknown>;
    if (!Array.isArray(scenario.groups)) {
      return { valid: false, error: 'Scenario must have a groups array' };
    }

    // Validate groups
    for (let i = 0; i < scenario.groups.length; i++) {
      const group = scenario.groups[i];
      if (!group || typeof group !== 'object') {
        return { valid: false, error: `Invalid group at index ${i}` };
      }
      const g = group as Record<string, unknown>;
      if (typeof g.name !== 'string' || !g.name.trim()) {
        return { valid: false, error: `Group at index ${i} is missing a name` };
      }
      if (!Array.isArray(g.memberIds)) {
        return { valid: false, error: `Group at index ${i} is missing memberIds array` };
      }
    }
  }

  // Construct validated data
  const validatedData: ActivityExportData = {
    version: data.version as number,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : new Date().toISOString(),
    activity: {
      name: (activity.name as string).trim(),
      type: isValidProgramType(activity.type) ? activity.type : 'CLASS_ACTIVITY'
    },
    roster: {
      students: (roster.students as Record<string, unknown>[]).map((s) => ({
        id: (s.id as string).trim(),
        firstName: (s.firstName as string).trim(),
        preferredName: typeof s.preferredName === 'string' ? s.preferredName.trim() : undefined,
        lastName: typeof s.lastName === 'string' ? s.lastName.trim() : undefined,
        gradeLevel: typeof s.gradeLevel === 'string' ? s.gradeLevel.trim() : undefined,
        gender: typeof s.gender === 'string' ? s.gender.trim() : undefined,
        tagIds: Array.isArray(s.tagIds)
          ? s.tagIds.filter((tagId): tagId is string => typeof tagId === 'string')
          : undefined,
        meta: s.meta && typeof s.meta === 'object' ? (s.meta as Record<string, unknown>) : undefined
      }))
    },
    tags: Array.isArray(data.tags)
      ? (data.tags as Record<string, unknown>[])
          .filter((tag) => typeof tag.id === 'string' && typeof tag.programId === 'string')
          .map((tag) => ({
            id: String(tag.id),
            programId: String(tag.programId),
            name: typeof tag.name === 'string' ? tag.name : '',
            colorIndex: isValidColorIndex(tag.colorIndex) ? tag.colorIndex : undefined
          }))
          .filter((tag) => tag.name.trim().length > 0)
      : undefined,
    preferences: Array.isArray(data.preferences)
      ? (data.preferences as Record<string, unknown>[]).map((p) => ({
          studentId: typeof p.studentId === 'string' ? p.studentId : '',
          likeGroupIds: Array.isArray(p.likeGroupIds) ? (p.likeGroupIds as string[]) : [],
          avoidStudentIds: Array.isArray(p.avoidStudentIds) ? (p.avoidStudentIds as string[]) : [],
          avoidGroupIds: Array.isArray(p.avoidGroupIds) ? (p.avoidGroupIds as string[]) : []
        }))
      : []
  };

  // Add scenario if present
  if (data.scenario) {
    const scenario = data.scenario as Record<string, unknown>;
    validatedData.scenario = {
      groups: (scenario.groups as Record<string, unknown>[]).map((g) => ({
        id: typeof g.id === 'string' ? g.id : `group-${Math.random().toString(36).slice(2, 8)}`,
        name: (g.name as string).trim(),
        capacity: typeof g.capacity === 'number' ? g.capacity : null,
        memberIds: (g.memberIds as string[]).filter((id) => typeof id === 'string'),
        colorIndex: isValidColorIndex(g.colorIndex) ? g.colorIndex : undefined
      })),
      algorithmConfig: scenario.algorithmConfig
    };
  }

  // v2 fields: pool metadata
  if (data.pool && typeof data.pool === 'object') {
    const pool = data.pool as Record<string, unknown>;
    validatedData.pool = {
      name: typeof pool.name === 'string' ? pool.name : '',
      type: typeof pool.type === 'string' ? pool.type : 'CLASS'
    };
  }

  // v2 fields: sessions
  if (Array.isArray(data.sessions)) {
    validatedData.sessions = (data.sessions as Record<string, unknown>[]).map((s) => ({
      id: String(s.id ?? ''),
      name: String(s.name ?? ''),
      academicYear: String(s.academicYear ?? ''),
      startDate: String(s.startDate ?? ''),
      endDate: String(s.endDate ?? ''),
      status: String(s.status ?? 'DRAFT'),
      scenarioId: typeof s.scenarioId === 'string' ? s.scenarioId : undefined,
      publishedAt: typeof s.publishedAt === 'string' ? s.publishedAt : undefined,
      createdAt: String(s.createdAt ?? new Date().toISOString())
    }));
  }

  // v2 fields: placements
  if (Array.isArray(data.placements)) {
    validatedData.placements = (data.placements as Record<string, unknown>[]).map((p) => ({
      id: String(p.id ?? ''),
      sessionId: String(p.sessionId ?? ''),
      studentId: String(p.studentId ?? ''),
      groupId: String(p.groupId ?? ''),
      groupName: String(p.groupName ?? ''),
      preferenceRank: typeof p.preferenceRank === 'number' ? p.preferenceRank : null,
      preferenceSnapshot: Array.isArray(p.preferenceSnapshot)
        ? (p.preferenceSnapshot as string[])
        : undefined,
      assignedAt: String(p.assignedAt ?? ''),
      startDate: String(p.startDate ?? ''),
      endDate: typeof p.endDate === 'string' ? p.endDate : undefined,
      type: String(p.type ?? 'INITIAL'),
      correctsPlacementId:
        typeof p.correctsPlacementId === 'string' ? p.correctsPlacementId : undefined,
      reason: typeof p.reason === 'string' ? p.reason : undefined
    }));
  }

  // v2 fields: observations
  if (Array.isArray(data.observations)) {
    validatedData.observations = (data.observations as Record<string, unknown>[]).map((o) => ({
      id: String(o.id ?? ''),
      sessionId: typeof o.sessionId === 'string' ? o.sessionId : undefined,
      groupId: String(o.groupId ?? ''),
      groupName: String(o.groupName ?? ''),
      content: String(o.content ?? ''),
      sentiment: typeof o.sentiment === 'string' ? o.sentiment : undefined,
      tags: Array.isArray(o.tags) ? (o.tags as string[]) : undefined,
      createdAt: String(o.createdAt ?? new Date().toISOString())
    }));
  }

  if (Array.isArray(data.peerRequests)) {
    for (let i = 0; i < data.peerRequests.length; i++) {
      const request = data.peerRequests[i];
      if (!request || typeof request !== 'object') {
        return { valid: false, error: `Invalid peer request at index ${i}` };
      }

      const peerRequest = request as Record<string, unknown>;
      if (typeof peerRequest.id !== 'string' || !peerRequest.id.trim()) {
        return { valid: false, error: `Peer request at index ${i} is missing an ID` };
      }
      if (
        typeof peerRequest.requesterStudentId !== 'string' ||
        !peerRequest.requesterStudentId.trim()
      ) {
        return {
          valid: false,
          error: `Peer request at index ${i} is missing a requesterStudentId`
        };
      }
      if (!Number.isInteger(peerRequest.rank) || Number(peerRequest.rank) < 1) {
        return { valid: false, error: `Peer request at index ${i} has an invalid rank` };
      }
      if (typeof peerRequest.rawText !== 'string' || !peerRequest.rawText.trim()) {
        return { valid: false, error: `Peer request at index ${i} is missing rawText` };
      }
      if (
        peerRequest.resolutionHistory !== undefined &&
        !Array.isArray(peerRequest.resolutionHistory)
      ) {
        return {
          valid: false,
          error: `Peer request at index ${i} has invalid resolutionHistory`
        };
      }
      if (peerRequest.candidates !== undefined && !Array.isArray(peerRequest.candidates)) {
        return { valid: false, error: `Peer request at index ${i} has invalid candidates` };
      }
    }

    validatedData.peerRequests = (data.peerRequests as Record<string, unknown>[]).map((request) => {
      const rawText = String(request.rawText ?? '').trim();
      const resolvedStudentId =
        typeof request.resolvedStudentId === 'string' && request.resolvedStudentId.trim()
          ? request.resolvedStudentId
          : undefined;
      const initialResolvedStudentId =
        typeof request.initialResolvedStudentId === 'string' &&
        request.initialResolvedStudentId.trim()
          ? request.initialResolvedStudentId
          : undefined;

      return {
        id: String(request.id ?? ''),
        requesterStudentId: String(request.requesterStudentId ?? ''),
        rank: Number(request.rank ?? 1),
        rawText,
        normalizedText:
          typeof request.normalizedText === 'string' && request.normalizedText.trim()
            ? request.normalizedText.trim()
            : normalizePeerRequestText(rawText),
        status: isValidPeerRequestResolutionStatus(request.status) ? request.status : 'UNRESOLVED',
        resolvedStudentId,
        resolutionSource: isValidPeerRequestResolutionSource(request.resolutionSource)
          ? request.resolutionSource
          : 'NONE',
        initialResolvedStudentId,
        initialResolutionSource:
          initialResolvedStudentId &&
          isValidInitialPeerRequestResolutionSource(request.initialResolutionSource)
            ? request.initialResolutionSource
            : undefined,
        resolutionHistory: Array.isArray(request.resolutionHistory)
          ? request.resolutionHistory
              .filter(
                (entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object'
              )
              .map((entry) => ({
                action: isValidPeerRequestResolutionAuditAction(entry.action)
                  ? entry.action
                  : 'CLEARED',
                resolvedStudentId:
                  typeof entry.resolvedStudentId === 'string' && entry.resolvedStudentId.trim()
                    ? entry.resolvedStudentId
                    : undefined,
                resolutionSource: isValidPeerRequestResolutionSource(entry.resolutionSource)
                  ? entry.resolutionSource
                  : 'NONE',
                occurredAt:
                  typeof entry.occurredAt === 'string' && entry.occurredAt.trim()
                    ? entry.occurredAt
                    : undefined
              }))
          : [],
        candidates: Array.isArray(request.candidates)
          ? request.candidates
              .filter(
                (candidate): candidate is Record<string, unknown> =>
                  !!candidate && typeof candidate === 'object'
              )
              .map((candidate) => ({
                studentId: String(candidate.studentId ?? ''),
                score: typeof candidate.score === 'number' ? candidate.score : 0,
                confidence:
                  typeof candidate.confidence === 'number' ? candidate.confidence : undefined,
                baseScore:
                  typeof candidate.baseScore === 'number' ? candidate.baseScore : undefined,
                reasons: Array.isArray(candidate.reasons)
                  ? candidate.reasons.filter(
                      (reason): reason is string => typeof reason === 'string'
                    )
                  : []
              }))
          : []
      };
    });
  }

  return { valid: true, data: validatedData };
}

/**
 * Type guard for valid ProgramType values.
 */
function isValidProgramType(value: unknown): value is ProgramType {
  return (
    value === 'CLUBS' ||
    value === 'ADVISORY' ||
    value === 'CABINS' ||
    value === 'CLASS_ACTIVITY' ||
    value === 'OTHER'
  );
}

function isValidColorIndex(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isValidPeerRequestResolutionStatus(value: unknown): value is PeerRequestResolutionStatus {
  return (
    value === 'UNRESOLVED' ||
    value === 'AUTO_MATCHED_PENDING_CONFIRMATION' ||
    value === 'CONFIRMED' ||
    value === 'MANUALLY_SET'
  );
}

function isValidPeerRequestResolutionSource(value: unknown): value is PeerRequestResolutionSource {
  return value === 'NONE' || value === 'AUTO' || value === 'MANUAL';
}

function isValidInitialPeerRequestResolutionSource(
  value: unknown
): value is Exclude<PeerRequestResolutionSource, 'NONE'> {
  return value === 'AUTO' || value === 'MANUAL';
}

function isValidPeerRequestResolutionAuditAction(
  value: unknown
): value is PeerRequestResolutionAuditAction {
  return value === 'AUTO_MATCHED' || value === 'MANUALLY_SET' || value === 'CLEARED';
}

/**
 * Read a File object and return its contents as a string.
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsText(file);
  });
}
