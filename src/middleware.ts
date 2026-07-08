import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth/options';
import { isSessionCookieName } from '@/lib/auth/sessionExpiry';
import { buildCsp, generateNonce } from '@/lib/security/csp';

const PUBLIC_PATHS = new Set<string>(['/login', '/api/health']);

const isProd = process.env.NODE_ENV === 'production';

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith('/api/auth/')) return true;
  return false;
}

export default auth((req) => {
  const { pathname, search } = req.nextUrl;

  // Nonce-based CSP: setting the header on the *request* lets Next.js pick
  // up the nonce for its own inline hydration scripts; setting it on the
  // *response* delivers the policy to the browser. The other security
  // headers are request-independent and stay in next.config.ts.
  const nonce = generateNonce();
  const csp = buildCsp(nonce, isProd);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);

  // Preserved from A3: belt-and-braces noindex on /styleguide even now that
  // the route is auth-gated, so a misconfigured crawler can't index an
  // error/redirect page.
  if (pathname.startsWith('/styleguide')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  if (isPublicPath(pathname)) return response;

  if (!req.auth) {
    const loginUrl = new URL('/login', req.nextUrl);
    loginUrl.searchParams.set('callbackUrl', pathname + search);
    // A session cookie that no longer validates (backend token expired → the
    // jwt callback returned null, or an undecryptable cookie) means the user
    // HAD a session. Flag it so the login page explains the signout instead
    // of silently presenting a bare form.
    const hadSession = req.cookies
      .getAll()
      .some((cookie) => isSessionCookieName(cookie.name));
    if (hadSession) loginUrl.searchParams.set('expired', '1');
    return NextResponse.redirect(loginUrl);
  }

  return response;
});

export const config = {
  // Match application routes; skip Next internals + static asset paths.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
