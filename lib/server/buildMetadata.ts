import type { Metadata } from 'next';
// @ts-expect-error JS module without types — see docs/reference/routing.md §2
import { buildRoute } from '../../src/routing/routeCodec';

type GlobalData = {
  tags?: { tagIndex?: Record<string, { slug: string } | undefined> };
  commentary?: { comSources?: Record<string, { name: string } | undefined> };
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
): Metadata {
  const baseTitle = `Isaiah ${state.chapter}:${state.verse}`;
  let title = `${baseTitle} | Isaiah Explorer`;
  let description = `Read Isaiah ${state.chapter}:${state.verse} in multiple translations with thematic tags, Hebrew lexicon, and scholarly commentary.`;

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

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'article',
      siteName: 'Isaiah Explorer',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}
