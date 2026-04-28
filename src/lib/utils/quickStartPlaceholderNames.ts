const QUICK_START_FIRST_NAMES = [
  'River',
  'Moss',
  'Sunny',
  'Cedar',
  'Maple',
  'Clover',
  'Pebble',
  'Fern',
  'Willow',
  'Briar',
  'Dune',
  'Poppy',
  'Juniper',
  'Coral',
  'Echo',
  'Sky',
  'Pine',
  'Meadow',
  'Ocean',
  'Amber'
] as const;

const QUICK_START_LAST_NAMES = [
  'Otter',
  'Finch',
  'Fox',
  'Sparrow',
  'Robin',
  'Wren',
  'Badger',
  'Lynx',
  'Heron',
  'Kestrel',
  'Brook',
  'Ridge',
  'Grove',
  'Stone',
  'Leaf',
  'Wave',
  'Thicket',
  'Prairie',
  'Harbor',
  'Glade'
] as const;

const FIRST_NAME_SET = new Set<string>(QUICK_START_FIRST_NAMES);
const LAST_NAME_SET = new Set<string>(QUICK_START_LAST_NAMES);

/**
 * Deterministically generates a quick-start placeholder name for a zero-based index.
 * Supports up to 400 unique combinations with the current vocabulary.
 */
export function buildQuickStartPlaceholderName(index: number): {
  firstName: string;
  lastName: string;
} {
  const firstName = QUICK_START_FIRST_NAMES[index % QUICK_START_FIRST_NAMES.length];
  const lastName = QUICK_START_LAST_NAMES[index % QUICK_START_LAST_NAMES.length];

  return { firstName, lastName };
}

/**
 * Returns true when the given name matches the quick-start placeholder vocabulary.
 */
export function isQuickStartPlaceholderName(firstName: string, lastName: string): boolean {
  return FIRST_NAME_SET.has(firstName) && LAST_NAME_SET.has(lastName);
}
