# Tag Tree State-Management Audit — Isaiah Explorer
**Date:** May 2026
**Scope:** `src/Components/Tags.js` (771 lines, 9 components, 9 `useEffect`s, 13 `setState`s) and the ~10 tag-related fields in `App.state` that drive it.
**Auditor note:** Companion to `architecture-audit-2026.md`, `responsive-mobile-audit-2026.md`, and `scrolling-audit-2026.md`. The tag system is the most state-intensive feature in the app — and one of the most visually rewarding — so the state model deserves a careful look.

---

## Executive Summary

The tag tree manages roughly **ten overlapping state fields** distributed between (a) the root `App` class state and (b) local `useState`/`useRef` inside `Tags.js`'s function components. The result is a system that **works**, ships highlights correctly, and supports keyboard navigation — but it has no single source of truth for "which tag is currently the focal subject," uses hover-only interactions that hard-code mouse assumptions, and contains several anti-patterns (effects that fire every render, mount-only effects calling `setState`, recursive components that each subscribe to global context) that will become real problems on lower-end devices or under React 18's stricter rendering guarantees.

| Concern | Severity | Notes |
|---|---|---|
| Three overlapping "focal tag" fields with hand-coded precedence | 🔴 Critical | `selected_tag` / `showcase_tag` / `previewed_tag` waterfall appears in multiple places |
| Direct mutation of `globalData["tags"]["tagIndex"][...]` | 🔴 Critical | `Tags.js:82` writes `tagMeta["tagName"] = key_tag` — modifies the immutable-by-convention store |
| `useEffect(() => { openTree() })` with no deps array | 🟠 High | Fires every render in recursive `<TagTree>` — N tags = N effects per render |
| `useEffect(() => { setState(...) }, [])` with stale closures | 🟠 High | `Tags.js:285` — mount-only effect calls `app.setTagBlock(...)` synchronously inside the setState callback slot |
| Mouse-only previewed-tag system | 🟠 High | Hover-driven; no touch path. Touch leaves `previewed_tag` stuck lit |
| Tag state changes are non-transactional | 🟡 Medium | `selected_tag` and `selected_tag_block_index` can drift apart across renders |
| Recursive `<TagTree>` subscribes to context at every node | 🟡 Medium | Performance scales O(tags) per render |
| `useRef` used as mutable state, never written | 🟡 Medium | `activeBlockIndex = useRef(null)` (line 267) — read but never assigned |
| `tagMode` and `infoOpen` overlap semantically | 🟡 Medium | Both gate "tag panel is open" but in different combinations |
| 10+ tag-related state fields with overlapping responsibilities | 🟠 High | Adding a new tag interaction requires reasoning about all of them |

**Overall grade for tag state management:** C−. The visible behavior is correct, but the state model is at the limit of what the team can reason about, and there are real correctness risks (mutation of globalData, stale closures) that today only don't bite because of careful coding discipline that won't survive future changes.

---

## 1. The Tag State Universe

Tag-related fields live in `App.state` (the single source of truth pattern from `architecture-audit-2026.md`):

| Field | Type | Set by | Read by | Purpose |
|---|---|---|---|---|
| `selected_tag` | string \| null | `setActiveTag()`, URL parser | TagFloater, TaggedHeading, TagTree, TagTreeLeaf, TagBlocks, search code, scroll code | The "committed" focal tag — what the user actively clicked |
| `showcase_tag` | string \| null | `showcaseTag()`, keyboard nav, click-toggle in TagTree | TaggedHeading, TagTree, ParentLinks | A "spotlight" tag — keyboard-cycled but not necessarily clicked |
| `previewed_tag` | string \| null | `setPreviewedTag()` from onMouseEnter | TaggedHeading | Hover-only ephemeral preview |
| `selected_tag_block_index` | number \| null | `setTagBlock()` | TagBlocks, App highlight logic | Which chiastic block of the selected tag is the focal block |
| `highlighted_tagged_verse_range` | int[] | `setActiveVerse` callback chain | `<VerseBox>` (modifier class) | Which verses get `versebox_tag_highlighted` |
| `highlighted_tagged_parent_verse_range` | int[] | `setActiveTag` callback chain | `<VerseBox>` (modifier class) | Verses in the *parent* tag for breadcrumb highlighting |
| `tagMode` | bool | `clearTag(true)`, keyboard `+/-` cycle entry | Keyboard handlers, render path | "We're inside the tag-browsing UX flow" |
| `infoOpen` | bool | TaggedHeading click handler, various callbacks | App className, TaggedHeading render path | "The tag taxonomy panel is open (showing the tree)" |
| `allCollapsed` | bool | versebox/arrow source check, TagBlocks click | App render, TagBlocks render | "All non-focal tag blocks collapsed" |
| `chiasm_letter` | string \| null | `setActiveLetter()` | Chiastic scroll code | Active letter in a chiastic structure |

