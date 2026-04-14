import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      role: string;
    } & DefaultSession['user'];
  }

  interface User {
    id?: string;
    email?: string | null;
    role?: string;
    backendToken?: string;
    backendExpiresAt?: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
    email?: string;
    role?: string;
    backendToken?: string;
    backendExpiresAt?: number;
  }
}
