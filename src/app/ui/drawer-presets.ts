import { MenuMode } from '@app/engine/core/interfaces';

/**
 * Role presets for the plugin drawer (#124). A preset only chooses which groups START open for a
 * user who has not toggled them; it never hides a menu. The user's own toggles live in
 * StorageKey.DRAWER_GROUP_STATES and always win, so the preset is derived from the chosen role at
 * runtime rather than written over those overrides. Bump DRAWER_PRESET_VERSION when a table changes
 * meaning; because the table is code, existing users pick up the new version automatically.
 */
export const DRAWER_PRESET_VERSION = 1;

export type DrawerPresetRole = 'explorer' | 'student' | 'operator' | 'developer';

const modeKey_ = (mode: MenuMode): string => `mode-${mode}`;

const PRESETS_: Record<DrawerPresetRole, readonly string[]> = {
  // Empty means "use the app default" (Recent plus the first group).
  explorer: [],
  student: [modeKey_(MenuMode.CATALOG), modeKey_(MenuMode.EVENTS), modeKey_(MenuMode.DISPLAY)],
  operator: [modeKey_(MenuMode.CATALOG), modeKey_(MenuMode.SENSORS), modeKey_(MenuMode.ANALYSIS), modeKey_(MenuMode.CONJUNCTIONS)],
  developer: [modeKey_(MenuMode.CATALOG), modeKey_(MenuMode.TOOLS), modeKey_(MenuMode.SETTINGS), 'dev-tools'],
};

/** Group keys that start open for a role; an unknown or missing role gives the app default (empty list). */
export function getPresetOpenGroups(role: string | null | undefined): string[] {
  if (!role || !Object.hasOwn(PRESETS_, role)) {
    return [];
  }

  return [...PRESETS_[role as DrawerPresetRole]];
}
