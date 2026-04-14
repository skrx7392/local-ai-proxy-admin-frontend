import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/**
 * Styleguide route group layout. Exists primarily so we can attach
 * `metadata.robots` (noindex/nofollow) at the route boundary — page-level
 * metadata works too, but declaring it on the layout keeps it in force if
 * nested routes are added later inside `(admin)/styleguide/*`.
 *
 * The layout itself is a pass-through; the page renders its own chrome.
 */
export const metadata: Metadata = {
  title: 'Styleguide · local-ai admin',
  description: 'Living design system reference for the local-ai admin console.',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function StyleguideLayout({ children }: { children: ReactNode }) {
  return children;
}
