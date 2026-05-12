/**
 * Route codec for Isaiah Explorer.
 *
 * All functions are pure — they take plain values and return plain values.
 * No imports from globalData; callers are responsible for meta validation.
 *
 * URL shape (hash path, no leading #):
 *   /:structure/:outline/:version[/tag.:slug][/search.:query][/hebrew.:strong]/:chapter/:verse[/commentary.:source[/:id]]
 *
 * Legacy shapes handled by normalizeRoute():
 *   /:chapter/:verse
 *   /:chapter
 *   /tag.:slug
 *   /search/:query
 *   /hebrew/:strong
 */

const MAIN_REGEX = new RegExp(
  "^(/[^/]+)(/[^/]+)(/[^/]+)" +           // structure / outline / version
  "(/tag\\.[^/]+)*" +                       // optional tag
  "(/search\\.[^/]+)*" +                    // optional search
  "(/hebrew\\.[0-9]+)*" +                   // optional hebrew
  "(/[0-9]+)(/[0-9]+)" +                    // chapter / verse
  "(/commentary\\.[^/]+)*(/[0-9]+)*",       // optional commentary source + id
  "i"
);

/**
 * parseRoute(path) → parsed route object
 *
 * Accepts a hash path (e.g. "/divisions/divisions/KJV/1/1").
 * Returns a plain object with only the fields that were present in the path.
 * Callers should validate fields against globalData.meta before using.
 *
 * @param {string} path - path portion of URL (no leading #)
 * @returns {{ structure?, outline?, version?, tag?, search?, hebrew?, chapter?, verse?, commentarySource?, commentaryID? }}
 */
export function parseRoute(path) {
  if (!path || path === "/") return {};

  const result = {};

  // Legacy: /tag.slug at root (no structure/outline/version)
  const legacyTag = /^\/tag\.([^/]+)/i.exec(path);
  if (legacyTag) {
    result.tag = legacyTag[1].replace(/^tag\./, "");
    return result;
  }

  // Legacy: /search/:query
  const legacySearch = /^\/search\/([^/]+)/i.exec(path);
  if (legacySearch) {
    result.search = decodeSearchParam(legacySearch[1]);
    return result;
  }

  // Legacy: /hebrew/:strong
  const legacyHebrew = /^\/hebrew\/([0-9]+)/i.exec(path);
  if (legacyHebrew) {
    result.hebrew = parseInt(legacyHebrew[1], 10);
    return result;
  }

  // Legacy: /:chapter/:verse
  const legacyCV = /^\/([0-9]+)\/([0-9]+)$/.exec(path);
  if (legacyCV) {
    result.chapter = parseInt(legacyCV[1], 10);
    result.verse = parseInt(legacyCV[2], 10);
    return result;
  }

  // Legacy: /:chapter
  const legacyC = /^\/([0-9]+)$/.exec(path);
  if (legacyC) {
    result.chapter = parseInt(legacyC[1], 10);
    result.verse = 1;
    return result;
  }

  // Full canonical form
  const m = MAIN_REGEX.exec(path);
  if (!m) return result;

  const params = Array.from({ length: 11 }, (_, i) =>
    typeof m[i] === "string" ? m[i].replace(/^\//, "") : null
  );

  if (params[1]) result.structure = params[1];
  if (params[2]) result.outline = params[2];
  if (params[3]) result.version = params[3].toUpperCase();
  if (params[4]) result.tag = params[4].replace(/^tag\./, "");
  if (params[5]) {
    result.search = decodeSearchParam(params[5].replace(/^search\./, ""));
  }
  if (params[6]) result.hebrew = parseInt(params[6].replace(/^hebrew\./, ""), 10);
  if (params[7]) result.chapter = parseInt(params[7], 10);
  if (params[8]) result.verse = parseInt(params[8], 10);
  if (params[9]) {
    result.commentarySource = params[9].replace(/^commentary\./, "");
    if (params[10]) result.commentaryID = params[10];
  }

  return result;
}

/**
 * buildRoute(state) → path string (no leading #)
 *
 * Accepts the fields from App state needed to produce a URL.
 * Returns a lowercase path string.
 *
 * @param {{ structure, outline, version, chapter, verse, showcase_tag?, selected_tag?, searchQuery?, hebrewStrongIndex?, commentaryMode?, commentarySource?, commentaryID?, tagSlugs? }} state
 * @param {function} getTagSlug - lookup fn: (tagName) => slug string or null
 * @returns {string}
 */
export function buildRoute(state, getTagSlug) {
  let path = `/${state.structure}/${state.outline}/${state.version}`;

  const activeTag = state.showcase_tag || state.selected_tag || null;
  if (activeTag && getTagSlug) {
    const slug = getTagSlug(activeTag);
    if (slug) {
      path += `/tag.${slug}`;
    }
  } else if (state.searchQuery && !state.hebrewStrongIndex) {
    const encoded = encodeSearchParam(state.searchQuery);
    path += `/search.${encoded}`;
  } else if (state.hebrewStrongIndex != null) {
    path += `/hebrew.${state.hebrewStrongIndex}`;
  }

  path += `/${state.chapter}/${state.verse}`;

  if (state.commentaryMode && state.commentarySource) {
    path += `/commentary.${state.commentarySource}`;
    if (state.commentaryID != null) {
      path += `/${state.commentaryID}`;
    }
  }

  return path.toLowerCase();
}

/**
 * normalizeRoute(path) → canonical path or null if already canonical
 *
 * Returns a redirect target if `path` is a legacy form that should be
 * redirected to a canonical form, or null if no redirect is needed.
 * The caller is responsible for applying the redirect.
 *
 * @param {string} path
 * @returns {string|null}
 */
export function normalizeRoute(path) {
  if (!path || path === "/") return null;

  // /search/:query → /search.:query (canonical inline form)
  const legacySearch = /^\/search\/([^/]+)/i.exec(path);
  if (legacySearch) {
    return null; // handled by parser; no redirect needed for hash routing
  }

  // /hebrew/:strong → /hebrew.:strong (canonical inline form)
  const legacyHebrew = /^\/hebrew\/([0-9]+)/i.exec(path);
  if (legacyHebrew) {
    return null; // handled by parser
  }

  return null;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function encodeSearchParam(query) {
  let q = query;
  q = q.replace(/–/g, "-");
  q = q.replace(/; /g, ";");
  q = q.replace(/｢([a-z])/g, "\\b$1");
  q = q.replace(/([a-z])｣/g, "$1\\b");
  return q.replace(/\s+/g, "+").replace(/\//g, "").toLowerCase();
}

function decodeSearchParam(encoded) {
  return encoded
    .replace(/[｢｣]/g, "/")
    .replace(/\+/g, " ");
}
