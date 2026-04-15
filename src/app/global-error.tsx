'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[global] root error', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: '#0f2027',
          color: '#f8fafc',
        }}
      >
        <main
          style={{
            maxWidth: '28rem',
            width: '100%',
            padding: '2rem',
            borderRadius: '0.875rem',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.18)',
          }}
          data-testid="global-error"
        >
          <h1 style={{ fontSize: '1.25rem', marginTop: 0 }}>
            Something went very wrong
          </h1>
          <p style={{ opacity: 0.75 }}>
            The application hit an unrecoverable error. Try reloading.
          </p>
          {error.digest && (
            <p style={{ opacity: 0.55, fontFamily: 'ui-monospace, monospace' }}>
              ref: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            type="button"
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(255,255,255,0.24)',
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
