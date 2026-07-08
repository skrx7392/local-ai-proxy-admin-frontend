import { signOut } from 'next-auth/react';

import { sessionExpiredLoginUrl } from '@/lib/auth/sessionExpiry';

import { ApiError } from './errors';

export type ApiFetchOptions = {
  method?: string;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
  // Treat these HTTP statuses as success and return the parsed body instead
  // of throwing ApiError. Used by `/admin/health`, which returns 503 with a
  // valid `degraded` body — degraded is a first-class UI state, not an error.
  allowedStatuses?: readonly number[];
  // Milliseconds before the request is aborted and an
  // ApiError(408, 'request_timeout') is thrown. GETs default to
  // DEFAULT_GET_TIMEOUT_MS so a stalled backend/BFF surfaces as a visible
  // error instead of an infinite skeleton (P0 2026-07-08). Mutations have
  // no default — a slow node probe must not be cut off mid-write; pass an
  // explicit value to cap one. Pass 0 to disable entirely.
  timeoutMs?: number;
};

// A hung /config request used to leave the page in skeleton state forever.
// 10s is generous for an admin API round-trip while still short enough that
// an operator sees a real error (with Retry) instead of assuming the app
// is broken.
export const DEFAULT_GET_TIMEOUT_MS = 10_000;

// Guarded so a burst of concurrent 401s doesn't trigger N parallel signOut
// round-trips — only the first observer kicks off the logout.
let sessionExpiredInFlight = false;

function handleSessionExpired(): void {
  if (typeof window === 'undefined' || sessionExpiredInFlight) return;
  sessionExpiredInFlight = true;
  // `expired=1` tells the login page to explain WHY the user landed there
  // ("Your session has expired") instead of looking like a random logout.
  const callbackUrl = sessionExpiredLoginUrl(
    window.location.pathname + window.location.search,
  );
  // Fire-and-forget; signOut triggers events.signOut (best-effort backend
  // logout) then navigates the browser to /login.
  void signOut({ callbackUrl, redirect: true });
}

type ErrorEnvelope = {
  code: string;
  message: string | undefined;
  requestId: string | undefined;
};

// Detects an error envelope that arrived with a SUCCESS HTTP status.
// Observed live (2026-07-08): GET /api/admin/config?envelope=1 answered
// HTTP 200 with body {"code":"csrf_check_failed"}. If that body is returned
// as data, downstream zod parses fail and the page wedges — so error-shaped
// bodies must throw regardless of status.
//
// Two shapes are recognized:
//   1. Backend (internal/apierror/apierror.go):
//      { "error": { "code", "message", "type" }, "request_id" }
//   2. BFF short-circuits (src/app/api/admin/[...path]/route.ts):
//      { "code": "csrf_check_failed" } — shallow, at most code/message/
//      request_id.
// Shape 2 additionally requires that NO other keys are present, so a real
// payload that happens to carry a `code` field is never misclassified.
function detectErrorEnvelope(body: unknown): ErrorEnvelope | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return null;
  }
  const rec = body as Record<string, unknown>;
  const requestId =
    typeof rec['request_id'] === 'string' ? rec['request_id'] : undefined;

  const nested = rec['error'];
  if (typeof nested === 'object' && nested !== null && !Array.isArray(nested)) {
    const e = nested as Record<string, unknown>;
    const code = typeof e['code'] === 'string' ? e['code'] : undefined;
    const message = typeof e['message'] === 'string' ? e['message'] : undefined;
    if (code !== undefined || message !== undefined) {
      return { code: code ?? 'unknown_error', message, requestId };
    }
  }

  const SHALLOW_KEYS = new Set(['code', 'message', 'request_id']);
  if (
    typeof rec['code'] === 'string' &&
    Object.keys(rec).every((k) => SHALLOW_KEYS.has(k))
  ) {
    return {
      code: rec['code'],
      message: typeof rec['message'] === 'string' ? rec['message'] : undefined,
      requestId,
    };
  }

  return null;
}

// PR B shipped a thin client so login error paths and future hooks have a
// shared entry point; the 401 → signOut branch keeps a revoked/expired
// backend session from leaving a stale encrypted JWT cookie in place.
export async function apiFetch<T>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
  const url = new URL(`/api/admin${path}`, window.location.origin);
  if (opts.params) {
    for (const [k, v] of Object.entries(opts.params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  // FE PR D: opt every GET into the envelope shape. List endpoints gate the
  // `{ data, pagination }` wrapper behind `envelope=1` until BE PR 7 flips
  // the default; the param is a harmless no-op on other endpoints.
  const method = opts.method ?? 'GET';
  if (method === 'GET' && !url.searchParams.has('envelope')) {
    url.searchParams.set('envelope', '1');
  }

  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
  };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  // Abort plumbing: one controller drives the actual fetch; it aborts when
  // either the caller's signal fires or the timeout elapses. The timeout is
  // ALSO raced as a promise so a fetch implementation that ignores signals
  // (test stubs) still settles.
  const controller = new AbortController();
  const callerSignal = opts.signal;
  if (callerSignal) {
    if (callerSignal.aborted) {
      controller.abort(callerSignal.reason as Error | undefined);
    } else {
      callerSignal.addEventListener(
        'abort',
        () => controller.abort(callerSignal.reason as Error | undefined),
        { once: true },
      );
    }
  }

  const timeoutMs =
    opts.timeoutMs ?? (method === 'GET' ? DEFAULT_GET_TIMEOUT_MS : 0);

  const init: RequestInit = {
    method,
    headers,
    credentials: 'same-origin',
    signal: controller.signal,
  };
  if (opts.body !== undefined) init.body = JSON.stringify(opts.body);

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // The race covers header receipt AND body read — a response that stalls
    // mid-stream is just as much a hang as one that never connects.
    const run = async (): Promise<T> => {
      const response = await fetch(url.toString(), init);

      if (!response.ok && !opts.allowedStatuses?.includes(response.status)) {
        // Backend error shape (internal/apierror/apierror.go) is:
        //   { "error": { "message", "type", "code" }, "request_id": "..." }
        // The BFF can also emit shallow shapes like
        //   { code: "csrf_check_failed" }
        // for its own short-circuits, so we read both.
        let body: {
          code?: string;
          message?: string;
          request_id?: string;
          error?: { code?: string; message?: string; type?: string };
        } = {};
        try {
          body = await response.json();
        } catch {
          // swallow; keep generic error below
        }
        if (response.status === 401) handleSessionExpired();
        const code = body.error?.code ?? body.code ?? 'unknown_error';
        const message = body.error?.message ?? body.message ?? response.statusText;
        throw new ApiError(response.status, code, message, body.request_id);
      }

      if (response.status === 204) return undefined as T;
      const parsed: unknown = await response.json();

      // A 2xx (or allowed) status can still carry an error envelope — treat
      // it as the error it is instead of handing it to zod as "data".
      const envelope = detectErrorEnvelope(parsed);
      if (envelope) {
        throw new ApiError(
          response.status,
          envelope.code,
          envelope.message ?? envelope.code,
          envelope.requestId,
        );
      }
      return parsed as T;
    };

    if (timeoutMs <= 0) return await run();

    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(
          new ApiError(
            408,
            'request_timeout',
            `Request timed out after ${Math.round(timeoutMs / 1000)}s`,
          ),
        );
      }, timeoutMs);
    });

    const pending = run();
    // If the timeout wins the race, the aborted fetch will reject later with
    // an AbortError nobody is awaiting — swallow it so it can't surface as
    // an unhandled rejection.
    pending.catch(() => {});
    return await Promise.race([pending, timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
