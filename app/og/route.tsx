import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { loadGlobalData } from '../../lib/server/dataCache';
import { getVerseText } from '../../lib/server/verseText';

/**
 * Dynamic Open Graph card, rendered server-side by next/og (Satori).
 *
 * Lives as a route handler (not the `opengraph-image` file convention)
 * because that convention can't sit inside the optional catch-all
 * `[[...slug]]` segment. buildMetadata points `openGraph.images` here with
 * `?v=&c=&vs=` query params.
 *
 * It only runs when a social crawler scrapes a URL — not on normal page
 * loads — and ImageResponse's default `immutable, max-age=31536000`
 * Cache-Control lets the CDN serve it from cache after the first scrape.
 *
 * Layout: a warm-parchment card with the reference · version label, the
 * verse's own text as the hero, and the "Isaiah Explorer" wordmark — set
 * in the app's scripture font (public/scripture.ttf, "Goudy Scripture").
 */
export const runtime = 'nodejs';

const scriptureFont = fs.readFileSync(
  path.join(process.cwd(), 'public', 'scripture.ttf'),
);

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const version = sp.get('v') || 'IINST';
  const chapter = parseInt(sp.get('c') || '1', 10) || 1;
  const verse = parseInt(sp.get('vs') || '1', 10) || 1;

  const data = await loadGlobalData();
  const versionKey = version.toUpperCase();
  const shortcode = data.meta?.version?.[versionKey]?.shortcode || versionKey;
  const reference = `Isaiah ${chapter}:${verse} · ${shortcode}`;

  const fullText = await getVerseText(version, chapter, verse);
  const verseBody =
    (fullText && fullText.length > 240
      ? fullText.slice(0, 240).replace(/\s+\S*$/, '') + '…'
      : fullText) ||
    'Read Isaiah in multiple translations with thematic tags, Hebrew lexicon, and scholarly commentary.';

  const len = verseBody.length;
  const verseSize = len <= 90 ? 62 : len <= 160 ? 50 : 40;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f4ead2',
          padding: '70px 90px',
          fontFamily: 'Goudy Scripture',
        }}
      >
        <div style={{ fontSize: 30, letterSpacing: 6, color: '#9a8552' }}>
          {reference.toUpperCase()}
        </div>
        <div
          style={{
            fontSize: verseSize,
            lineHeight: 1.4,
            color: '#2e2519',
            textAlign: 'center',
            maxWidth: 1000,
          }}
        >
          {verseBody}
        </div>
        <div style={{ fontSize: 28, letterSpacing: 3, color: '#9a8552' }}>
          Isaiah Explorer
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Goudy Scripture',
          data: scriptureFont,
          style: 'normal',
          weight: 400,
        },
      ],
    },
  );
}
