import type { Metadata } from 'next';
import { buildRoute } from '../../src/routing/routeCodec';
import { buildTitle, buildDescription } from '../../src/routing/seo';

type GlobalData = {
  tags?: { tagIndex?: Record<string, { slug: string } | undefined> };
  commentary?: { comSources?: Record<string, { name: string } | undefined> };
  meta?: { version?: Record<string, { shortcode?: string } | undefined> };
};

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
  const versionKey = state.version.toUpperCase();
  const shortcode = data?.meta?.version?.[versionKey]?.shortcode || versionKey;

  const activeTag = state.showcase_tag || state.selected_tag;
  const tagEntry = activeTag ? data?.tags?.tagIndex?.[activeTag] : null;
  const tagName = activeTag && tagEntry ? activeTag : null;
  const commentarySourceName =
    state.commentaryMode && state.commentarySource
      ? data?.commentary?.comSources?.[state.commentarySource]?.name
      : undefined;

  const seoInputs = {
    chapter: state.chapter,
    verse: state.verse,
    shortcode,
    tagName,
    hebrewStrongIndex: state.hebrewStrongIndex,
    searchQuery: state.searchQuery,
    commentarySourceName,
  };
  const title = buildTitle(seoInputs);
  const description = buildDescription({ ...seoInputs, verseText });

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