Plus inside `Tags.js`:

| Local state | Component | Purpose |
|---|---|---|
| `const [open, setOpen] = useState(false)` | `TagTree` | Whether this branch of the recursive tree is expanded |
| `const activeBlockIndex = useRef(null)` | `TagBlocks` | "Active block" pointer — but never written, only read |

**This is ten root-level fields plus per-node local state.** No two adjacent fields have clearly non-overlapping responsibilities — `selected_tag`/`showcase_tag`/`previewed_tag` are *all* "a tag the UI is paying attention to in some sense."

---

## 2. The Three "Focal Tag" Fields and Their Hand-Coded Precedence

`Tags.js:77–79` (inside `TaggedHeading`):

```js
var key_tag = state.selected_tag;
if (state.showcase_tag !== null) key_tag = state.showcase_tag;
if (state.tagMode && key_tag === null) key_tag = state.previewed_tag;
```

This three-step waterfall encodes the rule: *"showcase beats selected; in tagMode if nothing's selected, fall back to previewed."*

The rule is reasonable. The problem is the **waterfall is open-coded everywhere a component needs to ask "what tag is currently the subject?"** I counted at least 4 places where logic like this is partially or fully duplicated:

- `TaggedHeading` (line 77–79): the precedence above
- `App.js getSeoData()` (line 341): `var activeTag = this.state.showcase_tag || this.state.selected_tag || null;`
- `App.js setUrl()` (line 407): same `showcase_tag || selected_tag || null` pattern
- `Tags.js TagTreeLeaf` (line 239–240): uses *both* `selected_tag` and `showcase_tag` for "highlight"

The inconsistency:
- `TaggedHeading` says **showcase beats selected**.
- `getSeoData` and `setUrl` say **showcase beats selected** (same).
- `TagTreeLeaf` says **either highlights independently** (different).

Today they don't visibly contradict because the modes don't co-occur often. They will when you add mobile, search, or a "compare two tags" feature.

### What this should be

One memoized selector that takes `state` and returns `{ tag, source }`:

```js
function getFocalTag(state) {
  if (state.showcase_tag) return { tag: state.showcase_tag, source: 'showcase' };
  if (state.selected_tag) return { tag: state.selected_tag, source: 'selected' };
  if (state.tagMode && state.previewed_tag) return { tag: state.previewed_tag, source: 'previewed' };
  return { tag: null, source: null };
}
```

Every component that asks "what tag is focal?" calls `getFocalTag(state)`. The precedence rule lives in one place. Today's bugs (the `TagTreeLeaf` inconsistency) become impossible.

---

## 3. Direct Mutation of `globalData`

`Tags.js:82`:

```js
var tagMeta = globalData["tags"]["tagIndex"][key_tag];
if (tagMeta !== undefined) tagMeta["tagName"] = key_tag;
```

This **writes to the global data store**. `tagIndex` is meant to be a read-only lookup table populated once at app load. Adding a `tagName` property to it on every render of `TaggedHeading` means:

