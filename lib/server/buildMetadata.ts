import type { Metadata } from 'next';
import { buildRoute } from '../../src/routing/routeCodec';

type GlobalData = {
  tags?: { tagIndex?: Record<string, { slug: string } | undefined> };
  commentary?: { comSources?: Record<string, { name: string } | undefined> };
  meta?: { version?: Record<string, { shortcode?: string } | undefined> };
};

/** Trim verse text to a social-card-friendly length on a word boundary. */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice).trimEnd() + '…';
}

export type MetadataState = {
  structure: string;
  outline: string;
  version: string;
  chapter: number;
  verse: number;
  selected_tag: string | null;
  showcase_tag: string | null;
  searchQuery: string | null;
  hebrewStrongIndex: number | null;
  commentaryMode: boolean;
  commentarySource: string | null;
  commentaryID: string | null;
};

/**
 * Server-side port of App.getSeoData() at src/App.js:337-383.
 *
 * Precedence for title/description (matches the client):
 *   tag (showcase > selected) → search → hebrew → commentary → default
 *
 * Canonical URL is always built via buildRoute (the same function the client
 * uses to write URLs), so the canonical matches what the SPA would emit.
 */
export function buildMetadata(
  state: MetadataState,
  data: GlobalData,
  origin: string,
  verseText?: string | null,
): Metadata {
  const baseTitle = `Isaiah ${state.chapter}:${state.verse}`;
  const versionKey = state.version.toUpperCase();
  const shortcode = data?.meta?.version?.[versionKey]?.shortcode || versionKey;

  // Default (plain verse) route: title carries the reference + version, and
  // the description is the verse's own text. The branches below override
  // both for the tag / hebrew / search / commentary route variants.
  let title = `${baseTitle} · ${shortcode} | Isaiah Explorer`;
  let description = verseText
    ? truncate(verseText, 300)
    : `Read Isaiah ${state.chapter}:${state.verse} in multiple translations with thematic tags, Hebrew lexicon, and scholarly commentary.`;

  const activeTag = state.showcase_tag || state.selected_tag;
  const tagEntry = activeTag ? data?.tags?.tagIndex?.[activeTag] : null;

  if (activeTag && tagEntry) {
    title = `${activeTag} | ${baseTitle}`;
    description = `Explore the theme "${activeTag}" in Isaiah.`;
  } else if (state.hebrewStrongIndex) {
    title = `Hebrew H${state.hebrewStrongIndex} | Isaiah Explorer`;
    description = `Study Hebrew word H${state.hebrewStrongIndex} in Isaiah.`;
  } else if (state.searchQuery) {
    title = `"${state.searchQuery}" | Isaiah Explorer`;
    description = `Isaiah Explorer search results for "${state.searchQuery}".`;
  } else if (state.commentaryMode && state.commentarySource) {
    const sourceName = data?.commentary?.comSources?.[state.commentarySource]?.name;
    if (sourceName) {
      title = `${baseTitle} | ${sourceName}`;
      description = `${sourceName} commentary on Isaiah ${state.chapter}:${state.verse}.`;
    }
  }

  const getTagSlug = (tagName: string): string | null => {
    const entry = data?.tags?.tagIndex?.[tagName];
    return entry ? entry.slug : null;
  };

  const path: string = buildRoute(state, getTagSlug);
  const canonical = origin + path;

  // Dynamic OG card (app/og/route.tsx). Explicit absolute URL so social
  // crawlers always get an og:image — Facebook warns when it's only
  // inferred. The card itself only needs version + chapter + verse.
  const ogImageUrl =
    `${origin}/og?v=${encodeURIComponent(versionKey)}` +
    `&c=${state.chapter}&vs=${state.verse}`;
  const ogImage = { url: ogImageUrl, width: 1200, height: 630, alt: title };

  return {
    title,
    description,
    metadataBase: new URL(origin),
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'article',
      siteName: 'Isaiah Explorer',
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}
