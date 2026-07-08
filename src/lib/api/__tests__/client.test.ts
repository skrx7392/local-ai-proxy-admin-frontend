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
    // expired=1 tells the login page to explain the signout (UX P2).
    expect(arg.callbackUrl).toMatch(/^\/login\?expired=1&callbackUrl=/);
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

  it('throws ApiError when a 200 response carries a BFF shallow error envelope', async () => {
    // Observed live 2026-07-08: HTTP 200 with body {"code":"csrf_check_failed"}.
    // Returning that as "data" made downstream zod parses fail and left pages
    // stuck — an error envelope must throw no matter the HTTP status.
    const { apiFetch } = await freshClient();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ code: 'csrf_check_failed' }), {
        status: 200,
      }),
    );

    await expect(apiFetch('/config')).rejects.toMatchObject({
      name: 'ApiError',
      status: 200,
      code: 'csrf_check_failed',
    });
  });

  it('throws ApiError when a 200 response carries a backend error envelope', async () => {
    const { apiFetch } = await freshClient();
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: { code: 'boom', message: 'kaput', type: 'api_error' },
          request_id: 'r7',
        }),
        { status: 200 },
      ),
    );

    await expect(apiFetch('/config')).rejects.toMatchObject({
      name: 'ApiError',
      status: 200,
      code: 'boom',
      message: 'kaput',
      requestId: 'r7',
    });
  });

  it('does not misclassify success bodies that merely contain a code field', async () => {
    const { apiFetch } = await freshClient();
    // A body with `code` alongside real payload keys is data, not an error
    // envelope — only the shallow {code, message?, request_id?} shape and the
    // {error: {...}} shape are treated as errors.
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ code: 'promo-2026', data: [1, 2] }), {
        status: 200,
      }),
    );

    await expect(apiFetch('/whatever')).resolves.toEqual({
      code: 'promo-2026',
      data: [1, 2],
    });
  });

  it('does not misclassify allowed-status bodies (degraded health)', async () => {
    const { apiFetch } = await freshClient();
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ status: 'degraded', checks: {}, uptime_seconds: 1 }),
        { status: 503 },
      ),
    );

    const body = await apiFetch<{ status: string }>('/health', {
      allowedStatuses: [503],
    });
    expect(body.status).toBe('degraded');
  });

  it('times out a hung request with ApiError(request_timeout)', async () => {
    const { apiFetch } = await freshClient();
    fetchMock.mockReturnValueOnce(new Promise(() => {}));

    await expect(
      apiFetch('/config', { timeoutMs: 25 }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 408,
      code: 'request_timeout',
    });
  });

  it('applies the 10s default timeout to GET requests', async () => {
    const { apiFetch } = await freshClient();
    vi.useFakeTimers();
    try {
      fetchMock.mockReturnValueOnce(new Promise(() => {}));
      const pending = apiFetch('/config');
      const assertion = expect(pending).rejects.toMatchObject({
        code: 'request_timeout',
      });
      await vi.advanceTimersByTimeAsync(10_000);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it('honors an external abort signal without mislabelling it a timeout', async () => {
    const { apiFetch } = await freshClient();
    const controller = new AbortController();
    fetchMock.mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );

    const pending = apiFetch('/config', { signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
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
