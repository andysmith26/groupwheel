export type TagColorMode = 'background' | 'border';

interface StoredCardDisplay {
  showTags: boolean;
  tagColorModes: Record<string, TagColorMode>;
}

const DEFAULT_SHOW_TAGS = true;

function isStoredCardDisplay(value: unknown): value is StoredCardDisplay {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.showTags !== 'boolean') return false;
  if (
    typeof candidate.tagColorModes !== 'object' ||
    candidate.tagColorModes === null ||
    Array.isArray(candidate.tagColorModes)
  ) {
    return false;
  }
  return Object.values(candidate.tagColorModes).every(
    (mode) => mode === 'background' || mode === 'border'
  );
}

export class CardDisplayStore {
  showTags = $state(DEFAULT_SHOW_TAGS);
  tagColorModes = $state<Record<string, TagColorMode>>({});
  private activityId: string | null = null;

  load(activityId: string): void {
    this.reset();
    this.activityId = activityId;
    if (typeof localStorage === 'undefined') return;

    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!isStoredCardDisplay(parsed)) return;
      this.showTags = parsed.showTags;
      this.tagColorModes = { ...parsed.tagColorModes };
    } catch {
      /* ignore */
    }
  }

  reset(): void {
    this.showTags = DEFAULT_SHOW_TAGS;
    this.tagColorModes = {};
    this.activityId = null;
  }

  setShowTags(value: boolean): void {
    this.showTags = value;
    this.persist();
  }

  setTagColorMode(tagId: string, mode: TagColorMode | null): void {
    const modes = { ...this.tagColorModes };
    if (mode === null) {
      delete modes[tagId];
    } else {
      modes[tagId] = mode;
    }
    this.tagColorModes = modes;
    this.persist();
  }

  removeTag(tagId: string): void {
    if (!(tagId in this.tagColorModes)) return;
    const modes = { ...this.tagColorModes };
    delete modes[tagId];
    this.tagColorModes = modes;
    this.persist();
  }

  private get storageKey(): string {
    return `groupwheel:cardDisplay:${this.activityId}`;
  }

  private persist(): void {
    if (!this.activityId || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(
        this.storageKey,
        JSON.stringify({ showTags: this.showTags, tagColorModes: this.tagColorModes })
      );
    } catch {
      /* ignore */
    }
  }
}

export const cardDisplay = new CardDisplayStore();
