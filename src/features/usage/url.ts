import {
  canonicalizeTimeseriesFilters,
  canonicalizeUsageFilters,
  isIso,
  parseId,
  quickPickRange,
  type CanonicalTimeseriesFilters,
  type CanonicalUsageFilters,
  type QuickPick,
  type TimeseriesFilters,
  type UsageFilters,
} from './filters';

// URL param names are flat and match the backend query params so a shared
// link is a valid backend-facing URL after stripping the admin host.
export const USAGE_URL_KEYS = [
  'since',
  'until',
  'model',
  'account_id',
  'api_key_id',
  'user_id',
  'interval',
] as const;

// Pulls filters out of the URL. If `since`/`until` are missing or invalid,
// falls back to the default quick pick so the page always has a valid range
// on first load. `now` is injectable for tests.
export function readUsageFiltersFromUrl(
  sp: URLSearchParams | null,
  defaults: { quickPick?: QuickPick; now?: Date } = {},
): UsageFilters {
  const fallback = quickPickRange(defaults.quickPick ?? '24h', defaults.now);
  const rawSince = sp?.get('since') ?? undefined;
  const rawUntil = sp?.get('until') ?? undefined;
  const since = rawSince && isIso(rawSince) ? rawSince : fallback.since;
  const until = rawUntil && isIso(rawUntil) ? rawUntil : fallback.until;

  const filters: UsageFilters = { since, until };
  const model = sp?.get('model')?.trim();
  if (model) filters.model = model;

  const accountId = parseId(sp?.get('account_id'));
  if (accountId !== undefined) filters.account_id = accountId;

  const apiKeyId = parseId(sp?.get('api_key_id'));
  if (apiKeyId !== undefined) filters.api_key_id = apiKeyId;

  const userId = parseId(sp?.get('user_id'));
  if (userId !== undefined) filters.user_id = userId;

  return filters;
}

export function readTimeseriesFiltersFromUrl(
  sp: URLSearchParams | null,
  defaults: { quickPick?: QuickPick; now?: Date } = {},
): TimeseriesFilters {
  const base: TimeseriesFilters = readUsageFiltersFromUrl(sp, defaults);
  const interval = sp?.get('interval');
  if (interval === 'hour' || interval === 'day') base.interval = interval;
  return base;
}

export function canonicalFromUrl(
  sp: URLSearchParams | null,
  defaults?: { quickPick?: QuickPick; now?: Date },
): CanonicalUsageFilters | null {
  return canonicalizeUsageFilters(readUsageFiltersFromUrl(sp, defaults));
}

export function canonicalTimeseriesFromUrl(
  sp: URLSearchParams | null,
  defaults?: { quickPick?: QuickPick; now?: Date },
): CanonicalTimeseriesFilters | null {
  return canonicalizeTimeseriesFilters(readTimeseriesFiltersFromUrl(sp, defaults));
}
