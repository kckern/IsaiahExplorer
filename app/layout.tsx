import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'Isaiah Explorer',
  description: 'Read Isaiah in multiple translations with thematic tags, Hebrew lexicon, and scholarly commentary.',
  // Google Search Console URL-prefix property for https://isaiah.scripture.guide.
  // (The TXT-record method conflicts with the existing CNAME on this name in
  // Route 53, so we verify via the meta tag instead.)
  verification: { google: 'lMBgL5xixXULsNvFFt_pNVR8SMJGuKxwcHxxM50uY74' },
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
      <body>
        {children}
        {/* Clicky analytics (site 101134488) — the snippet lived in the CRA
            public/index.html removed during the Next.js migration; restored
            here. data-id auto-inits; App.js fires SPA pageviews via
            window.clicky.log on navigation. CSP allows *.getclicky.com. */}
        <Script
          src="https://static.getclicky.com/js"
          data-id="101134488"
          strategy="afterInteractive"
        />
        <noscript>
          <p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Clicky"
              width="1"
              height="1"
              src="https://in.getclicky.com/101134488ns.gif"
            />
          </p>
        </noscript>
      </body>
    </html>
  );
}
