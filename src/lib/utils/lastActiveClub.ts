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
  } catch (error) {
    console.warn('Could not save the last active club to local storage.', error);
  }
}
