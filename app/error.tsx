'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        fontFamily: 'Roboto Condensed, sans-serif',
      }}
    >
      <h1>Something went wrong</h1>
      <p>Isaiah Explorer hit an unexpected error.</p>
      <button type="button" onClick={() => reset()} style={{ fontSize: 16, padding: '12px 32px' }}>
        Try again
      </button>
    </main>
  );
}
