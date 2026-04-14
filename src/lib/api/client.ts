import { signOut } from 'next-auth/react';

import { ApiError } from './errors';

export type ApiFetchOptions = {
  method?: string;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
};

// Guarded so a burst of concurrent 401s doesn't trigger N parallel signOut
// round-trips — only the first observer kicks off the logout.
let sessionExpiredInFlight = false;

function handleSessionExpired(): void {
  if (typeof window === 'undefined' || sessionExpiredInFlight) return;
  sessionExpiredInFlight = true;
  const callbackUrl = `/login?callbackUrl=${encodeURIComponent(
    window.location.pathname + window.location.search,
  )}`;
  // Fire-and-forget; signOut triggers events.signOut (best-effort backend
  // logout) then navigates the browser to /login.
  void signOut({ callbackUrl, redirect: true });
}

// PR B ships a thin client so login error paths and future hooks have a
// shared entry point. Full envelope + toast polish lands in PR C, but the
// 401 → signOut branch is wired up now so a revoked/expired backend
// session can't leave a stale encrypted JWT cookie in place.
export async function apiFetch<T>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
  const url = new URL(`/api/admin${path}`, window.location.origin);
  if (opts.params) {
    for (const [k, v] of Object.entries(opts.params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
  };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  const init: RequestInit = {
    method: opts.method ?? 'GET',
    headers,
    credentials: 'same-origin',
  };
  if (opts.body !== undefined) init.body = JSON.stringify(opts.body);
  if (opts.signal) init.signal = opts.signal;

  const response = await fetch(url.toString(), init);

  if (!response.ok) {
    let body: { code?: string; message?: string; request_id?: string } = {};
    try {
      body = await response.json();
    } catch {
      // swallow; keep generic error below
    }
    if (response.status === 401) handleSessionExpired();
    throw new ApiError(
      response.status,
      body.code ?? 'unknown_error',
      body.message ?? response.statusText,
      body.request_id,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
