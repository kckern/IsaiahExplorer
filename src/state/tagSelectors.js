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
