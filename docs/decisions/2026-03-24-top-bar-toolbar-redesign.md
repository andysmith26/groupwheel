# Top Bar Toolbar Redesign

**Date:** 2026-03-24  
**Status:** Accepted

## Context

The activity detail page (ClassView) currently has two command surfaces: a sparse top bar (back button, roster toggle, activity name, save status) and a floating bottom pill containing a gear icon and a "Done" button. Both the gear and Done button open upward-flying popovers.

This creates several UX problems:

- **"Done" is misleading** — it implies finishing, but opens an export menu (Print, Copy, Save). This contradicts the continuous-autosave workspace paradigm established in UX_STRATEGY.md.
- **The gear is a junk drawer** — it mixes display mode, session history, group management (rename/delete/add), and rotation settings in one mega-popover.
- **The top bar is underutilized** — empty right side where Google Docs users expect actions.
- **Two upward popovers from a narrow bottom pill** are spatially disorienting.
- Current users' primary workflow is generate → tweak → copy to spreadsheet. "Show to Class" and projection are not in active use yet.

## Decision

Consolidate all actions into the top bar. Eliminate the floating bottom toolbar entirely.

### Top bar layout

```
┌──────────────────────────────────────────────────────────────────┐
│  ←  │ 👥 │  Period 3 English  │  Saved ✓  │   [⏱]  [⚙]  [Share ▾]  │
└──────────────────────────────────────────────────────────────────┘
```

**Left side** (unchanged): Back button, Roster toggle, Activity name, Save status indicator.

**Right side** (new): History icon button, Settings gear dropdown, Share button.

### Share dropdown

Clicking "Share ▾" opens a dropdown menu:

```
┌──────────────────────────────┐
│  📋  Copy for Spreadsheet    │   ← primary user action (top slot)
│  💾  Save / Back Up          │
│  🖨  Print                   │
│  ─────────────────────────── │
│  📺  Display                 │   ← fullscreen projection on current screen
│  📤  Publish                 │   ← make groups viewable by students on their devices
└──────────────────────────────┘
```

- Items above the divider are **export actions** (get data out), ordered by current usage frequency.
- Items below the divider are **output modes** (show data to others), available but secondary.
- "Display" = show groups fullscreen on the teacher's projector/screen, right now.
- "Publish" = push groups so students can see their assignments on their own devices.
- The word "Share" follows Google Docs convention — teachers already associate it with "get this content somewhere else."

### Settings (gear) dropdown

```
┌────────── Settings ───────────────────┐
│  Manage Groups                        │
│  ┌─ 🟢 Table 1          max: —    ✎  │
│  ├─ 🔵 Table 2          max: 4    ✎  │
│  ├─ 🟣 Table 3          max: 4    ✎  │
│  └─ [+ Add Group]                    │
│  ──────────────────────────────────── │
│  ☑ Avoid recent groupmates            │
│  Look back ██████████ 3 sessions      │
└───────────────────────────────────────┘
```

Each group row shows: color dot, group name, max enrollment indicator (`max: N` or `max: —` for no limit), and a single edit button (pencil icon).

Two sections: group structure management + rotation algorithm settings.

### Edit Group modal

Clicking the pencil icon on a group row opens a modal dialog:

```
┌──────── Edit Group ───────────────────┐
│                                       │
│  Name    [Table 2              ]      │
│                                       │
│  Color   🟢 🔵 🟣 🔴 🟠 🟤 ⚫ 🩷      │
│                                       │
│  Max students   [ 4  ]  (or blank)    │
│                                       │
│  ──────────────────────────────────── │
│  [🗑 Delete Group]         [Save]     │
└───────────────────────────────────────┘
```

- **Name**: Text input with duplicate-name validation against sibling groups.
- **Color**: Palette of the 8 existing group colors; click to select.
- **Max students**: Number input; blank = no limit (shown as `—` in the settings list). Every group defaults to no max.
- **Delete**: Destructive action at bottom-left (red text, separated by divider). Triggers existing `DeleteGroupConfirmDialog` when confirmation is enabled.
- **Save**: Commits all changes at once and closes the modal.

A modal rather than a submenu because:

- Submenus branching off a dropdown have hover-timing issues and feel fiddly.
- A modal is a clear "I'm editing this thing" context — appropriate for an infrequent action.
- The color palette needs horizontal space a narrow submenu can't provide.
- Delete gets a proper home without being crammed into a list row.

### History (clock icon)

Standalone icon button in the top bar. Toggles the session history panel. Same behavior as today, relocated from inside the gear popover.

### Canvas

Clean — groups and students only. No floating toolbar, no AddGroupCard "+". Double-click group header to rename inline (existing behavior, preserved).

## Component changes

| Component                    | Action                                                                                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FloatingToolbar.svelte`     | Delete entirely                                                                                                                                                                 |
| `SettingsPopover.svelte`     | Remove Display and History sections. Keep group management list (simplified to color dot + name + max + single edit button) and rotation settings. Add Group button stays here. |
| `AddGroupCard.svelte`        | Remove from `GroupEditingLayout` canvas rendering. "+ Add Group" lives in Settings dropdown only.                                                                               |
| `ClassViewToolbar.svelte`    | Extend right side with: History icon button, Settings gear (reusing simplified SettingsPopover), Share dropdown (new component).                                                |
| `ClassView.svelte`           | Remove FloatingToolbar usage. Wire new toolbar callbacks.                                                                                                                       |
| New: `EditGroupModal.svelte` | Modal dialog for editing a single group's name, color, max enrollment, and delete action. Opened from the edit button in Settings group list.                                   |
| New: `ShareDropdown.svelte`  | Dropdown menu with export actions (Copy, Save, Print) and output modes (Display, Publish).                                                                                      |

## Consequences

### Benefits

- Single command surface — matches Google Docs mental model teachers already know
- No "Done" button — consistent with continuous-autosave workspace paradigm (UX_STRATEGY.md Principle 4)
- Share menu ordered by actual current usage (copy to spreadsheet first)
- Gear dropdown is coherent: group structure + algorithm settings, nothing else
- Clean canvas maximizes space for the working surface (UX Principle 1: Direct Manipulation)
- Display and Publish remain accessible for future adoption without cluttering the primary workflow
- Edit Group modal gives each group attribute breathing room — color editing, max enrollment, and delete all in one place
- Group list in Settings is scannable: color, name, max at a glance

### Costs

- Add Group is no longer one-click from the canvas — acceptable since it's infrequent
- Display/Publish are two clicks deep — acceptable since they're not in active use yet
- Editing a group attribute requires: open Settings → click pencil → edit in modal → save. Three steps for an infrequent action — acceptable tradeoff for canvas cleanliness.
- New components to build: `EditGroupModal.svelte`, `ShareDropdown.svelte`
- Settings dropdown carries group management + rotation settings together; if either section grows complex, may need to split later
