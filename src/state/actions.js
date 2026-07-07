/**
 * Bounded action surface over the root App instance.
 *
 * The legacy pattern lets every component reach `globalData.app` and call
 * `app.setState(...)` directly (audit 1.1/P2.1). buildActions exposes a frozen,
 * explicit whitelist of the operations components legitimately perform, so the
 * raw `setState` and the live App instance stop leaking into the component tree.
 * Each action is bound to the app instance.
 *
 * This is additive: App still passes itself on the context during the migration,
 * but new code (and migrated call sites) should call `actions.*` rather than
 * `app.setState` / `app.*`.
 */

// Methods on App that components invoke. Kept as an explicit list so the action
// surface is auditable and `setState` / internal helpers are NOT exposed.
const ACTION_METHODS = [
  // navigation / selection
  "setActiveVerse",
  "setActiveTag",
  "setActiveVersion",
  "setActiveStructure",
  "setActiveOutline",
  "setActiveChiasm",
  "selectVerse",
  "doubleClickVerse",
  "spotVerse",
  "cycleVersion",
  // tags
  "showcaseTag",
  "clearTag",
  "setTagBlock",
  "setTagPanel",
  "setPreviewedTag",
  "setPreviewedSection",
  "setPreviewedPassage",
  "highlightTaggedVerses",
  // search / hebrew
  "search",
  "searchHebrewWord",
  "setHebrewWord",
  // audio
  "setAudioMode",
  // commentary / data
  "loadVersionText",
  "loadCommentaryID",
  // settings / persistence
  "setNewTop",
  "saveSettings",
  "closeSettings",
  "openSettings",
  "openVideo",
  "closeVideo",
  // panel state
  "setMobilePane",
];

/**
 * @param {object} app - the root App instance
 * @returns {Readonly<Record<string, Function>>} frozen bound-action object
 */
export function buildActions(app) {
  const actions = {};
  for (const name of ACTION_METHODS) {
    if (typeof app[name] === "function") {
      actions[name] = app[name].bind(app);
    }
  }
  // Named actions for the common raw-setState flips, so components stop calling
  // app.setState directly for these.
  actions.setMobilePane = function (pane) {
    app.setState({ mobilePane: pane });
  };
  return Object.freeze(actions);
}
