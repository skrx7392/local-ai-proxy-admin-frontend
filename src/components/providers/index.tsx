'use client';

import type { ReactNode } from 'react';

import { ChakraProvider } from './ChakraProvider';
import { ThemeProvider } from './ThemeProvider';

/**
 * Composed provider tree. Theme provider (next-themes) sits OUTSIDE Chakra
 * so Chakra sees the resolved `class` attribute on <html> on first render.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ChakraProvider>{children}</ChakraProvider>
    </ThemeProvider>
  );
}

export { ChakraProvider, ThemeProvider };
