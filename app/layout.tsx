import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Isaiah Explorer',
  description: 'Read Isaiah in multiple translations with thematic tags, Hebrew lexicon, and scholarly commentary.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
