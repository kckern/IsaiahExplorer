type GlobalData = {
  tags?: { tagIndex?: Record<string, { slug: string } | undefined> };
};

/**
 * Reverse lookup of slug → tag name in globalData.tags.tagIndex.
 * Mirrors App.loadTagFromSlug at src/App.js:329-335.
 *
 * Slugs are not computed — they come from data (each tagIndex entry has
 * a .slug field). Unknown slugs return null, matching the client behavior
 * where the URL's tag is silently dropped.
 */
export function resolveTagFromSlug(slug: string | null, data: GlobalData): string | null {
  if (!slug || !data?.tags?.tagIndex) return null;
  for (const tagName of Object.keys(data.tags.tagIndex)) {
    if (data.tags.tagIndex[tagName]?.slug === slug) return tagName;
  }
  return null;
}
