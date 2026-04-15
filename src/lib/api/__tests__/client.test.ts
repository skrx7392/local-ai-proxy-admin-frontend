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

  it('auto-injects envelope=1 on GET requests', async () => {
    const { apiFetch } = await freshClient();
    fetchMock.mockResolvedValueOnce(
      new Response('{"data":[],"pagination":{"limit":25,"offset":0,"total":0}}', {
        status: 200,
      }),
    );

    await apiFetch('/users', { params: { limit: 25 } });

    const [urlArg] = fetchMock.mock.calls[0]!;
    const url = new URL(urlArg as string);
    expect(url.searchParams.get('envelope')).toBe('1');
    expect(url.searchParams.get('limit')).toBe('25');
  });

  it('does not override a caller-specified envelope value', async () => {
    const { apiFetch } = await freshClient();
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 200 }));

    await apiFetch('/users', { params: { envelope: 0 } });

    const [urlArg] = fetchMock.mock.calls[0]!;
    const url = new URL(urlArg as string);
    expect(url.searchParams.get('envelope')).toBe('0');
  });

  it('does not add envelope=1 to mutating methods', async () => {
    const { apiFetch } = await freshClient();
    fetchMock.mockResolvedValueOnce(
      new Response('{"status":"ok"}', { status: 200 }),
    );

    await apiFetch('/keys/42', { method: 'DELETE' });

    const [urlArg] = fetchMock.mock.calls[0]!;
    const url = new URL(urlArg as string);
    expect(url.searchParams.has('envelope')).toBe(false);
  });

  it('throws ApiError parsed from the real backend error envelope', async () => {
    const { apiFetch } = await freshClient();
    // Matches internal/apierror/apierror.go — message/type/code live under
    // `error`, request_id is at the top level.
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: {
            code: 'not_found',
            message: 'nope',
            type: 'invalid_request_error',
          },
          request_id: 'r1',
        }),
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

  it('also parses the BFF shallow-shape errors (e.g. csrf_check_failed)', async () => {
    const { apiFetch } = await freshClient();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ code: 'csrf_check_failed' }), { status: 403 }),
    );

    await expect(apiFetch('/users')).rejects.toMatchObject({
      status: 403,
      code: 'csrf_check_failed',
    });
  });

  it('calls signOut and redirects to /login on 401', async () => {
    const { apiFetch } = await freshClient();
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: { code: 'unauthorized' } }),
        { status: 401 },
      ),
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

  it('returns the parsed body when the status is in allowedStatuses', async () => {
    const { apiFetch } = await freshClient();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'degraded', checks: {} }), {
        status: 503,
      }),
    );

    const body = await apiFetch<{ status: string }>('/health', {
      allowedStatuses: [503],
    });

    expect(body.status).toBe('degraded');
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it('still throws for statuses outside allowedStatuses', async () => {
    const { apiFetch } = await freshClient();
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: { code: 'boom', message: 'nope' } }),
        { status: 500 },
      ),
    );

    await expect(
      apiFetch('/health', { allowedStatuses: [503] }),
    ).rejects.toMatchObject({ status: 500, code: 'boom' });
  });

  it('only triggers a single signOut for a burst of concurrent 401s', async () => {
    const { apiFetch } = await freshClient();
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: 'unauthorized' } }),
        { status: 401 },
      ),
    );

    await Promise.allSettled([
      apiFetch('/users'),
      apiFetch('/keys'),
      apiFetch('/accounts'),
    ]);

    expect(signOutMock).toHaveBeenCalledTimes(1);
  });
});
