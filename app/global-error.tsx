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
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          display: 'flex',
          minHeight: '100vh',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 32,
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 600 }}>Application error</h1>
        <p style={{ maxWidth: 480, color: '#4b5563' }}>
          A critical error prevented the page from rendering.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: '1px solid #d1d5db',
            background: '#3b82f6',
            color: 'white',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
