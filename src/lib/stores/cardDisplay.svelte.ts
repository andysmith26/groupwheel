export type TagColorMode = 'background' | 'border';

interface StoredCardDisplay {
  hiddenTagIds: Record<string, true>;
  tagColorModes: Record<string, TagColorMode>;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseStoredCardDisplay(value: unknown): StoredCardDisplay | null {
  if (!isPlainObject(value)) return null;
  const modes = value.tagColorModes;
  if (!isPlainObject(modes)) return null;
  if (!Object.values(modes).every((mode) => mode === 'background' || mode === 'border')) {
    return null;
  }
  const hidden: Record<string, true> = {};
  if (value.hiddenTagIds !== undefined) {
    if (!isPlainObject(value.hiddenTagIds)) return null;
    for (const [id, flag] of Object.entries(value.hiddenTagIds)) {
      if (flag !== true) return null;
      hidden[id] = true;
    }
  }
  // Legacy `showTags` is intentionally ignored.
  return { hiddenTagIds: hidden, tagColorModes: modes as Record<string, TagColorMode> };
}

export class CardDisplayStore {
  hiddenTagIds = $state<Record<string, true>>({});
  tagColorModes = $state<Record<string, TagColorMode>>({});
  private activityId: string | null = null;

  load(activityId: string): void {
    this.reset();
    this.activityId = activityId;
    if (typeof localStorage === 'undefined') return;

    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const parsed = parseStoredCardDisplay(JSON.parse(raw));
      if (!parsed) return;
      this.hiddenTagIds = parsed.hiddenTagIds;
      this.tagColorModes = parsed.tagColorModes;
    } catch {
      /* ignore */
    }
  }

  reset(): void {
    this.hiddenTagIds = {};
    this.tagColorModes = {};
    this.activityId = null;
  }

  isTagVisible(tagId: string): boolean {
    return !(tagId in this.hiddenTagIds);
  }

  setTagVisible(tagId: string, visible: boolean): void {
    if (this.isTagVisible(tagId) === visible) return;
    const hidden = { ...this.hiddenTagIds };
    if (visible) {
      delete hidden[tagId];
    } else {
      hidden[tagId] = true;
    }
    this.hiddenTagIds = hidden;
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
    const inModes = tagId in this.tagColorModes;
    const inHidden = tagId in this.hiddenTagIds;
    if (!inModes && !inHidden) return;
    const modes = { ...this.tagColorModes };
    delete modes[tagId];
    const hidden = { ...this.hiddenTagIds };
    delete hidden[tagId];
    this.tagColorModes = modes;
    this.hiddenTagIds = hidden;
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
        JSON.stringify({ hiddenTagIds: this.hiddenTagIds, tagColorModes: this.tagColorModes })
      );
    } catch {
      /* ignore */
    }
  }
}

export const cardDisplay = new CardDisplayStore();
