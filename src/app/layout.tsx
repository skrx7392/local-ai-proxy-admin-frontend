import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'local-ai admin',
  description: 'Admin console for local-ai-proxy.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
