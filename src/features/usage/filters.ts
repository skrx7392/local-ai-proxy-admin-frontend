import type { TimeseriesInterval } from './schemas';

// ---- Types ------------------------------------------------------------

export type UsageFilters = {
  // Required wire params. ISO-8601 strings (RFC3339-compatible) so query keys
  // and URL state stay comparable by value — never use Date instances in keys.
  since: string;
  until: string;
  model?: string;
  account_id?: number;
  api_key_id?: number;
  user_id?: number;
};

export type TimeseriesFilters = UsageFilters & {
  // Only meaningful for the timeseries endpoint; kept off the other query keys.
  interval?: TimeseriesInterval;
};

// A CanonicalUsageFilters value is the exact shape we put in react-query
// keys and pass to apiFetch. Keys iterate in a deterministic order so two
// filter objects with the same data always serialize to the same key.
export type CanonicalUsageFilters = {
  since: string;
  until: string;
  model?: string;
  account_id?: number;
  api_key_id?: number;
  user_id?: number;
};

export type CanonicalTimeseriesFilters = CanonicalUsageFilters & {
  interval?: TimeseriesInterval;
};

// ---- Quick-pick helpers ----------------------------------------------

export type QuickPick = '1h' | '24h' | '7d' | '30d';

// Range lengths in milliseconds. Exported so tests can assert exact values
// without duplicating the constants.
export const QUICK_PICK_MS: Record<QuickPick, number> = {
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

// Returns absolute ISO strings so the URL is stable across reloads and can be
// shared. `now` is injectable so tests don't need to mock Date.
export function quickPickRange(
  pick: QuickPick,
  now: Date = new Date(),
): { since: string; until: string } {
  const untilMs = now.getTime();
  const sinceMs = untilMs - QUICK_PICK_MS[pick];
  return {
    since: new Date(sinceMs).toISOString(),
    until: new Date(untilMs).toISOString(),
  };
}

// ---- Validation + normalization --------------------------------------

// Matches YYYY-MM-DDTHH:MM[:SS][.fff]Z|±HH:MM form — Date.parse accepts plenty
// of shapes we don't want on the wire, so we pre-filter.
const ISO_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/;

export function isIso(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_RE.test(value)) return false;
  return !Number.isNaN(Date.parse(value));
}

// Accept positive integer IDs only. Returns undefined for empties, strings
// that don't parse, zero, or negatives — callers treat undefined as "omit".
export function parseId(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return undefined;
  return n;
}

export function isRangeValid(since: string, until: string): boolean {
  if (!isIso(since) || !isIso(until)) return false;
  return Date.parse(since) < Date.parse(until);
}

// Canonicalize: drop empties, reject invalid IDs, enforce key order (since,
// until, model, account_id, api_key_id, user_id). Invalid since/until return
// null — caller should treat that as "don't fetch".
export function canonicalizeUsageFilters(
  raw: Partial<UsageFilters>,
): CanonicalUsageFilters | null {
  const { since, until } = raw;
  if (!isIso(since) || !isIso(until) || !isRangeValid(since, until)) return null;

  const out: CanonicalUsageFilters = { since, until };
  const model = typeof raw.model === 'string' ? raw.model.trim() : '';
  if (model) out.model = model;

  const accountId = parseId(raw.account_id);
  if (accountId !== undefined) out.account_id = accountId;

  const apiKeyId = parseId(raw.api_key_id);
  if (apiKeyId !== undefined) out.api_key_id = apiKeyId;

  const userId = parseId(raw.user_id);
  if (userId !== undefined) out.user_id = userId;

  return out;
}

export function canonicalizeTimeseriesFilters(
  raw: Partial<TimeseriesFilters>,
): CanonicalTimeseriesFilters | null {
  const base = canonicalizeUsageFilters(raw);
  if (!base) return null;
  const out: CanonicalTimeseriesFilters = { ...base };
  if (raw.interval === 'hour' || raw.interval === 'day') {
    out.interval = raw.interval;
  }
  return out;
}
