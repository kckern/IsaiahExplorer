/**
 * Isomorphic SEO title/description builder — the single source of truth for
 * page metadata, imported by BOTH the server (lib/server/buildMetadata.ts) and
 * the client (src/App.js setUrl). Keep this in sync with
 * lib/server/__tests__/buildMetadata.test.ts, which encodes the authoritative
 * output strings.
 *
 * Precedence (both title and description): tag → hebrew → search → commentary
 * → default. The caller is responsible for only passing `tagName` when it is a
 * real tag and `commentarySourceName` only when the source resolves.
 */

/** Trim verse text to a social-card-friendly length on a word boundary. */
export function truncate(text, max) {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice).trimEnd() + '…';
}

/**
 * @param {{chapter:(number|string), verse:(number|string), shortcode:string,
 *   tagName?:(string|null), hebrewStrongIndex?:(number|null),
 *   searchQuery?:(string|null), commentarySourceName?:(string|null)}} o
 */
export function buildTitle(o) {
  const baseTitle = `Isaiah ${o.chapter}:${o.verse}`;
  if (o.tagName) {
    return `${o.tagName} | ${baseTitle}`;
  } else if (o.hebrewStrongIndex) {
    return `Hebrew H${o.hebrewStrongIndex} | Isaiah Explorer`;
  } else if (o.searchQuery) {
    return `"${o.searchQuery}" | Isaiah Explorer`;
  } else if (o.commentarySourceName) {
    return `${baseTitle} | ${o.commentarySourceName}`;
  }
  return `${baseTitle} · ${o.shortcode} | Isaiah Explorer`;
}

/**
 * @param {{chapter:(number|string), verse:(number|string),
 *   tagName?:(string|null), hebrewStrongIndex?:(number|null),
 *   searchQuery?:(string|null), commentarySourceName?:(string|null),
 *   verseText?:(string|null)}} o
 */
export function buildDescription(o) {
  if (o.tagName) {
    return `Explore the theme "${o.tagName}" in Isaiah.`;
  } else if (o.hebrewStrongIndex) {
    return `Study Hebrew word H${o.hebrewStrongIndex} in Isaiah.`;
  } else if (o.searchQuery) {
    return `Isaiah Explorer search results for "${o.searchQuery}".`;
  } else if (o.commentarySourceName) {
    return `${o.commentarySourceName} commentary on Isaiah ${o.chapter}:${o.verse}.`;
  }
  return o.verseText
    ? truncate(o.verseText, 300)
    : `Read Isaiah ${o.chapter}:${o.verse} in multiple translations with thematic tags, Hebrew lexicon, and scholarly commentary.`;
}
