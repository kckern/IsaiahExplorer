import { parseRoute } from '../../src/routing/routeCodec';

export type RouteState = {
  structure: string;
  outline: string;
  version: string;
  chapter: number;
  verse: number;
  tagSlug: string | null;
  searchQuery: string | null;
  hebrewStrongIndex: number | null;
  commentaryMode: boolean;
  commentarySource: string | null;
  commentaryID: string | null;
};

/**
 * Defaults match the client's getSettingsFromUrl behavior (App.js:242-278)
 * after validation: when structure/outline/version are missing or invalid,
 * the app falls back to the first entry in globalData.meta.* — these
 * constants are the first entries in the canonical data set.
 */
const DEFAULT_STRUCTURE = 'whole';
const DEFAULT_OUTLINE = 'chapters';
const DEFAULT_VERSION = 'IINST';

/**
 * Converts Next.js catch-all params (`{ slug: string[] | undefined }`) into
 * the route state object that buildMetadata consumes.
 *
 * The slug array is joined with `/` and run through the codec's parseRoute;
 * missing fields are filled with project defaults.
 */
export function routeFromParams(slug: string[] | undefined): RouteState {
  // Next.js percent-encodes path segments in `params.slug` (e.g. `+` → `%2B`).
  // The codec expects raw characters, so decode each segment before joining.
  const decoded = slug && slug.length > 0 ? slug.map((s) => decodeURIComponent(s)) : [];
  const path = decoded.length > 0 ? '/' + decoded.join('/') : '/';
  const parsed = parseRoute(path);

  return {
    structure: parsed.structure ?? DEFAULT_STRUCTURE,
    outline: parsed.outline ?? DEFAULT_OUTLINE,
    version: parsed.version ?? DEFAULT_VERSION,
    chapter: parsed.chapter ?? 1,
    verse: parsed.verse ?? 1,
    tagSlug: parsed.tag ?? null,
    searchQuery: parsed.search ?? null,
    hebrewStrongIndex: parsed.hebrew ?? null,
    commentaryMode: parsed.commentarySource !== undefined,
    commentarySource: parsed.commentarySource ?? null,
    commentaryID: parsed.commentaryID ?? null,
  };
}
