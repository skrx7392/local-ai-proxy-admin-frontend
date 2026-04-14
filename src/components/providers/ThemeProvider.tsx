'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

/**
 * next-themes wrapper. `attribute="class"` puts `class="dark"` / `class="light"`
 * on <html>, which is exactly what Chakra v3's `_dark` / `_light` conditions
 * key off by default. Default is dark per PLAN.md.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
