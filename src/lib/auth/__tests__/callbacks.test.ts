import { describe, expect, it } from 'vitest';

import { jwtCallback, sessionCallback } from '../callbacks';

describe('jwt callback', () => {
  it('folds backendToken + user fields into the token on first sign-in', async () => {
    const result = await jwtCallback({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      token: {} as any,
      user: {
        id: '42',
        email: 'you@example.com',
        role: 'admin',
        backendToken: 'b'.repeat(64),
        backendExpiresAt: 1_234_567_890,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });

    expect(result).toMatchObject({
      userId: '42',
      email: 'you@example.com',
      role: 'admin',
      backendToken: 'b'.repeat(64),
      backendExpiresAt: 1_234_567_890,
    });
  });

  it('passes through unchanged on subsequent requests (no user)', async () => {
    const existing = {
      userId: '1',
      email: 'a@b.c',
      role: 'admin',
      backendToken: 't'.repeat(64),
      backendExpiresAt: 1,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await jwtCallback({ token: existing as any });
    expect(result).toBe(existing);
  });
});

describe('session callback', () => {
  it('projects user fields and strips backendToken', async () => {
    const token = {
      userId: '7',
      email: 'you@example.com',
      role: 'admin',
      backendToken: 'SECRET_TOKEN_VALUE_' + 'x'.repeat(50),
      backendExpiresAt: Math.floor(Date.now() / 1000) + 3600,
    };
    const session = await sessionCallback({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      session: { user: {} } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      token: token as any,
    });

    expect(session.user).toEqual({ id: '7', email: 'you@example.com', role: 'admin' });
    expect(JSON.stringify(session)).not.toContain('SECRET_TOKEN_VALUE_');
    expect(JSON.stringify(session)).not.toContain('backendToken');
  });
});
