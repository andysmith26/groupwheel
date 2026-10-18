const LAST_ACTIVE_CLUB_KEY = 'groupwheel:last-active-club';
const LAST_USED_CLUBS_KEY = 'groupwheel:last-used-clubs';

type LastUsedClubMap = Record<string, number>;

function readLastUsedClubMap(): LastUsedClubMap {
  try {
    const raw = localStorage.getItem(LAST_USED_CLUBS_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).flatMap(([clubId, value]) =>
        typeof value === 'number' && Number.isFinite(value) ? [[clubId, value]] : []
      )
    );
  } catch (error) {
    console.warn('Could not read last-used clubs from local storage.', error);
    return {};
  }
}

function writeLastUsedClubMap(map: LastUsedClubMap): void {
  try {
    localStorage.setItem(LAST_USED_CLUBS_KEY, JSON.stringify(map));
  } catch (error) {
    console.warn('Could not save last-used clubs to local storage.', error);
  }
}

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
    const map = readLastUsedClubMap();
    map[clubId] = Date.now();
    writeLastUsedClubMap(map);
  } catch (error) {
    console.warn('Could not save the last active club to local storage.', error);
  }
}

export function getLastUsedClubTimestamp(clubId: string): number {
  return readLastUsedClubMap()[clubId] ?? 0;
}

export function getLastUsedClubIds(): string[] {
  return Object.entries(readLastUsedClubMap())
    .sort(([, a], [, b]) => b - a)
    .map(([clubId]) => clubId);
}

export function getMostRecentlyUsedClubId(clubIds: string[]): string | null {
  const map = readLastUsedClubMap();
  let mostRecentId: string | null = null;
  let mostRecentTimestamp = -Infinity;

  for (const clubId of clubIds) {
    const timestamp = map[clubId] ?? 0;
    if (timestamp >= mostRecentTimestamp) {
      mostRecentTimestamp = timestamp;
      mostRecentId = clubId;
    }
  }

  return mostRecentId;
}
