'use client';

import { SessionProvider as BaseSessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';

export function SessionProvider({ children }: { children: ReactNode }) {
  return <BaseSessionProvider>{children}</BaseSessionProvider>;
}
