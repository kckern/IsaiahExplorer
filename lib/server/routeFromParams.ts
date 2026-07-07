import { parseRoute } from '../../src/routing/routeCodec';
import {
  DEFAULT_STRUCTURE,
  DEFAULT_OUTLINE,
  DEFAULT_VERSION,
} from '../../src/routing/defaults';

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

// Route defaults are shared with the client via src/routing/defaults.js so the
// server and SPA agree on what a bare "/" resolves to (audit P0.6).

// Isaiah has 66 chapters. A route naming a chapter outside 1..66 (or verse < 1)
// is not a real page and must 404 rather than soft-render Isaiah 1:1.
const MAX_CHAPTER = 66;

/**
 * Structural validity check for a catch-all slug: true if the whole path parses
 * into known route fields (no trailing junk) and any chapter/verse is in range.
 * The bare root (undefined/empty slug) is always recognized. Used by the page
 * to decide between rendering and notFound().
 */
export function isRecognizedRoute(slug: string[] | undefined): boolean {
  if (!slug || slug.length === 0) return true;
  const decoded = slug.map((s) => decodeURIComponent(s));
  const parsed = parseRoute('/' + decoded.join('/')) as {
    recognizedSegments?: number;
    chapter?: number;
    verse?: number;
  };
  if ((parsed.recognizedSegments ?? 0) !== decoded.length) return false;
  if (parsed.chapter !== undefined && (parsed.chapter < 1 || parsed.chapter > MAX_CHAPTER))
    return false;
  if (parsed.verse !== undefined && parsed.verse < 1) return false;
  return true;
}

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