- The first time a tag is rendered, `tagMeta.tagName` is undefined.
- Any code that reads `tagMeta.tagName` before that first render gets `undefined`.
- Once rendered, the property persists forever.
- Two tags with the same `tagMeta` object reference (shouldn't happen, but possible with object reuse) would clobber each other.

This is **the same anti-pattern flagged in `architecture-audit-2026.md`** about `globalData` being treated as mutable. Here it's a single line, but it's a single line in a render method, executed every time the tag panel rerenders.

The fix is trivial — pass `key_tag` as a prop into the next component instead of stamping it onto the meta object. The pattern, though, suggests the team has internalized "globalData is mutable" deep enough that future code will keep doing this.

---

## 4. The `openTree()` Effect Fires Every Render

`Tags.js:189`:

```js
useEffect(() => {
  openTree();
});
```

**No deps array.** This effect runs **every time `TagTree` renders**. And `TagTree` is recursive — every node in the tag taxonomy renders its own `TagTree`. For a tree of N tags, every parent state update causes:

- N `TagTree` components to re-render.
- N `useEffect` callbacks to fire.
- Each `openTree()` reads `globalData["tags"]["tagIndex"][...]` and potentially calls `setOpen(true)`.
- Each `setOpen` schedules another render of that subtree.

Today this works because the tags index is shallow (root → ~10 parents → ~100 leaves) and `openTree()` short-circuits when `open === true`. But it's quadratic in the worst case, and it will be much more painful under React 18's strict-mode double-rendering.

`openTree` should run only when one of `state.selected_tag` / `state.showcase_tag` / `state.tagMode` actually changes:

```js
useEffect(() => {
  openTree();
}, [state.selected_tag, state.showcase_tag, state.tagMode, base]);
```

That single change reduces the effect work from O(N × renders) to O(N × meaningful state changes).

---

## 5. The Mount-Only Effect That Calls `setState` With a Stale Closure

`Tags.js:285`:

```js
useEffect(() => {
  app.setState(
    {
      allCollapsed: false,
      selected_tag_block_index: activeBlockIndex.current
    },
    app.setTagBlock(activeBlockIndex.current, state.active_verse_id)
  );
}, []);
```

Three issues stacked:

1. **`setState(..., callback)` takes a function as the second argument**, but `app.setTagBlock(...)` is being **called** (not passed), so its return value (whatever that is) goes in the callback slot. If `setTagBlock` returns a function, that runs as the callback. If it returns `undefined`, the callback slot is `undefined` and React silently ignores it.
2. **`activeBlockIndex.current` is never assigned anywhere in `TagBlocks`**, so it's always `null`. The effect's first argument reduces to `{ allCollapsed: false, selected_tag_block_index: null }`.
3. **`state.active_verse_id` is captured in the closure on mount** and never re-read. If the active verse changes between this component mounting and any later setTagBlock call, the closure has stale data.

These are the kinds of bugs that survive for years because:
- They only manifest in rare timing scenarios.
- The visible app keeps working because other code paths converge on correct state.
- They're invisible to TypeScript (no types) and to ESLint (exhaustive-deps would flag #3 but `CI=false` lets it through).

### What this should look like

```js
useEffect(() => {
  app.setState({
    allCollapsed: false,
    selected_tag_block_index: null
  });
  app.setTagBlock(null, state.active_verse_id);
}, [state.active_verse_id, app]);  // re-fire when the relevant inputs change
```

Or, more correctly, this effect probably shouldn't exist at all — the work it's trying to do (initialize tag-block state when the block view opens) belongs in the action method that opens the block view, not in a render-time effect.

---

## 6. The Hover-Driven Preview System

The preview UI is built entirely on `onMouseEnter` / `onMouseLeave`:

```js
onMouseEnter={() => app.setPreviewedTag(base, true)}
onMouseLeave={() => app.setPreviewedTag(null)}
```

This pattern repeats in `TagTree` (line 213–214), `TagTreeLeaf` (246–247), and `ParentLinks` (138–139).

Problems:

1. **No touch fallback.** Touch screens don't fire `mouseleave` reliably; a tap can leave `previewed_tag` stuck on until something else clears it. (Today the app is mobile-blocked so this is latent, but it's a hard blocker for `responsive-mobile-audit-2026.md`'s recommendations.)
2. **Race conditions on rapid mouse movement.** If the user moves the mouse off-screen fast, `mouseleave` may not fire, leaving a stale preview. Browsers handle this inconsistently.
3. **Three preview entry points, one exit point.** Every leaf, every branch, every parent link sets the preview — but only the corresponding leaf/branch/link clears it. If two preview-enabled elements overlap visually (a parent name inside a branch), `mouseenter` on the inner element fires after `mouseleave` on the outer, which is correct — but `mouseenter` on the outer doesn't fire when the inner unmounts, leaving a possible stale state.

The hover model also bakes in **mouse-only thinking** that shows up everywhere else in the app (47 `:hover` rules in `App.css`), but here it's load-bearing for understanding what the tag system *does*. Replacing it requires designing a new "preview before commit" gesture for touch — the synchronized-vocabulary section of `responsive-mobile-audit-2026.md` already lists this as a hard requirement for mobile.

---

## 7. Non-Transactional State Updates

Several tag actions need to update multiple state fields together but use sequential `setState` calls:

`Tags.js:155–162` (`clickBranch`):

```js
function clickBranch(tag) {
  setOpen((prevOpen) => {
    if (!prevOpen) {
      app.showcaseTag(tag);            // calls App.setState({ showcase_tag: tag, ... })
    } else {
      app.setState({ showcase_tag: null });
    }
    return !prevOpen;                  // sets local state
  });
}
```

Between the `app.setState` and the `setOpen` returning, React can render with mismatched state — the local `open` says "closed" but the global `showcase_tag` is still set, or vice versa. The user can perceive this as a single flicker frame.

`TagBlocks.js:271–276`:

```js
if (classes.indexOf("active") < 0) {
  app.setState({ allCollapsed: false, selected_verse_id: null }, app.setTagBlock(index, verseId));
} else if (count > 1) {
  app.setState(
    { allCollapsed: true, selected_verse_id: null, selected_tag_block_index: null },
    app.checkFloater.bind(app)
  );
}
```

Same `setState(..., callback)` confusion as §5 — `app.setTagBlock(index, verseId)` is being called immediately, not passed as a callback. The intent is unclear: "do A, then B" or "do A and B atomically"?

### What to use

`useReducer` for tag-related state, with action types like `OPEN_BRANCH(tag)` and `SELECT_BLOCK(index, verseId)`. Each action is an atomic transition. The reducer is testable in isolation. The render code becomes "dispatch and re-render."

This is one of the few places in the codebase where Redux/Zustand/Jotai-style external state management would actually be a net simplification, because the tag system has the highest state-field-to-component ratio in the app.

---

## 8. Recursive `<TagTree>` Subscribes to Context at Every Node

```js
export function TagTree({ base }) {
  var globalData = useContext(DataContext);
  // ...
  var childrenComp = children.map((val, key) => {
    return <TagTree key={key} base={val} />;
  });
}
```

Every recursive instance of `<TagTree>` calls `useContext(DataContext)`, `useState(false)`, and `useEffect(...)`. For a tag taxonomy with ~100 tags across ~3 levels, opening the tag panel produces:

- ~100 `useContext` subscriptions
- ~100 `useState` allocations
- ~100 `useEffect` registrations
- On every state change that triggers a re-render, all 100 effects re-fire (because no deps array — see §4)

Today the tag panel opens visibly. On a 2018-era phone this would be noticeable lag. The fix is `React.memo` with custom equality, or hoisting `globalData` access to a single non-recursive parent that passes the relevant slice down through props.

A bigger fix: build the tree as data first, render in one pass without recursion.

---

## 9. `useRef` as Mutable State, Never Written

`Tags.js:267`:

```js
const activeBlockIndex = useRef(null);
```

`activeBlockIndex.current` is **read** in two places (lines 282 and 289), but **never assigned** anywhere in the file. So it's always `null`. The reads pass `null` to `app.setTagBlock(null, ...)` and `setState({ selected_tag_block_index: null })`.

Either:
- This was supposed to be assigned somewhere and the assignment got removed → real bug.
- This was meant to track the active block but was abandoned → dead code.

The presence of an unwritten ref strongly suggests there *was* logic here that got pulled out without removing the ref. That's a code smell worth excavating.

---

## 10. `tagMode` vs `infoOpen`: Two Overlapping Booleans

| State | What it means |
|---|---|
| `tagMode` | User is in tag-browsing mode (entered via `+/-` keyboard cycle or `clearTag(true)`) |
| `infoOpen` | The tag taxonomy panel (full tree view) is open |

These aren't independent — `infoOpen` requires `tagMode` to be true (you can't see the tree if you're not in tag mode), but `tagMode` can be true with `infoOpen` false (the tag is selected and showing verses, but the tree isn't expanded).

