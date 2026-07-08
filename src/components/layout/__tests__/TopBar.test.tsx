import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { system } from '@/theme';

const signOutMock = vi.fn();
// The expiry verification probes /api/auth/session with a raw fetch (NOT
// next-auth's getSession, which swallows errors and broadcasts).
const fetchMock = vi.fn();

type MockSession = {
  data: {
    user: { id: string; email: string; role: string };
    expires: string;
  } | null;
  status: 'authenticated' | 'unauthenticated' | 'loading';
};

let mockSession: MockSession;

vi.mock('next-auth/react', () => ({
  useSession: () => mockSession,
  signOut: (...args: unknown[]) => signOutMock(...args),
}));

// Children with their own data/router dependencies are out of scope here —
// HealthIndicator has dedicated tests; NavSearch/MobileNavDrawer need the
// app router.
vi.mock('../HealthIndicator', () => ({ HealthIndicator: () => null }));
vi.mock('../NavSearch', () => ({ NavSearch: () => null }));
vi.mock('../MobileNavDrawer', () => ({ MobileNavDrawer: () => null }));

import { TopBar } from '../TopBar';

function authenticatedIn(seconds: number): MockSession {
  return {
    data: {
      user: { id: '1', email: 'admin@kinvee.in', role: 'admin' },
      expires: new Date(Date.now() + seconds * 1000).toISOString(),
    },
    status: 'authenticated',
  };
}

function wrap(ui: ReactNode) {
  return render(<ChakraProvider value={system}>{ui}</ChakraProvider>);
}

function sessionProbeResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('<TopBar /> session timer', () => {
  beforeEach(() => {
    signOutMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    // Default: the server agrees the session is gone (v5 answers `null`).
    fetchMock.mockImplementation(async () => sessionProbeResponse(null));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('labels the countdown so it reads as a session timer, with no warning far from expiry', () => {
    mockSession = authenticatedIn(2 * 3600);
    const { getByTestId, queryByTestId } = wrap(<TopBar />);

    const timer = getByTestId('topbar-expires');
    expect(timer.getAttribute('title')).toMatch(/^Session expires in \d/);
    expect(timer.getAttribute('aria-label')).toMatch(/^Session expires in \d/);
    // Visible label (shown at md+; display-only hidden below).
    expect(timer.textContent).toContain('Session');

    expect(queryByTestId('session-expiry-banner')).toBeNull();
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it('shows the expiry warning banner with a re-login prompt under 5 minutes', () => {
    mockSession = authenticatedIn(4 * 60);
    const { getByTestId } = wrap(<TopBar />);

    const banner = getByTestId('session-expiry-banner');
    expect(banner.textContent).toContain('Session expiring soon');
    expect(banner.textContent).toMatch(/signed out in \d+m \d+s/);

    fireEvent.click(getByTestId('session-expiry-relogin'));
    expect(signOutMock).toHaveBeenCalledTimes(1);
    const arg = signOutMock.mock.calls[0]![0] as { callbackUrl: string };
    // Proactive re-login: come back to the current page, no "expired" flag.
    expect(arg.callbackUrl).toMatch(/^\/login\?callbackUrl=/);
    expect(arg.callbackUrl).not.toContain('expired=1');
  });

  it('does not warn above the 5-minute threshold', () => {
    mockSession = authenticatedIn(10 * 60);
    const { queryByTestId } = wrap(<TopBar />);
    expect(queryByTestId('session-expiry-banner')).toBeNull();
  });

  it('signs out to /login with a session-expired flag once the session expires', async () => {
    mockSession = authenticatedIn(-5);
    const { getByTestId, queryByTestId } = wrap(<TopBar />);

    await waitFor(() => expect(signOutMock).toHaveBeenCalledTimes(1));
    // The server was consulted first — expiry is never decided by the
    // client clock alone.
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/session', expect.anything());
    const arg = signOutMock.mock.calls[0]![0] as {
      callbackUrl: string;
      redirect: boolean;
    };
    expect(arg.callbackUrl).toMatch(/^\/login\?expired=1/);
    expect(arg.redirect).toBe(true);

    // Timer reads "expired"; the pre-expiry warning banner is gone.
    expect(getByTestId('topbar-expires').textContent).toContain('expired');
    expect(queryByTestId('session-expiry-banner')).toBeNull();
  });

  it('does not sign out on a skewed client clock while the server still honors the session', async () => {
    // Client clock says expired, but the server (authority) still returns a
    // session — e.g. the workstation clock runs a minute ahead.
    fetchMock.mockImplementation(async () =>
      sessionProbeResponse({
        user: { id: '1', email: 'admin@kinvee.in', role: 'admin' },
        expires: new Date(Date.now() + 60 * 1000).toISOString(),
      }),
    );
    mockSession = authenticatedIn(-5);
    wrap(<TopBar />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it('does not treat a failed session probe as expiry', async () => {
    // A glitch on /api/auth/session must NOT log the user out — only an
    // explicit "no session" answer may. (next-auth's getSession() would
    // have collapsed this into null.)
    fetchMock.mockImplementation(async () => new Response('oops', { status: 500 }));
    mockSession = authenticatedIn(-5);
    wrap(<TopBar />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it('does not treat a malformed 200 probe body as expiry', async () => {
    // HTTP 200 with `{}` / `[]` / a primitive is malformed, not an
    // authoritative no-session — it must route through the retry backoff,
    // never sign the user out.
    for (const malformed of [{}, [], 'nope', 0] as const) {
      signOutMock.mockReset();
      fetchMock.mockReset();
      fetchMock.mockImplementation(async () => sessionProbeResponse(malformed));
      mockSession = authenticatedIn(-5);
      const { unmount } = wrap(<TopBar />);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      expect(signOutMock).not.toHaveBeenCalled();
      unmount();
    }
  });

  it('retries the expiry redirect after a transient signOut failure', async () => {
    vi.useFakeTimers();
    try {
      signOutMock.mockRejectedValueOnce(new Error('network blip'));
      signOutMock.mockResolvedValue(undefined);
      mockSession = authenticatedIn(-5);
      wrap(<TopBar />);

      // First attempt fires on mount and fails.
      await vi.waitFor(() => expect(signOutMock).toHaveBeenCalledTimes(1));
      // The guard must not latch: after the 5s backoff a later tick retries,
      // and the successful retry latches (navigation imminent) — exactly one
      // more call, no per-tick spam.
      await vi.advanceTimersByTimeAsync(10_000);
      await vi.waitFor(() => expect(signOutMock).toHaveBeenCalledTimes(2));
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders nothing when unauthenticated', () => {
    mockSession = { data: null, status: 'unauthenticated' };
    const { queryByTestId } = wrap(<TopBar />);
    expect(queryByTestId('topbar')).toBeNull();
    expect(signOutMock).not.toHaveBeenCalled();
  });
});
