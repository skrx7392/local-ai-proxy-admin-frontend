'use client';

import type { ReactNode } from 'react';

import { ChakraProvider } from './ChakraProvider';
import { QueryProvider } from './QueryProvider';
import { SessionProvider } from './SessionProvider';
import { ThemeProvider } from './ThemeProvider';

/**
 * Composed provider tree. Theme provider (next-themes) sits OUTSIDE Chakra
 * so Chakra sees the resolved `class` attribute on <html> on first render.
 * SessionProvider wraps the tree so `useSession()` is available everywhere.
 * QueryProvider sits inside SessionProvider so 401 handlers in apiFetch
 * can dispatch signOut without tearing down the react-query cache.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <QueryProvider>
        <ThemeProvider>
          <ChakraProvider>{children}</ChakraProvider>
        </ThemeProvider>
      </QueryProvider>
    </SessionProvider>
  );
}

export { ChakraProvider, QueryProvider, SessionProvider, ThemeProvider };
