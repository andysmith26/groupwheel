import type { Tag } from '$lib/domain';
import type { TagColorMode } from '$lib/stores/cardDisplay.svelte';
import { resolveTagColorHex } from './tagColors';

export function resolveCardTagStyling(
  student: { tagIds?: string[] },
  tagsById: Record<string, Tag>,
  modes: Record<string, TagColorMode>
): { backgroundHex: string | null; borderHex: string | null; conflicts: string[] } {
  const tags = (student.tagIds ?? [])
    .map((tagId) => ({ tag: tagsById[tagId], mode: modes[tagId] }))
    .filter(
      (entry): entry is { tag: Tag; mode: TagColorMode } =>
        entry.tag !== undefined && entry.mode !== undefined
    );
  const backgroundTags = tags.filter(({ mode }) => mode === 'background');
  const borderTags = tags.filter(({ mode }) => mode === 'border');
  const conflicts: string[] = [];

  if (backgroundTags.length > 1) {
    conflicts.push(
      `Conflicting background colors: ${backgroundTags.map(({ tag }) => tag.name).join(', ')}. Change one in Manage Tags.`
    );
  }
  if (borderTags.length > 1) {
    conflicts.push(
      `Conflicting border colors: ${borderTags.map(({ tag }) => tag.name).join(', ')}. Change one in Manage Tags.`
    );
  }

  return {
    backgroundHex: backgroundTags.length === 1 ? resolveTagColorHex(backgroundTags[0].tag) : null,
    borderHex: borderTags.length === 1 ? resolveTagColorHex(borderTags[0].tag) : null,
    conflicts
  };
}
