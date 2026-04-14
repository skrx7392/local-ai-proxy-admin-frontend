import type { JWT } from 'next-auth/jwt';
import type { Session, User } from 'next-auth';

// Callbacks live in their own module so they can be unit tested without
// loading the full NextAuth runtime (which imports `next/server` and
// refuses to instantiate outside a Next request context).

export async function jwtCallback({
  token,
  user,
}: {
  token: JWT;
  user?: User;
}): Promise<JWT | null> {
  if (user) {
    if (user.id !== undefined) token.userId = user.id;
    if (user.email) token.email = user.email;
    if (user.role !== undefined) token.role = user.role;
    if (user.backendToken !== undefined) token.backendToken = user.backendToken;
    if (user.backendExpiresAt !== undefined)
      token.backendExpiresAt = user.backendExpiresAt;
    return token;
  }

  // Refuse to extend a session past the backend token's own lifetime.
  // Without this, the encrypted JWT cookie can outlive the backend token
  // for up to session.maxAge, letting a revoked/demoted account keep an
  // authenticated UI until the next 401 round-trip. Returning null
  // invalidates the session so middleware redirects immediately.
  if (
    typeof token.backendExpiresAt === 'number' &&
    Math.floor(Date.now() / 1000) >= token.backendExpiresAt
  ) {
    return null;
  }

  return token;
}

// Explicit projection — anything not copied here never reaches the client.
// backendToken stays server-side in the encrypted JWT cookie.
export async function sessionCallback({
  session,
  token,
}: {
  session: Session;
  token: JWT;
}): Promise<Session> {
  session.user = {
    ...session.user,
    id: token.userId ?? '',
    email: token.email ?? '',
    role: token.role ?? '',
  };
  if (typeof token.backendExpiresAt === 'number') {
    session.expires = new Date(
      token.backendExpiresAt * 1000,
    ).toISOString() as typeof session.expires;
  }
  return session;
}
