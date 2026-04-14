'use client';

import type { ReactNode } from 'react';

import { ChakraProvider } from './ChakraProvider';
import { SessionProvider } from './SessionProvider';
import { ThemeProvider } from './ThemeProvider';

/**
 * Composed provider tree. Theme provider (next-themes) sits OUTSIDE Chakra
 * so Chakra sees the resolved `class` attribute on <html> on first render.
 * SessionProvider wraps the tree so `useSession()` is available everywhere.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <ChakraProvider>{children}</ChakraProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}

export { ChakraProvider, SessionProvider, ThemeProvider };
