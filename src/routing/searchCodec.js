/**
 * Single source of truth for search-query transforms.
 *
 * The same corner-bracket / `\b` word-boundary transliteration was copy-pasted
 * in routeCodec.js, App.js, and Search.js with subtly different regexes (audit
 * P2.5). These four functions are those transforms, deduplicated verbatim:
 *
 *   internal query  --encodeForUrl-->  canonical URL param   (and back: decodeFromUrl)
 *   internal query  --toDisplay----->  human-readable string
 *   search-box text --fromDisplay--->  internal query
 *
 * "internal query" uses `\b` for word boundaries; the URL form uses corner
 * brackets `｢ ｣`; the display form also uses corner brackets plus en-dashes.
 */

/** internal query → canonical URL param */
export function encodeForUrl(query) {
  let q = query;
  q = q.replace(/–/g, "-");
  q = q.replace(/; /g, ";");
  q = q.replace(/｢([a-z])/g, "\\b$1");
  q = q.replace(/([a-z])｣/g, "$1\\b");
  return q.replace(/\s+/g, "+").replace(/\//g, "").toLowerCase();
}

/** canonical URL param → internal query */
export function decodeFromUrl(encoded) {
  return encoded.replace(/[｢｣]/g, "/").replace(/\+/g, " ");
}

/** internal query → human-readable display (dashes + corner-bracket boundaries) */
export function toDisplay(query) {
  let q = query || "";
  q = q.replace(/[-]+/g, "–");
  q = q.replace(/[;]+/g, "; ");
  q = q.replace(/[\\]b([a-z])/g, "｢$1");
  q = q.replace(/([a-z])[\\]b/g, "$1｣");
  return q;
}

/** search-box text → internal query (boundary markers → `/`) */
export function fromDisplay(val) {
  return (val || "").replace(/([\\]b|[｢｣])/g, "/");
}
