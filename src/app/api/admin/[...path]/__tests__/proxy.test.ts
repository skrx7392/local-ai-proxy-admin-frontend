import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/jwt', () => ({
  getToken: vi.fn(),
}));

import { getToken } from 'next-auth/jwt';
import { GET } from '../route';

type MockRequest = {
  url: string;
  method: string;
  headers: Headers;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

function buildRequest(init: {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
}): MockRequest {
  return {
    url: init.url ?? 'http://admin.local/api/admin/users?page=1',
    method: init.method ?? 'GET',
    headers: new Headers(init.headers ?? {}),
    arrayBuffer: async () => new ArrayBuffer(0),
  };
}

describe('BFF proxy at /api/admin/[...path]', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(getToken).mockReset();
  });

  it('returns 403 when X-Requested-With header is missing (CSRF guard)', async () => {
    const req = buildRequest({}); // no X-Requested-With
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await GET(req as any, {
      params: Promise.resolve({ path: ['users'] }),
    });

    expect(response.status).toBe(403);
    // CSRF check runs before getToken() so we never even read the cookie.
    expect(vi.mocked(getToken)).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 401 when no backendToken is present in the JWT', async () => {
    vi.mocked(getToken).mockResolvedValueOnce(null);
    const req = buildRequest({
      headers: { 'x-requested-with': 'XMLHttpRequest' },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await GET(req as any, {
      params: Promise.resolve({ path: ['users'] }),
    });

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('injects Bearer from JWT and strips client-provided auth headers', async () => {
    vi.mocked(getToken).mockResolvedValueOnce({
      backendToken: 'b'.repeat(64),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    fetchMock.mockResolvedValueOnce(
      new Response('{"ok":true}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const req = buildRequest({
      url: 'http://admin.local/api/admin/users?page=2',
      headers: {
        'x-requested-with': 'XMLHttpRequest',
        authorization: 'Bearer attacker-supplied',
        cookie: 'authjs.session-token=abc',
        'x-admin-key': 'attacker-key',
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await GET(req as any, {
      params: Promise.resolve({ path: ['users'] }),
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0]!;
    const [upstreamUrl, init] = call;
    // URL normalizes default :80 away in http:// schemes.
    expect(upstreamUrl.toString()).toBe(
      'http://test-placeholder/api/admin/users?page=2',
    );
    const headers = init.headers as Headers;
    expect(headers.get('authorization')).toBe('Bearer ' + 'b'.repeat(64));
    expect(headers.get('x-admin-key')).toBeNull();
    expect(headers.get('cookie')).toBeNull();
  });
});
