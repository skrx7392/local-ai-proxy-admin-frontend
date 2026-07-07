'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

/**
 * next-themes wrapper. `attribute="class"` puts `class="dark"` / `class="light"`
 * on <html>, which is exactly what Chakra v3's `_dark` / `_light` conditions
 * key off by default. Default is dark per PLAN.md.
 *
 * `nonce` reaches the FOUC-prevention inline script next-themes injects —
 * without it the script-src CSP (no 'unsafe-inline') blocks the script.
 */
export function ThemeProvider({ children, nonce }: { children: ReactNode; nonce?: string }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
      {...(nonce ? { nonce } : {})}
    >
      {children}
    </NextThemesProvider>
  );
}
