import { NextRequest, NextResponse } from 'next/server';

/**
 * Legacy slash-form redirects, ported from src/routing/RouterShell.js.
 *
 *   /search/:query   → /search.:query
 *   /hebrew/:strong  → /hebrew.:strong
 *
 * The redirect targets are not themselves canonical URLs (they lack
 * structure/outline/version); the page-level parseRoute is permissive
 * enough to accept them, falling back to defaults for the missing fields.
 * See docs/reference/routing.md §5.1 for the historical context.
 */
const SEARCH_LEGACY = /^\/search\/(.+)$/;
const HEBREW_LEGACY = /^\/hebrew\/(\d+)$/;

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  const searchMatch = SEARCH_LEGACY.exec(path);
  if (searchMatch) {
    const url = req.nextUrl.clone();
    url.pathname = `/search.${searchMatch[1]}`;
    return NextResponse.redirect(url, 308);
  }

  const hebrewMatch = HEBREW_LEGACY.exec(path);
  if (hebrewMatch) {
    const url = req.nextUrl.clone();
    url.pathname = `/hebrew.${hebrewMatch[1]}`;
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/search/:path*', '/hebrew/:path*'],
};
