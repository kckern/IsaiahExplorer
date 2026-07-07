/**
 * The single source of truth for route/session defaults.
 *
 * The client has always rendered KJV for a bare URL (it defaults `version` to
 * `top_versions[0]` in App.initApp), while the server's routeFromParams used to
 * hardcode `IINST` — so a bare "/" got IINST metadata server-side and KJV
 * content client-side (audit P0.6). Both sides now import these constants; KJV
 * wins, matching the long-standing client behavior.
 *
 * Plain JS (not TS) so both the client SPA (src/) and the server layer
 * (lib/server/) can import it.
 */
export const DEFAULT_STRUCTURE = "whole";
export const DEFAULT_OUTLINE = "chapters";
export const DEFAULT_VERSION = "KJV";
export const DEFAULT_VERSE_ID = 17656; // Isaiah 1:1

export const DEFAULT_TOP_VERSIONS = ["KJV", "IINST", "NRSV", "NIV", "NASB"];
export const DEFAULT_TOP_OUTLINES = ["chapters", "mev", "nrsv", "niv", "nasb"];
export const DEFAULT_TOP_STRUCTURES = [
  "whole",
  "bibleproject",
  "7part",
  "authorship",
  "wikipedia",
];