The valid states:
- `{ tagMode: false, infoOpen: false }` → no tag involvement
- `{ tagMode: true, infoOpen: false }` → tag selected, verses showing
- `{ tagMode: true, infoOpen: true }` → tag tree expanded for browsing

Forbidden combinations:
- `{ tagMode: false, infoOpen: true }` → "tree open but not in tag mode" — what does that mean?

The codebase doesn't explicitly disallow the forbidden combination. It happens to never occur in practice because every code path that sets `infoOpen: true` also sets `tagMode: true`. But there's nothing stopping a future developer from setting `infoOpen` alone and producing UI in an undefined state.

A single `tagPanel: 'closed' | 'verses' | 'tree'` enum field eliminates this entire category of bug.

---

## 11. State Field Reduction Proposal

If you wanted to refactor the tag state to be defensible, here is the smallest meaningful change:

### Today (10+ fields)

```
selected_tag, showcase_tag, previewed_tag,
selected_tag_block_index,
highlighted_tagged_verse_range, highlighted_tagged_parent_verse_range,
tagMode, infoOpen, allCollapsed,
chiasm_letter
```

### Proposed (6 fields)

```js
tag: {
  focal: null | { name: string, source: 'committed' | 'showcase' | 'preview' },
  blockIndex: null | number,
  panel: 'closed' | 'verses' | 'tree',
  blocksCollapsed: boolean,
}
chiasmLetter: null | string
// derived (computed in selector, not stored): focalTagHighlightedVerses, focalTagParentHighlightedVerses
```

