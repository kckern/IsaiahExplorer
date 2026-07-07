import { buildRoute } from '../../src/routing/routeCodec';
import {
  DEFAULT_STRUCTURE,
  DEFAULT_OUTLINE,
  DEFAULT_VERSION,
} from '../../src/routing/defaults';

type IndexEntry = { chapter: number; verse: number };
type GlobalData = { index?: Record<string, IndexEntry> };

export const SITE_ORIGIN = 'https://isaiah.scripture.guide';

export type SitemapEntry = {
  url: string;
  changeFrequency: 'yearly';
  priority: number;
};

/**
 * One sitemap entry per verse in the Isaiah index (1,292 verses across 66
 * chapters), each a canonical URL produced by the same buildRoute the SPA uses
 * to write URLs — so every sitemap URL matches the canonical the page declares
 * (the old static public/sitemap.xml listed legacy short forms that disagreed
 * with the app's canonicals). No lastModified: content changes only on deploy
 * and a stale fixed date is worse than none.
 */
export function sitemapEntries(
  data: GlobalData,
  origin: string = SITE_ORIGIN,
): SitemapEntry[] {
  const index = data.index || {};
  const entries: SitemapEntry[] = [];
  for (const verseId in index) {
    const { chapter, verse } = index[verseId];
    const path = buildRoute(
      {
        structure: DEFAULT_STRUCTURE,
        outline: DEFAULT_OUTLINE,
        version: DEFAULT_VERSION,
        chapter,
        verse,
      },
      () => null,
    );
    entries.push({
      url: origin + path,
      changeFrequency: 'yearly',
      priority: verse === 1 ? 0.7 : 0.5,
    });
  }
  return entries;
}
