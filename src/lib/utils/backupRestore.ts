/**
 * Full database backup and restore utilities.
 *
 * Exports all IndexedDB object stores to a single JSON file,
 * enabling data transfer between browsers/computers.
 *
 * @module utils/backupRestore
 */

import { openDb, DB_NAME, DB_VERSION } from '$lib/infrastructure/repositories/indexedDb/db';

/** All object store names in the database. */
const ALL_STORES = [
  'programs',
  'pools',
  'students',
  'staff',
  'scenarios',
  'sessions',
  'placements',
  'preferences',
  'observations',
  'groupTemplates',
  'studentIdentities'
] as const;

export const BACKUP_FILE_VERSION = 1;

export interface BackupData {
  version: number;
  dbVersion: number;
  exportedAt: string;
  stores: Record<string, unknown[]>;
}

export type BackupValidation =
  | { valid: true; data: BackupData; summary: BackupSummary }
  | { valid: false; error: string };

export interface BackupSummary {
  exportedAt: string;
  programs: number;
  pools: number;
  students: number;
  staff: number;
  scenarios: number;
  sessions: number;
  placements: number;
  preferences: number;
  observations: number;
  groupTemplates: number;
  studentIdentities: number;
}

/**
 * Export all data from IndexedDB as a BackupData object.
 */
export async function exportAllData(): Promise<BackupData> {
  const db = await openDb();
  const stores: Record<string, unknown[]> = {};

  for (const storeName of ALL_STORES) {
    if (db.objectStoreNames.contains(storeName)) {
      stores[storeName] = await readAllFromStore(db, storeName);
    }
  }

  return {
    version: BACKUP_FILE_VERSION,
    dbVersion: DB_VERSION,
    exportedAt: new Date().toISOString(),
    stores
  };
}

/**
 * Read all records from a single object store.
 */
function readAllFromStore(db: IDBDatabase, storeName: string): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result ?? []);
  });
}

/**
 * Serialize backup data to a JSON string for download.
 */
export function serializeBackup(data: BackupData): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Generate a filename for the backup file.
 */
export function generateBackupFilename(): string {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `groupwheel-backup-${date}-${hours}${minutes}.json`;
}

/**
 * Download backup data as a JSON file.
 */
export function downloadBackupFile(data: BackupData): void {
  const json = serializeBackup(data);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = generateBackupFilename();
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();

  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Parse and validate a backup file.
 */
export function parseBackupFile(jsonString: string): BackupValidation {
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return { valid: false, error: 'Invalid JSON format.' };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, error: 'File must contain a JSON object.' };
  }

  const data = parsed as Record<string, unknown>;

  if (typeof data.version !== 'number') {
    return { valid: false, error: 'Missing or invalid version field. This may not be a Groupwheel backup file.' };
  }

  if (data.version > BACKUP_FILE_VERSION) {
    return {
      valid: false,
      error: `Backup version ${data.version} is newer than supported version ${BACKUP_FILE_VERSION}. Please update Groupwheel.`
    };
  }

  if (!data.stores || typeof data.stores !== 'object') {
    return { valid: false, error: 'Missing data stores. This may not be a Groupwheel backup file.' };
  }

  const stores = data.stores as Record<string, unknown>;

  // Validate that store values are arrays
  for (const [key, value] of Object.entries(stores)) {
    if (!Array.isArray(value)) {
      return { valid: false, error: `Invalid data for store "${key}": expected an array.` };
    }
  }

  const backupData: BackupData = {
    version: data.version as number,
    dbVersion: typeof data.dbVersion === 'number' ? data.dbVersion : DB_VERSION,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : new Date().toISOString(),
    stores: stores as Record<string, unknown[]>
  };

  const storeCount = (name: string) => (backupData.stores[name]?.length ?? 0);

  const summary: BackupSummary = {
    exportedAt: backupData.exportedAt,
    programs: storeCount('programs'),
    pools: storeCount('pools'),
    students: storeCount('students'),
    staff: storeCount('staff'),
    scenarios: storeCount('scenarios'),
    sessions: storeCount('sessions'),
    placements: storeCount('placements'),
    preferences: storeCount('preferences'),
    observations: storeCount('observations'),
    groupTemplates: storeCount('groupTemplates'),
    studentIdentities: storeCount('studentIdentities')
  };

  return { valid: true, data: backupData, summary };
}

/**
 * Restore backup data into IndexedDB.
 * Clears existing data in each store before writing.
 */
export async function restoreAllData(backup: BackupData): Promise<void> {
  const db = await openDb();

  // Process each store: clear then write all records
  for (const storeName of ALL_STORES) {
    const records = backup.stores[storeName];
    if (!records || !db.objectStoreNames.contains(storeName)) continue;

    await clearAndWriteStore(db, storeName, records);
  }
}

/**
 * Clear a store and write all records into it.
 */
function clearAndWriteStore(
  db: IDBDatabase,
  storeName: string,
  records: unknown[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    // Clear existing data first
    const clearRequest = store.clear();
    clearRequest.onerror = () => reject(clearRequest.error);
    clearRequest.onsuccess = () => {
      // Write all records
      let pending = records.length;
      if (pending === 0) {
        resolve();
        return;
      }

      for (const record of records) {
        const putRequest = store.put(record);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => {
          pending--;
          if (pending === 0) resolve();
        };
      }
    };
  });
}

/**
 * Read a File object as text.
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