Wins:
- Three "focal tag" fields become one tagged union with explicit source.
- The `tagMode`/`infoOpen` overlap becomes one enum.
- Highlighted-verse ranges become *derived state*, recomputed from the focal tag — they can never drift out of sync because they're not stored, they're computed.
- The valid-combinations matrix shrinks from 10! permutations to ~4 meaningful states.

This is a 2–3 day refactor with no visible behavioral changes if done right.

---

## 12. Sequencing — Lowest-Risk Wins

If a full refactor is too much, here are the highest-value targeted fixes in order:

1. **Fix the globalData mutation at `Tags.js:82`.** 5 minutes. Pass `key_tag` as a prop or destructure it locally. Eliminates one cross-render data-corruption risk.
2. **Add deps array to the `openTree()` effect at `Tags.js:189`.** 10 minutes. Reduces effect work by ~100×.
3. **Fix the stale-closure `useEffect` at `Tags.js:285`.** 30 minutes. Replace the `setState(callback)` misuse with an explicit chain.
4. **Investigate and remove the dead `activeBlockIndex` ref.** 1 hour to trace history; delete if confirmed unused.
5. **Add a `getFocalTag(state)` selector** and call it from the 4 places that hand-code the waterfall today. 1 hour. Future-proofs against precedence drift.
6. **Replace `tagMode`/`infoOpen` with a single `tagPanel` enum.** 2 hours including all readers.
7. **Replace `previewed_tag` hover system with long-press preview** (when mobile work begins; see `responsive-mobile-audit-2026.md`).
8. **Memoize `<TagTree>` recursion** with `React.memo`. 1–2 hours. Makes the tag panel feel snappier on lower-end devices.

After 1–4 (~2 hours) the most acute correctness risks are gone. After 5–8 (~half a day more) the state model is defensible.

---

## 13. What NOT to Do

- **Don't add more boolean state fields.** The proliferation of `tagMode`/`infoOpen`/`allCollapsed` is what made the system hard to reason about; another flag won't help.
- **Don't store derived state.** `highlighted_tagged_verse_range` is computable from `selected_tag` — keeping both stored means they can drift apart. Derive it in render or a selector.
- **Don't make `setState` calls cosmetically "atomic" by passing complex callbacks.** That's how `Tags.js:285` ended up calling a method in the callback slot. Either dispatch a reducer action or chain `setState`s explicitly.
- **Don't add preview interactions before fixing the hover-only assumption.** Every new `onMouseEnter` adds a touch-mode regression.
- **Don't mutate `globalData`.** This audit found one occurrence; the architecture audit found more. Treat it as immutable even though JavaScript doesn't enforce it.

---

## 14. Conclusion

The tag system is the most visually impressive feature in the app — it ties the structural framework, the outline, the verse, and the prose into a single coordinated highlight chord, exactly as `responsive-mobile-audit-2026.md` describes. It also has the highest state-field-to-functionality ratio in the codebase, and the state model has accreted over years without a unifying simplification pass.

Nothing here is broken in production, today. The risks are:

- **Future correctness** — the next person to add a tag-related feature has to internalize all 10 fields plus the implicit precedence rules.
- **Performance** — the recursive `<TagTree>` with no memoization and effects without deps arrays will scale badly to richer taxonomies or slower devices.
- **Mobility** — the hover-only preview model has no touch path, blocking the mobile audit's recommended second-app pattern.

The cheapest wins (sections 1–4 of §12) take half a day and remove the most acute issues. The full refactor (§11) is a 2–3 day investment that pays back the moment the next tag feature gets requested.
