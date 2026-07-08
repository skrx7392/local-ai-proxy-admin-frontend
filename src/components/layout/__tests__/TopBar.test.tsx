import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { system } from '@/theme';

const signOutMock = vi.fn();
const getSessionMock = vi.fn();

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
  getSession: (...args: unknown[]) => getSessionMock(...args),
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

describe('<TopBar /> session timer', () => {
  beforeEach(() => {
    signOutMock.mockReset();
    getSessionMock.mockReset();
    // Default: the server agrees the session is gone.
    getSessionMock.mockResolvedValue(null);
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
    expect(getSessionMock).toHaveBeenCalled();
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
    // Client clock says expired, but getSession() (server authority) still
    // returns a session — e.g. the workstation clock runs a minute ahead.
    getSessionMock.mockResolvedValue({
      user: { id: '1', email: 'admin@kinvee.in', role: 'admin' },
      expires: new Date(Date.now() + 60 * 1000).toISOString(),
    });
    mockSession = authenticatedIn(-5);
    wrap(<TopBar />);

    await waitFor(() => expect(getSessionMock).toHaveBeenCalledTimes(1));
    expect(signOutMock).not.toHaveBeenCalled();
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
