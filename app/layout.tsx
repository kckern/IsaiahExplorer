import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Isaiah Explorer',
  description: 'Read Isaiah in multiple translations with thematic tags, Hebrew lexicon, and scholarly commentary.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Roboto Condensed is the UI font (App.css). The webfont link lived
            in the CRA public/index.html, which was removed in the Next.js
            migration — restore it here so the UI doesn't fall back to Arial. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
