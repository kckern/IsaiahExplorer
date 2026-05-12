/**
 * Single enum for the tag-panel UI mode.
 * Replaces two booleans (state.tagMode, state.infoOpen) whose valid
 * combinations were enforced only by convention.
 *
 *   CLOSED → no tag involvement (was: tagMode:false, infoOpen:false)
 *   VERSES → a tag is committed, showing its verses (was: tagMode:true, infoOpen:false)
 *   TREE   → the taxonomy panel is expanded (was: tagMode:true, infoOpen:true)
 *
 * `derivedTagMode` and `derivedInfoOpen` are bridges used during migration
 * so existing readers don't have to flip in one PR.
 */
export const TAG_PANEL = {
  CLOSED: 'closed',
  VERSES: 'verses',
  TREE: 'tree',
};

export function derivedTagMode(panel) {
  return panel === TAG_PANEL.VERSES || panel === TAG_PANEL.TREE;
}

export function derivedInfoOpen(panel) {
  return panel === TAG_PANEL.TREE;
}
