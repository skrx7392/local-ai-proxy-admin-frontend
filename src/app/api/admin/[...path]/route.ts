import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const BACKEND_URL = process.env.BACKEND_URL;
const AUTH_SECRET = process.env.AUTH_SECRET;
const IS_PROD = process.env.NODE_ENV === 'production';
// Must mirror cookies.sessionToken in src/lib/auth/options.ts. getToken
// would otherwise auto-detect `secureCookie` from req.url, which is HTTP
// when Next runs behind a TLS-terminating ingress — causing it to look
// for the wrong cookie name and return null for a valid session.
const SESSION_COOKIE_NAME = IS_PROD
  ? '__Secure-authjs.session-token'
  : 'authjs.session-token';

// Strict allow-list for headers forwarded to the backend. Anything not on
// this list is dropped — this closes the door on client-injected identity
// / trust headers (x-forwarded-*, x-real-ip, forwarded, x-user-*,
// x-admin-*, x-internal-*) that the backend might otherwise honor.
// Authorization is re-set from the server-side JWT below.
const FORWARD_ALLOWLIST = new Set([
  'accept',
  'accept-encoding',
  'accept-language',
  'content-type',
  'user-agent',
  'x-request-id',
  'x-requested-with',
]);

// Hop-by-hop headers stripped on the response path (RFC 7230 §6.1).
const HOP_BY_HOP_RESPONSE = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
]);

// Cap on request body bytes proxied upstream. Admin payloads are tiny
// (JSON configs, pool updates); anything larger is either abuse or a bug.
const MAX_BODY_BYTES = 1 * 1024 * 1024;

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
  const token = await getToken({
    req,
    secret: AUTH_SECRET,
    cookieName: SESSION_COOKIE_NAME,
    secureCookie: IS_PROD,
  });
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
    if (FORWARD_ALLOWLIST.has(key.toLowerCase())) headers.set(key, value);
  });
  headers.set('Authorization', `Bearer ${token.backendToken}`);

  const method = req.method.toUpperCase();
  const init: RequestInit = { method, headers, redirect: 'error' };
  if (method !== 'GET' && method !== 'HEAD') {
    const declared = Number(req.headers.get('content-length') ?? '');
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
      return NextResponse.json({ code: 'payload_too_large' }, { status: 413 });
    }
    const body = await req.arrayBuffer();
    if (body.byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ code: 'payload_too_large' }, { status: 413 });
    }
    init.body = body;
  }

  const upstreamResponse = await fetch(upstreamUrl, init);

  const responseHeaders = new Headers();
  upstreamResponse.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_RESPONSE.has(key.toLowerCase())) responseHeaders.set(key, value);
  });
  responseHeaders.delete('set-cookie');
  responseHeaders.delete('www-authenticate');
  responseHeaders.delete('server');

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
