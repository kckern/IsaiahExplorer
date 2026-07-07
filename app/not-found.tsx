import Link from 'next/link';

export default function NotFound() {
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
      <h1>Page not found</h1>
      <p>That reference doesn&rsquo;t exist in Isaiah.</p>
      <Link href="/">Go to Isaiah 1:1</Link>
    </main>
  );
}
