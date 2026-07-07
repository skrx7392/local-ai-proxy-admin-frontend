import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { headers } from 'next/headers';

import { Providers } from '@/components/providers';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: 'local-ai admin',
  description: 'Admin console for local-ai-proxy.',
};

// Every page must be rendered per request: the middleware serves a
// nonce-based CSP, and statically prerendered HTML would ship inline
// scripts without the matching nonce — browsers would block hydration.
// This is an auth-gated console behind its own Node server, so static
// prerendering bought nothing anyway.
export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Set by src/middleware.ts; forwarded to the inline script next-themes
  // injects so it passes the nonce-based CSP.
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <Providers {...(nonce ? { nonce } : {})}>{children}</Providers>
      </body>
    </html>
  );
}
