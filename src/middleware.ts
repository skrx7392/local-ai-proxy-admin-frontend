import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Global edge middleware.
 *
 * A3 scope: attach `X-Robots-Tag: noindex, nofollow` to the `/styleguide`
 * response so crawlers that reach the public deployment never index it.
 * The page itself also emits `<meta name="robots" content="noindex,nofollow">`
 * via Next metadata — belt and braces.
 *
 * PR B repurposes this file to run `auth()` on admin routes and redirect
 * unauthenticated users to `/login`. Until then, this middleware is strictly
 * additive (headers only) and never rewrites or redirects.
 */
export function middleware(_request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export const config = {
  // Only run on the styleguide subtree for now. Extending this matcher for
  // auth is PR B's concern.
  matcher: ['/styleguide/:path*', '/styleguide'],
};
