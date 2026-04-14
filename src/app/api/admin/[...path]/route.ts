import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const BACKEND_URL = process.env.BACKEND_URL;
const AUTH_SECRET = process.env.AUTH_SECRET;

// Forwarded hop-by-hop headers must be stripped per RFC 7230 §6.1.
// `host` and `content-length` are recomputed by the runtime; forwarding
// them from the incoming request corrupts the upstream call.
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
]);

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  if (!BACKEND_URL || !AUTH_SECRET) {
    return NextResponse.json({ code: 'server_misconfigured' }, { status: 500 });
  }

  // CSRF guard: admin requests must come from our own client, which sets
  // X-Requested-With. A cross-site form POST can't set a custom header
  // without a CORS preflight, which we never grant — so a missing/wrong
  // header means "not from our app". Applies to mutating + GET alike
  // because admin GETs return sensitive data and should not be fetch-able
  // from other origins either.
  if (req.headers.get('x-requested-with') !== 'XMLHttpRequest') {
    return NextResponse.json({ code: 'csrf_check_failed' }, { status: 403 });
  }

  // Read the full, un-stripped JWT — session callback projection would have
  // dropped backendToken.
  const token = await getToken({ req, secret: AUTH_SECRET });
  if (!token?.backendToken) {
    return NextResponse.json({ code: 'unauthorized' }, { status: 401 });
  }

  const { path } = await params;
  const requestUrl = new URL(req.url);
  const upstreamUrl = new URL(
    `${BACKEND_URL.replace(/\/$/, '')}/api/admin/${path.join('/')}${requestUrl.search}`,
  );

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value);
  });
  // Belt-and-braces: strip anything auth-adjacent a client could have set.
  headers.delete('authorization');
  headers.delete('cookie');
  headers.delete('x-admin-key');
  headers.set('Authorization', `Bearer ${token.backendToken}`);

  const method = req.method.toUpperCase();
  const init: RequestInit = { method, headers, redirect: 'manual' };
  if (method !== 'GET' && method !== 'HEAD') {
    init.body = await req.arrayBuffer();
  }

  const upstreamResponse = await fetch(upstreamUrl, init);

  const responseHeaders = new Headers();
  upstreamResponse.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) responseHeaders.set(key, value);
  });
  responseHeaders.delete('set-cookie');

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;
export const OPTIONS = proxy;
