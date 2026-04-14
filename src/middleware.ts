import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth/options';

const PUBLIC_PATHS = new Set<string>(['/login', '/api/health']);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith('/api/auth/')) return true;
  return false;
}

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const response = NextResponse.next();

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
    return NextResponse.redirect(loginUrl);
  }

  return response;
});

export const config = {
  // Match application routes; skip Next internals + static asset paths.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
