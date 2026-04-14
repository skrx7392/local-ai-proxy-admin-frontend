import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const signOutMock = vi.fn();
vi.mock('next-auth/react', () => ({
  signOut: (...args: unknown[]) => signOutMock(...args),
}));

describe('apiFetch', () => {
  const fetchMock = vi.fn();

  // Each test dynamically imports the module so the internal
  // `sessionExpiredInFlight` guard resets cleanly between cases.
  async function freshClient() {
    vi.resetModules();
    return import('../client');
  }

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    signOutMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends X-Requested-With on every request', async () => {
    const { apiFetch } = await freshClient();
    fetchMock.mockResolvedValueOnce(
      new Response('{"ok":true}', { status: 200 }),
    );

    await apiFetch('/users');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0]!;
    expect((init.headers as Record<string, string>)['X-Requested-With']).toBe(
      'XMLHttpRequest',
    );
  });

  it('throws ApiError with parsed body on non-2xx', async () => {
    const { apiFetch } = await freshClient();
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ code: 'not_found', message: 'nope', request_id: 'r1' }),
        { status: 404 },
      ),
    );

    await expect(apiFetch('/users/99')).rejects.toMatchObject({
      status: 404,
      code: 'not_found',
      message: 'nope',
      requestId: 'r1',
    });
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it('calls signOut and redirects to /login on 401', async () => {
    const { apiFetch } = await freshClient();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ code: 'unauthorized' }), { status: 401 }),
    );

    await expect(apiFetch('/users')).rejects.toMatchObject({
      status: 401,
      code: 'unauthorized',
    });
    expect(signOutMock).toHaveBeenCalledTimes(1);
    const arg = signOutMock.mock.calls[0]![0];
    expect(arg).toMatchObject({ redirect: true });
    expect(arg.callbackUrl).toMatch(/^\/login\?callbackUrl=/);
  });

  it('only triggers a single signOut for a burst of concurrent 401s', async () => {
    const { apiFetch } = await freshClient();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ code: 'unauthorized' }), { status: 401 }),
    );

    await Promise.allSettled([
      apiFetch('/users'),
      apiFetch('/keys'),
      apiFetch('/accounts'),
    ]);

    expect(signOutMock).toHaveBeenCalledTimes(1);
  });
});
