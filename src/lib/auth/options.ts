import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';

import { jwtCallback, sessionCallback } from './callbacks';

const AUTH_SECRET = process.env.AUTH_SECRET;
const BACKEND_URL = process.env.BACKEND_URL;

// Fail-fast at module load so misconfigured deploys never silently boot
// with a weak or missing secret. The build-time placeholder from the
// Dockerfile satisfies the length check without leaking into runtime.
if (!AUTH_SECRET || AUTH_SECRET.length < 32) {
  throw new Error('AUTH_SECRET must be set and at least 32 characters long');
}
if (!BACKEND_URL) {
  throw new Error('BACKEND_URL must be set');
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const loginResponseSchema = z.object({
  token: z.string().min(32),
  expires_in: z.number().int().positive(),
  user: z.object({
    id: z.number().int(),
    email: z.string().email(),
    role: z.string().min(1),
  }),
});

const isProd = process.env.NODE_ENV === 'production';

export const authConfig: NextAuthConfig = {
  secret: AUTH_SECRET,
  session: { strategy: 'jwt', maxAge: 60 * 60 * 6 },
  trustHost: true,
  pages: { signIn: '/login' },
  // CSRF hardening: strict sameSite on the session cookie so the encrypted
  // JWT never rides cross-site requests. Pair with the BFF's
  // X-Requested-With check to block CSRF even if a subdomain attacker
  // bypasses sameSite via a `Lax`-downgrading redirect trick.
  cookies: {
    sessionToken: {
      name: isProd ? '__Secure-authjs.session-token' : 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'strict',
        secure: isProd,
        path: '/',
      },
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        let response: Response;
        try {
          response = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsed.data),
          });
        } catch {
          return null;
        }
        if (!response.ok) return null;

        const result = loginResponseSchema.safeParse(await response.json());
        if (!result.success) return null;

        const { token, expires_in, user } = result.data;
        return {
          id: String(user.id),
          email: user.email,
          role: user.role,
          backendToken: token,
          backendExpiresAt: Math.floor(Date.now() / 1000) + expires_in,
        };
      },
    }),
  ],
  callbacks: {
    jwt: jwtCallback,
    session: sessionCallback,
  },
  events: {
    async signOut(message) {
      const backendToken =
        'token' in message && message.token ? message.token.backendToken : undefined;
      if (!backendToken || !BACKEND_URL) return;
      try {
        // Hard 3s cap — the cookie has already been cleared by NextAuth by
        // the time this event runs, so a stalled backend must never hold up
        // the response to the browser.
        await fetch(`${BACKEND_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${backendToken}` },
          signal: AbortSignal.timeout(3000),
        });
      } catch {
        // Best-effort: NextAuth has already cleared the cookie regardless.
      }
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
