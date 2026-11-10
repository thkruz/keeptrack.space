/**
 * Public keys that verify KeepTrack embed license keys (kid -> base64url raw 32-byte Ed25519 key).
 *
 * Ted adds the production key by running the private keygen command
 * (`npm run pro -- embed-license keygen --out <path outside the repo>`) and pasting the printed line here.
 * An empty map means every license key verifies as invalid and embeds run the open-core feature set.
 */
export const LICENSE_PUBLIC_KEYS: Record<string, string> = {
  'kt-2026-cea5fe': 'SlQGQtDSQRey3a53sGI5ByL0i_VB6xSnmzHH0C7sf8A',
};
