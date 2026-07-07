/**
 * Declarative keyboard map for the root App component.
 *
 * `resolveKey` is a PURE function: given a keyboard event and a snapshot of the
 * relevant App context flags, it returns the NAME of the action to run (a
 * string) or `null` when the key should be ignored. It performs NO side effects
 * and never touches the DOM or App state — the caller (`App.keyDown`) builds the
 * context, calls `resolveKey`, then dispatches the returned action name through
 * `App.keyboardActions`.
 *
 * This replaces the previous ~140-line `keyDown` wall of `e.keyCode` numeric
 * literals. Every branch of that handler is transcribed here, keyed on the
 * modern `event.key` value instead of the legacy `keyCode`:
 *
 *   keyCode 37/38/39/40  -> ArrowLeft/ArrowUp/ArrowRight/ArrowDown
 *   keyCode 33 / 219     -> PageUp / '['   (cycle version back)
 *   keyCode 34 / 221     -> PageDown / ']' (cycle version forward)
 *   keyCode 36           -> Home           (cycle outline back)
 *   keyCode 35 / 222     -> End / "'"      (cycle outline forward)
 *   keyCode 45 / 46      -> Insert / Delete (cycle structure)
 *   keyCode 9            -> Tab            (cycle section)
 *   keyCode 13           -> Enter          (toggle verse selection)
 *   keyCode 27           -> Escape         (clear tag, unless audio active)
 *   keyCode 192          -> '`' / '~'      (open commentary)
 *   keyCode 107 / 187    -> '+' / '='      (cycle tag)
 *   keyCode 111          -> '/'            (minus-toggle tag)  [numpad divide]
 *   keyCode 106          -> '*'            (toggle hebrew)     [numpad multiply]
 *   keyCode 32           -> ' '            (toggle audio)
 *   keyCode 65-90        -> a-z / A-Z      (start free-text search)
 *   keyCode 48-57, 96-105, 110/190/186 -> digits / '.' / ';' (start ref search)
 */

// Context-free direct mappings: a single `event.key` value resolves straight to
// one action name regardless of App state. (Context-gated keys — Escape, Space,
// the searchbox-focused editing keys, and the letter/digit search triggers — are
// handled by the branching logic in resolveKey below.)
const DIRECT_KEY_ACTIONS = {
  Enter: 'enterToggleVerse',

  ArrowLeft: 'left',
  ArrowUp: 'up',
  ArrowRight: 'right',
  ArrowDown: 'down',

  PageUp: 'cycleVersionPrev',
  '[': 'cycleVersionPrev',
  PageDown: 'cycleVersionNext',
  ']': 'cycleVersionNext',

  Home: 'cycleOutlinePrev',
  End: 'cycleOutlineNext',
  "'": 'cycleOutlineNext',

  Insert: 'cycleStructurePrev',
  Delete: 'cycleStructureNext',

  Tab: 'cycleSection',

  '`': 'openCommentary',
  '~': 'openCommentary',

  '+': 'cycleTag',
  '=': 'cycleTag',

  '/': 'minusToggleTag',
  '*': 'toggleHebrew',
};

// When the search box has focus these keys must fall through to native text
// editing (caret movement / delete / tab out) instead of navigating the app.
// Transcribes the legacy guard `[37, 39, 35, 36, 46, 9]`
// (Left, Right, End, Home, Delete, Tab). Note ArrowUp/ArrowDown were NOT in the
// legacy list, so they keep navigating even while the search box is focused.
const SEARCHBOX_PASSTHROUGH_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'End',
  'Home',
  'Delete',
  'Tab',
]);

// Actions that must NOT call `event.preventDefault()`. In the legacy keyDown,
// Escape and the type-to-search triggers deliberately let the browser keep its
// default handling; everything else called preventDefault.
export const NO_PREVENT_DEFAULT_ACTIONS = new Set([
  'escapeClearTag',
  'preSearch',
  'preSearchRef',
]);

/**
 * Map a keyboard event + context snapshot to an action name (or null).
 *
 * @param {{key?: string, ctrlKey?: boolean, metaKey?: boolean}} event
 * @param {{
 *   audioActive?: boolean,        // App.state.audioState !== null
 *   searchboxFocused?: boolean,   // #searchbox === document.activeElement
 *   commentaryAudioMode?: boolean,
 *   searchMode?: boolean,
 *   preSearchMode?: boolean,
 * }} [context]
 * @returns {string|null}
 */
export function resolveKey(event, context = {}) {
  if (!event || typeof event.key !== 'string') return null;

  // Legacy guards: chorded shortcuts (Ctrl/Cmd) are never app navigation.
  if (event.ctrlKey || event.metaKey) return null;

  const key = event.key;

  // Escape clears the active tag, unless audio is playing/loading — in which
  // case the legacy handler bailed out and let audio/browser handle it.
  if (key === 'Escape') {
    return context.audioActive ? null : 'escapeClearTag';
  }

  // While editing in the search box, let these keys do native text editing.
  if (context.searchboxFocused && SEARCHBOX_PASSTHROUGH_KEYS.has(key)) {
    return null;
  }

  // Space toggles audio playback. Commentary-audio mode wins even during a
  // search; the plain verse-audio toggle only fires outside search modes.
  if (key === ' ') {
    if (context.commentaryAudioMode) return 'toggleCommentaryAudio';
    if (!context.searchMode && !context.preSearchMode) return 'toggleAudioVerse';
    return null;
  }

  const direct = DIRECT_KEY_ACTIONS[key];
  if (direct !== undefined) return direct;

  // Single printable character not otherwise mapped: type-to-search triggers.
  if (key.length === 1) {
    if (/[a-zA-Z]/.test(key)) {
      // A letter opens the free-text search — but not if a search is already
      // open (matches the legacy `!preSearchMode && !searchMode` guard).
      if (!context.searchMode && !context.preSearchMode) return 'preSearch';
      return null;
    }
    if (/[0-9]/.test(key) || key === '.' || key === ';') {
      // A digit or reference punctuation opens the reference search. The legacy
      // handler ran this branch unconditionally (no search-mode guard).
      return 'preSearchRef';
    }
  }

  return null;
}
