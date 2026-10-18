const LAST_ACTIVE_CLUB_KEY = 'groupwheel:last-active-club';

export function getLastActiveClubId(): string | null {
  try {
    return localStorage.getItem(LAST_ACTIVE_CLUB_KEY);
  } catch (error) {
    console.warn('Could not read the last active club from local storage.', error);
    return null;
  }
}

export function setLastActiveClubId(clubId: string): void {
  try {
    localStorage.setItem(LAST_ACTIVE_CLUB_KEY, clubId);
    touchLastUsed(clubId);
  } catch (error) {
    console.warn('Could not save the last active club to local storage.', error);
  }
}

const LAST_USED_MAP_KEY = 'groupwheel:last-used-map';

function readLastUsedMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(LAST_USED_MAP_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, number>)
      : {};
  } catch {
    return {};
  }
}

export function getLastUsedTimestamp(activityId: string): number {
  const value = readLastUsedMap()[activityId];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function touchLastUsed(activityId: string, now: number = Date.now()): void {
  try {
    const map = readLastUsedMap();
    map[activityId] = now;
    localStorage.setItem(LAST_USED_MAP_KEY, JSON.stringify(map));
  } catch (error) {
    console.warn('Could not save last-used timestamp to local storage.', error);
  }
}

/** Sort IDs by most recently used first; stable for ties. */
export function sortIdsByLastUsed(ids: string[]): string[] {
  const map = readLastUsedMap();
  return [...ids].sort((a, b) => (map[b] ?? 0) - (map[a] ?? 0));
}

export function sortByLastUsed<T>(items: T[], getId: (item: T) => string): T[] {
  const map = readLastUsedMap();
  return [...items].sort((a, b) => (map[getId(b)] ?? 0) - (map[getId(a)] ?? 0));
}

export function resolveMostRecentId(ids: string[]): string | null {
  return sortIdsByLastUsed(ids)[0] ?? null;
}
