/**
 * Packages that are expected to expose an accessibility service on a normal
 * device. Without this, every screen reader user would look like an attacker.
 *
 * Only services that additionally declare `canPerformGestures` are ever
 * flagged, so the list only needs to cover accessibility tools that can
 * dispatch gestures. Extend it for corporate MDM agents or EUC tooling that
 * ships its own accessibility service.
 */
export const DEFAULT_ALLOWLIST: string[] = [
  // TalkBack
  'com.google.android.marvin.talkback',
  // Switch Access
  'com.google.android.accessibility.switchaccess',
  'com.android.switchaccess',
  // Voice Access (dispatches gestures, so it would otherwise be flagged)
  'com.google.android.apps.accessibility.voiceaccess',
  // Samsung accessibility suite
  'com.samsung.accessibility',
];
