/**
 * Compute the focal tag (the tag the UI is currently subject of) from
 * the three overlapping state fields. The precedence rule, derived from
 * the audit:
 *   showcase_tag  (hover/cycle preview)   beats
 *   selected_tag  (committed click)       beats
 *   previewed_tag (only inside tagMode)
 */
export function getFocalTag(state) {
  if (state.showcase_tag) return { tag: state.showcase_tag, source: 'showcase' };
  if (state.selected_tag) return { tag: state.selected_tag, source: 'committed' };
  if (state.tagMode && state.previewed_tag) {
    return { tag: state.previewed_tag, source: 'previewed' };
  }
  return { tag: null, source: null };
}

// Memo cache for getTagVerses. Keyed by tag name; tag→verse mappings come from
// the immutable `tags` store loaded once, so caching for the app lifetime is
// safe. Exposed reset for tests / data reloads.
const _verseCache = new Map();
export function resetTagVerseCache() {
  _verseCache.clear();
}

/**
 * Pure, memoized replacement for App.getTagData's verse computation.
 *
 * The legacy getTagData did `delete g.verses` on the SHARED tagIndex entry and
 * rewrote it on every call (audit P1.8) — a read that mutated the global store
 * and recomputed every time. This computes the verse list WITHOUT touching the
 * store and caches the result. A `seen` set guards against cyclic tag graphs.
 *
 * @param {object} tags - globalData.tags (tagIndex, tagStructure, superRefs, tagChildren, parentTagIndex)
 * @param {string} tagName
 * @returns {number[]} verse ids
 */
export function getTagVerses(tags, tagName) {
  if (_verseCache.has(tagName)) return _verseCache.get(tagName);
  const verses = computeTagVerses(tags, tagName, new Set());
  _verseCache.set(tagName, verses);
  return verses;
}

function computeTagVerses(tags, tagName, seen) {
  if (seen.has(tagName)) return [];
  seen.add(tagName);

  const entry = tags.tagIndex[tagName];
  if (entry === undefined) {
    return (tags.superRefs && tags.superRefs['Structures']) || [];
  }

  let segments = tags.tagStructure && tags.tagStructure[tagName];
  if (segments !== undefined) {
    let verses = [];
    if (typeof segments === 'object' && !Array.isArray(segments)) {
      segments = Object.keys(segments).map((key) => segments[key]);
    }
    for (const i in segments) verses = verses.concat(segments[i].verses);
    return verses;
  }

  if (tags.superRefs && tags.superRefs[tagName] !== undefined) {
    return tags.superRefs[tagName];
  }

  let children = tags.tagChildren && tags.tagChildren[tagName];
  if (children === undefined) children = tags.parentTagIndex && tags.parentTagIndex[tagName];
  if (children === undefined) return []; // leaf with no verses

  let out = [];
  for (const c in children) {
    out = out.concat(computeTagVerses(tags, children[c], seen));
  }
  return out;
}
