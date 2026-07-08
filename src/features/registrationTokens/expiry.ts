// Expiry model for the create-registration-token form.
//
// The dialog offers duration presets (24h / 7d / 30d), "never", and a
// custom local datetime. The form stores the *choice* (preset + optional
// custom value) and resolves it to an ISO 8601 UTC string at submit time,
// so "24h" always means 24 hours from creation — not from when the chip
// was clicked. The backend models "no expiry" as `expires_at: null`
// (hooks.ts normalizes `undefined` → `null`).

export const EXPIRY_PRESET_DURATIONS_MS = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
} as const;

export const EXPIRY_PRESETS = ['24h', '7d', '30d', 'never', 'custom'] as const;

export type ExpiryPreset = (typeof EXPIRY_PRESETS)[number];

export const EXPIRY_PRESET_LABELS: Record<ExpiryPreset, string> = {
  '24h': '24h',
  '7d': '7d',
  '30d': '30d',
  never: 'Never',
  custom: 'Custom',
};

/**
 * Converts a `<input type="datetime-local">` value (local time, no zone)
 * to a full ISO 8601 UTC string. Returns null for blank/malformed input.
 */
export function localInputToIso(value: string): string | null {
  if (value.trim() === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * Formats a Date as the `YYYY-MM-DDTHH:MM` local-time shape that
 * `<input type="datetime-local">` expects (used for the `min` bound).
 */
export function dateToLocalInput(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/**
 * Resolves the user's expiry choice to an ISO 8601 UTC string.
 *
 * - duration presets → `now + duration`
 * - `never` → undefined (no expiry; serialized as null by the mutation)
 * - `custom` → the local datetime converted to UTC, or undefined when the
 *   input is unparseable (the form schema rejects that case before submit)
 */
export function resolveExpiryIso(
  preset: ExpiryPreset,
  customLocal: string,
  now: Date = new Date(),
): string | undefined {
  if (preset === 'never') return undefined;
  if (preset === 'custom') return localInputToIso(customLocal) ?? undefined;
  return new Date(now.getTime() + EXPIRY_PRESET_DURATIONS_MS[preset]).toISOString();
}
