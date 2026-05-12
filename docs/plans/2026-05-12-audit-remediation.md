# Audit Remediation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Resolve the concrete issues called out in `docs/audits/scrolling-audit-2026.md`, `docs/audits/tag-tree-state-audit-2026.md`, and `docs/audits/audio-heading-audit-2026.md`, in lowest-risk-first order across four phases.

**Architecture:** Four independent phases, each independently shippable. Phase A is pure surface tweaks (CSS + JSX element changes). Phase B replaces the custom JS scrolling with native primitives. Phase C consolidates two state-model proliferations into small enums and pure selectors. Phase D ships the audio split-button redesign and tag-tree memoization. No phase blocks the next; each ships as one or more commits.

**Tech Stack:** React 16.14 (class components for App.js; function components elsewhere), React Router v6 (HashRouter wrapped at index.js — actually BrowserRouter post-migration), CRA 3 + react-scripts, plain CSS (App.css), Jest via CRA test runner. Build: `npm run build`. Tests: `CI=true npm test -- --watchAll=false`.

---

## Conventions Used in This Plan

- **File paths are absolute** to avoid cwd ambiguity.
- **Tests** go in `src/**/__tests__/` or beside the file as `*.test.js`. The existing example is `src/routing/routeCodec.test.js`.
- **Each task ends with a commit.** Conventional commit format: `feat:`, `fix:`, `refactor:`, `style:`, `test:`, `chore:`.
- **Build verification:** every task that touches `.js`/`.jsx`/`.css` ends with `CI=false NODE_OPTIONS=--openssl-legacy-provider node_modules/.bin/react-scripts build` and expects an exit code 0.
- **No new dependencies** for Phases A–C. Phase D D2 adds `React.memo` (already in React 16) — still no new packages.
- **Pre-existing ESLint warnings** in `Search.js`, `Tags.js`, `Passage.js`, etc. are *not* this plan's job. Use `CI=false` so they don't fail the build. Only fix lint errors I introduce.

---

## Phase A — Cheap Wins (target: 1–2 hours total)

Goal: stop the most visibly-broken behavior and the most acute correctness risks. Every task here is < 30 min and independently shippable. Net result after Phase A: the audio toolbar no longer truncates mid-word, the tag panel no longer mutates `globalData`, and three classes of stale-closure / no-deps-array bugs are gone.

### Task A1: Stop mid-word truncation in `#audio_heading`

**Files:**
- Modify: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/App.css` (around line 3056)

**Step 1: Locate the offending declaration**

Run: `grep -nE "#audio_heading div" /Users/kckern/Documents/GitHub/IsaiahExplorer/src/App.css | head -5`
Expected: prints the line numbers of the `#audio_heading div { … }` rule, including the line containing `word-break: break-all;`.

**Step 2: Replace `word-break: break-all` with ellipsis truncation**

Apply this edit in App.css (in the `#audio_heading div { … }` rule):

```css
/* before: */
word-break: break-all;

/* after: */
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
```

Also remove the now-redundant `line-height: 20px;` declaration if it appears twice in the block.

**Step 3: Run build**

Run: `cd /Users/kckern/Documents/GitHub/IsaiahExplorer && CI=false NODE_OPTIONS=--openssl-legacy-provider node_modules/.bin/react-scripts build 2>&1 | tail -5`
Expected: ends with "The build folder is ready to be deployed."

**Step 4: Manually verify visually**

Run: `npm start` in another terminal, navigate to a verse, observe the audio toolbar. Labels should end with `…` instead of mid-word cutoff. The `1×` pill in playing-state should still appear and the row should remain in one line.

**Step 5: Commit**

```bash
cd /Users/kckern/Documents/GitHub/IsaiahExplorer
git add src/App.css
git commit -m "style: replace word-break:break-all with ellipsis truncation in audio toolbar"
```

---

### Task A2: Reserve playback-rate pill space when idle

**Files:**
- Modify: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/Components/Verse.js` (around line 167)
- Modify: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/App.css` (the `#audio_heading button` rule)

**Step 1: Find the current conditional render**

Run: `grep -nE "audioState === \"playing\" \?" /Users/kckern/Documents/GitHub/IsaiahExplorer/src/Components/Verse.js | head -3`
Expected: prints the line with `let button = state.audioState === "playing" ? <button onClick=...`

**Step 2: Render the rate pill unconditionally, dim it when idle**

In `Verse.js`, replace:

```js
let button = state.audioState === "playing" ? <button onClick={cyclePlaybackRate}>{rateLabel}</button> : null;
```

with:

```js
let isPlaying = state.audioState === "playing";
let button = (
  <button
    type="button"
    onClick={cyclePlaybackRate}
    aria-label={"Playback speed: " + rateLabel + (isPlaying ? "" : " (audio not playing)")}
    className={isPlaying ? "rate-pill" : "rate-pill rate-pill--idle"}
  >{rateLabel}</button>
);
```

**Step 3: Add dim-when-idle styling**

In `App.css`, find `#audio_heading button { … }` and append (after the closing brace):

```css
#audio_heading button.rate-pill--idle {
    opacity: 0.35;
    cursor: pointer;
}
```

**Step 4: Run build**

Run: `cd /Users/kckern/Documents/GitHub/IsaiahExplorer && CI=false NODE_OPTIONS=--openssl-legacy-provider node_modules/.bin/react-scripts build 2>&1 | tail -5`
Expected: build succeeds.

**Step 5: Manually verify**

In a browser, observe: the rate pill is visible at all times. Idle state shows dimmed `1×`. Clicking cycles even when idle (the rate change applies the next time audio plays). Layout no longer shifts when transitioning from idle → playing.

**Step 6: Commit**

```bash
git add src/Components/Verse.js src/App.css
git commit -m "fix(audio): render playback-rate pill always; dim when idle (no layout shift)"
```

---

### Task A3: Convert `<div onClick>` audio buttons to real `<button>`s

**Files:**
- Modify: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/Components/Verse.js` (the `AudioVerse`, `AudioCommentary`, and `Read Commentaries` div around lines 95–98 and the returns of `AudioVerse` and `AudioCommentary`)
- Modify: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/App.css` (the `#audio_heading div` rule needs to also apply to `#audio_heading button`)

**Step 1: Replace divs with buttons in `AudioVerse`**

In `Verse.js`, change the return of `AudioVerse` from:

```js
return <><div className={classes.join(" ")} onClick={handleClick} id="audio_verse"><img alt="Play Audio" src={icon} /> {text}</div>{button}</>;
```

to:

```js
let isDisabled = globalData.meta.version[state.version].audio !== 1 && state.hebrewMode === false;
return <>
  <button
    type="button"
    className={classes.join(" ")}
    onClick={handleClick}
    disabled={isDisabled}
    id="audio_verse"
  ><img alt="Play Audio" src={icon} /> {text}</button>
  {button}
</>;
```

(Drop the `.noaudio` `cursor: not-allowed` workaround at App.css ~3173 — `<button disabled>` provides it natively.)

**Step 2: Replace divs with buttons in `AudioCommentary`**

In `Verse.js`, change the return of `AudioCommentary` from:

```js
return <div className={classes.join(" ")} id="audio_commentary" onClick={handleClick}><img alt="Audio Commentary" src={icon} /> {text} <img onClick={handleOptions} alt="Select" id="com_option" src={sprocket_icon} /></div>;
```

to:

```js
return <button
  type="button"
  className={classes.join(" ")}
  id="audio_commentary"
  onClick={handleClick}
><img alt="Audio Commentary" src={icon} /> {text} <img onClick={(e) => { e.stopPropagation(); handleOptions(); }} alt="Select audio source" id="com_option" src={sprocket_icon} /></button>;
```

Note: `e.stopPropagation()` prevents the parent button's onClick from also firing — replaces the fragile `if (e.target.id !== "audio_commentary") return false;` guard, which we can now remove from `handleClick`.

**Step 3: Remove the brittle guard in `handleClick`**

In `Verse.js` `AudioCommentary.handleClick`, delete the line:
```js
if (e.target.id !== "audio_commentary") return false;
```

**Step 4: Replace the `Read Commentaries` div**

In `Verse.js` line 98 (inside the `audio_heading` JSX in the parent `VerseHeading` function), change:

```js
<div id="commentary" onClick={() => app.setState(...)}><img alt="Commentary" src={comment_icon} /> {readhide}</div>
```

to:

```js
<button type="button" id="commentary" onClick={() => app.setState(...)}><img alt="Commentary" src={comment_icon} /> {readhide}</button>
```

**Step 5: Apply existing div styling to buttons**

In `App.css`, find the rule:
```css
#audio_heading div { … }
```
and change the selector to:
```css
#audio_heading div,
#audio_heading > button { … }
```

Do the same for the hover/active rules:
```css
/* before */
#audio_heading div:hover,
#audio_heading div.active_audio

/* after */
#audio_heading div:hover,
#audio_heading > button:hover,
#audio_heading div.active_audio,
#audio_heading > button.active_audio
```

And for `.noaudio`:
```css
/* before */
#audio_heading div#audio_verse.noaudio,
#audio_heading div#audio_verse.noaudio:hover

/* after */
#audio_heading button#audio_verse[disabled],
#audio_heading button#audio_verse[disabled]:hover
```

**Step 6: Add `:focus-visible` styling**

Append to `App.css` (anywhere in the `#audio_heading` section):

```css
#audio_heading > button:focus-visible {
    outline: 2px solid #4a90e2;
    outline-offset: 2px;
}
```

**Step 7: Run build**

Run: `cd /Users/kckern/Documents/GitHub/IsaiahExplorer && CI=false NODE_OPTIONS=--openssl-legacy-provider node_modules/.bin/react-scripts build 2>&1 | tail -5`
Expected: build succeeds.

**Step 8: Manually verify**

- Tab through the audio toolbar with keyboard. Each button should receive focus visibly (blue outline).
- Enter/Space on a focused button should fire its action.
- Disabled state (a version without audio): button is greyed and unclickable.

**Step 9: Commit**

```bash
git add src/Components/Verse.js src/App.css
git commit -m "fix(audio): convert audio-toolbar div+onClick to button + add focus-visible"
```

---

### Task A4: Fix the `globalData` mutation at `Tags.js:82`

**Files:**
- Modify: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/Components/Tags.js` (around line 82)

**Step 1: Locate the mutation**

Run: `grep -n "tagMeta\[" /Users/kckern/Documents/GitHub/IsaiahExplorer/src/Components/Tags.js`
Expected: prints a line like `if (tagMeta !== undefined) tagMeta["tagName"] = key_tag;`

**Step 2: Replace global mutation with a local variable**

In `Tags.js`, change:

```js
var tagMeta = globalData["tags"]["tagIndex"][key_tag];
if (tagMeta !== undefined) tagMeta["tagName"] = key_tag;
```

to:

```js
var rawTagMeta = globalData["tags"]["tagIndex"][key_tag];
var tagMeta = rawTagMeta !== undefined
  ? Object.assign({}, rawTagMeta, { tagName: key_tag })
  : undefined;
```

This creates a shallow copy with `tagName` set, instead of mutating the canonical tagIndex object in place. All downstream readers of `tagMeta.tagName` get the same value as before.

**Step 3: Search for downstream readers of tagMeta**

Run: `grep -n "tagMeta\.tagName\|tagMeta\[\"tagName\"\]" /Users/kckern/Documents/GitHub/IsaiahExplorer/src/Components/Tags.js`
Expected: identifies any places that read `tagMeta.tagName`. Confirm they all receive the same value (they will, because the local copy carries it).

**Step 4: Run build**

Run: `cd /Users/kckern/Documents/GitHub/IsaiahExplorer && CI=false NODE_OPTIONS=--openssl-legacy-provider node_modules/.bin/react-scripts build 2>&1 | tail -5`
Expected: build succeeds.

**Step 5: Manually verify**

In a browser, open a tag (e.g., "Servant Song"). Tag panel should render exactly as before. Open browser DevTools, in the console run:
```js
window.globalData.tags.tagIndex["Servant Song"].tagName
```
Before this fix this would have returned `"Servant Song"` (mutated). After the fix it should return `undefined` (canonical, unmodified).

**Step 6: Commit**

```bash
git add src/Components/Tags.js
git commit -m "fix(tags): stop mutating globalData.tags.tagIndex in TaggedHeading render"
```

---

### Task A5: Add deps array to `openTree()` effect in `TagTree`

**Files:**
- Modify: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/Components/Tags.js` (around line 189)

**Step 1: Locate the effect**

Run: `grep -n "openTree" /Users/kckern/Documents/GitHub/IsaiahExplorer/src/Components/Tags.js`
Expected: prints lines including `openTree()` and the `useEffect(() => { openTree(); })` block.

**Step 2: Add deps array**

In `Tags.js`, change:

```js
useEffect(() => {
    openTree();
});
```

to:

```js
useEffect(() => {
    openTree();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- openTree closes over base; the relevant changes are tracked below
}, [state.selected_tag, state.showcase_tag, state.tagMode, base]);
```

(The eslint-disable is required because `openTree` itself isn't in deps; declaring its closures explicitly via the four named state fields gives us correct re-fire behavior without the noise of declaring `openTree` as a dep and wrapping it in `useCallback`.)

**Step 3: Run build**

Run: `cd /Users/kckern/Documents/GitHub/IsaiahExplorer && CI=false NODE_OPTIONS=--openssl-legacy-provider node_modules/.bin/react-scripts build 2>&1 | tail -5`
Expected: build succeeds.

**Step 4: Manually verify**

In a browser, open the tag panel. Click around to open different tag branches. The tree should expand to show the selected/showcased tag, the same as before. Open React DevTools → Profiler, record opening one branch, then verify: re-renders happen only on actual state change, not on every parent render.

**Step 5: Commit**

```bash
git add src/Components/Tags.js
git commit -m "perf(tags): scope openTree() effect to its real deps (was firing every render)"
```

---

### Task A6: Fix the stale-closure `useEffect` at `Tags.js:285`

**Files:**
- Modify: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/Components/Tags.js` (around line 285)

**Step 1: Locate the effect**

Run: `grep -n "allCollapsed: false," /Users/kckern/Documents/GitHub/IsaiahExplorer/src/Components/Tags.js`
Expected: finds the `useEffect` block in `TagBlocks` that calls `app.setState({allCollapsed: false, …}, app.setTagBlock(...))`.

**Step 2: Read the surrounding ~20 lines**

Use the Read tool to see lines 263–295 of `Tags.js`. Confirm: `useRef(null)` for `activeBlockIndex`, never assigned elsewhere; the `setState(arg, callback)` slot receives a *return value* of `app.setTagBlock(...)`, not the function reference.

**Step 3: Replace the broken effect**

Change:

```js
const activeBlockIndex = useRef(null);

useEffect(() => {
    var fn = app.checkFloater.bind(app);
    fn({ active_block_index: activeBlockIndex.current });
});

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

to:

```js
useEffect(() => {
    app.checkFloater({ active_block_index: null });
}, [app, state.active_verse_id, state.selected_tag, state.selected_tag_block_index]);

useEffect(() => {
    app.setState({
        allCollapsed: false,
        selected_tag_block_index: null
    });
    app.setTagBlock(null, state.active_verse_id);
    // mount-only initialisation for this tag's block view
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

The `activeBlockIndex` ref is gone (it was always `null`, confirmed by audit §9). The mount-only effect calls `setState` *and* `setTagBlock` as two clear statements, not by misusing the `setState` callback slot.

**Step 4: Run build**

Run: `cd /Users/kckern/Documents/GitHub/IsaiahExplorer && CI=false NODE_OPTIONS=--openssl-legacy-provider node_modules/.bin/react-scripts build 2>&1 | tail -5`
Expected: build succeeds.

**Step 5: Manually verify**

Open the app, click a tag, click around tag blocks, confirm: blocks expand/collapse as before, no behavior change visible, no console warnings about state updates during render.

**Step 6: Commit**

```bash
git add src/Components/Tags.js
git commit -m "fix(tags): replace broken setState(callback) misuse and dead activeBlockIndex ref"
```

---

## Phase B — Replace Custom Scrolling with Native Primitives (target: 3–4 hours)

Goal: delete `scrollBoxTo`, `checkInView`, the `Math.easeInOutQuad` monkey-patch, and the `globalData["timeouts"]` accumulation. Use `element.scrollTo({behavior:'smooth'})` and `Element.scrollIntoView({behavior:'smooth', block:'center'})`. Replace the two `.parentNode.parentNode.parentNode.parentNode.previousSibling.previousSibling` chains with stable class selectors. Honor `prefers-reduced-motion` for free.

Phase B does not depend on Phase A.

### Task B1: Add stable selectors for the two brittle DOM walks

**Files:**
- Modify: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/Components/Tags.js` (where the chiastic/parallel block headings get rendered; the `tr.metaref` rows around lines 488–533)
- Modify: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/App.js` (line 1829, the chain inside `scrollText`)
- Modify: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/Components/Tags.js` (line 442, the second chain inside the `useEffect` that scrolls into view)

**Step 1: Add a `scroll-target` class to the parallel-block heading row**

In `Tags.js`, find the `<tr className="metaref" …>` returns (~lines 490 and 529). Add `data-scroll-target="parallel-heading"` to each `<tr>`:

```js
<tr
  className="metaref"
  data-scroll-target="parallel-heading"
  id={i + "i" + tagstr}
  key={i + "i"}
  onMouseEnter={() => { app.highlightTaggedVerses(verses); app.setActiveVerse(verses[0]); }}
>
```

This gives both the parallel-heading scroll target a stable, intentional selector.

**Step 2: Replace the chain in `App.js:scrollText`**

Find lines 1823–1831 in `App.js`. Change:

```js
if (this.state.selected_tag !== null)
  if (
    globalData["tags"]["tagIndex"][this.state.selected_tag].meta ===
    "parallel"
  ) {
    element =
      element.parentNode.parentNode.parentNode.parentNode.previousSibling
        .previousSibling
  }
```

to:

```js
if (this.state.selected_tag !== null &&
    globalData["tags"]["tagIndex"][this.state.selected_tag].meta === "parallel") {
  var parallelHeading = element.closest("table.parallel")
    && element.closest("table.parallel").querySelector("tr[data-scroll-target=\"parallel-heading\"]");
  if (parallelHeading) element = parallelHeading;
}
```

(This walks UP via `.closest("table.parallel")` then DOWN via `.querySelector`. Both are O(N) but the contract is explicit: "the parallel table's heading row.")

**Step 3: Replace the chain in `Tags.js:442`**

Find the `useEffect` body that walks the parent chain. Change:

```js
textNode
  .querySelectorAll(".versebox_highlighted")[0]
  .parentNode.parentNode.parentNode.parentNode.previousSibling.previousSibling.scrollIntoView();
```

to:

```js
var hl = textNode.querySelectorAll(".versebox_highlighted")[0];
var heading = hl.closest("table.parallel")
  && hl.closest("table.parallel").querySelector("tr[data-scroll-target=\"parallel-heading\"]");
if (heading) heading.scrollIntoView({ behavior: 'smooth', block: 'center' });
```

**Step 4: Run build**

Run: `cd /Users/kckern/Documents/GitHub/IsaiahExplorer && CI=false NODE_OPTIONS=--openssl-legacy-provider node_modules/.bin/react-scripts build 2>&1 | tail -5`
Expected: build succeeds.

**Step 5: Manually verify**

Open a "parallel" tag (e.g., a chiasm or parallel-structure tag). Navigate verses with arrow keys. The parallel-heading rows should scroll into view smoothly the same as before — but now via an explicit selector instead of 6-level DOM walk.

**Step 6: Commit**

```bash
git add src/Components/Tags.js src/App.js
git commit -m "refactor(scroll): replace .parentNode chains with [data-scroll-target] selectors"
```

---

### Task B2: Replace `scrollBoxTo` with native `element.scrollTo`

**Files:**
- Modify: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/App.js` (the `scrollBoxTo` method around lines 2082–2112; all of its call sites: `scrollText`, `scrollOutline`, `scrollTagTree`, `setActiveLetter`)

**Step 1: Delete `scrollBoxTo`**

In `App.js`, locate the method `scrollBoxTo(scope, element, to, duration) { … }` and delete the entire method.

Also delete the `Math.easeInOutQuad` monkey-patch line inside it (which the deletion already removes).

**Step 2: Replace call sites with `element.scrollTo`**

There are 4 call sites:

`App.js:scrollText` (~line 1840):
```js
this.scrollBoxTo("text", container, to, time)
```
becomes:
```js
container.scrollTo({ top: to, behavior: time === 0 ? 'auto' : 'smooth' });
```

`App.js:scrollOutline` (~line 1862):
```js
this.scrollBoxTo("outline", container, to, 200)
```
becomes:
```js
container.scrollTo({ top: to, behavior: 'smooth' });
```

`App.js:scrollTagTree` (~line 1885):
```js
this.scrollBoxTo("tag_meta", container, to, 500)
```
becomes:
```js
container.scrollTo({ top: to, behavior: 'smooth' });
```

`App.js:setActiveLetter` (~line 2076):
```js
this.scrollBoxTo("chiasm", container, to, 200)
```
becomes:
```js
container.scrollTo({ top: to, behavior: 'smooth' });
```

The `if (child > 1000) { container.scrollTop = to; continue; }` short-circuit at ~line 2072 stays as-is (it's an "instant scroll for far-away targets" optimization that pre-exists).

**Step 3: Delete `globalData["timeouts"]` if nothing else uses it**

Run: `grep -nE "globalData\[?\"?timeouts\"?\]?|globalData\.timeouts" /Users/kckern/Documents/GitHub/IsaiahExplorer/src/`
Expected: only finds the declaration in `globals.js`. Remove it from `globals.js`:

```js
// delete this line:
globalData["timeouts"] = {};
```

**Step 4: Run build**

Run: `cd /Users/kckern/Documents/GitHub/IsaiahExplorer && CI=false NODE_OPTIONS=--openssl-legacy-provider node_modules/.bin/react-scripts build 2>&1 | tail -5`
Expected: build succeeds.

**Step 5: Manually verify**

- Click a verse far below the current scroll position — the verse text scrolls smoothly into view.
- Keyboard-step rapidly through 20 verses (down arrow) — no "wobble" or stutter, no piled-up animations.
- Open System Preferences → Accessibility → Display → "Reduce motion". Then click a far verse. The scroll should be instant (native browser respects the OS preference automatically).

**Step 6: Commit**

```bash
git add src/App.js src/globals.js
git commit -m "refactor(scroll): replace custom JS easing with native element.scrollTo({behavior:'smooth'})"
```

---

### Task B3: Replace `checkInView` with `IntersectionObserver` cache

Skip this task if you find Phase B Tasks B1+B2 already deliver acceptable behavior. The `checkInView` method does work — the upgrade is for *performance* (no forced layout) and for *correctness* (the `null` return value bug). Worth doing, but lowest priority in Phase B.

**Files:**
- Modify: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/App.js` (delete `checkInView`, update its 2 callers)

**Step 1: Find callers of `checkInView`**

Run: `grep -n "checkInView" /Users/kckern/Documents/GitHub/IsaiahExplorer/src/App.js`
Expected: declaration at ~line 1888, callers at ~line 1833 and ~line 1856.

**Step 2: Replace `checkInView` with an explicit measurement**

In `App.js`, replace the method `checkInView(container, element, p)` with:

```js
checkInView(container, element) {
  if (!container || !element) return false;
  var cRect = container.getBoundingClientRect();
  var eRect = element.getBoundingClientRect();
  return eRect.top >= cRect.top && eRect.bottom <= cRect.bottom;
}
```

This:
- Returns `false` (not `null`) on bad inputs, fixing the `=== true` short-circuit bug.
- Drops the unused `partial` mode (no callers pass `p === true`).
- Drops the `scrollTop`+`getBoundingClientRect`-and-add math; uses `getBoundingClientRect` directly because the container's own rect already accounts for scroll position.

**Step 3: Update callers (no changes needed)**

The `=== true` checks at lines 1833 and 1856 still work — `true === true` short-circuits when the element is in view.

**Step 4: Run build**

Run: `cd /Users/kckern/Documents/GitHub/IsaiahExplorer && CI=false NODE_OPTIONS=--openssl-legacy-provider node_modules/.bin/react-scripts build 2>&1 | tail -5`
Expected: build succeeds.

**Step 5: Manually verify**

- Click a verse already on screen → no scroll happens (visibility short-circuit works).
- Click an off-screen verse → smooth scroll to it.

**Step 6: Commit**

```bash
git add src/App.js
git commit -m "refactor(scroll): simplify checkInView; return false (not null) on bad inputs"
```

---

### Task B4: Replace `setTimeout(scrollTagTree, 1000)` with `transitionend`

**Files:**
- Modify: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/Components/Tags.js` (around line 73 in `TaggedHeading.openTagMeta`)

**Step 1: Find the timeout**

Run: `grep -n "setTimeout.*scrollTagTree" /Users/kckern/Documents/GitHub/IsaiahExplorer/src/Components/Tags.js`
Expected: prints the one occurrence around line 73.

**Step 2: Replace timeout with transition-completion listener**

In `Tags.js`, change:

```js
app.setState({ infoOpen: true, commentaryMode: false }, function() {
    setTimeout(this.scrollTagTree.bind(this), 1000);
}.bind(app));
```

to:

```js
app.setState({ infoOpen: true, commentaryMode: false }, function() {
    var panel = document.querySelector(".tag_meta");
    if (!panel) return;
    var onDone = function() {
        panel.removeEventListener('transitionend', onDone);
        app.scrollTagTree();
    };
    panel.addEventListener('transitionend', onDone, { once: true });
    // Fallback if no transition fires (e.g. user has prefers-reduced-motion)
    setTimeout(onDone, 600);
}.bind(app));
```

The 600ms fallback covers the case where no transition fires (instant CSS or reduced-motion). The transition typically completes in ~400ms.

**Step 3: Run build**

Run: `cd /Users/kckern/Documents/GitHub/IsaiahExplorer && CI=false NODE_OPTIONS=--openssl-legacy-provider node_modules/.bin/react-scripts build 2>&1 | tail -5`
Expected: build succeeds.

**Step 4: Manually verify**

Click a tag's "info" icon to open the tag tree panel. The panel should expand, then the tree should scroll to the active branch — and noticeably *sooner* than before (~400ms vs ~1000ms).

**Step 5: Commit**

```bash
git add src/Components/Tags.js
git commit -m "refactor(scroll): wait for transitionend instead of setTimeout(1000) for tag-panel scroll"
```

---

## Phase C — State Model Consolidation (target: 4–6 hours)

Goal: replace the three-field "focal tag" precedence waterfall with one selector function, collapse `tagMode`/`infoOpen` into one enum field, and collapse the 12 audio state fields into a 5-field model. Pure-function selectors get Jest tests.

Phase C does not depend on Phase A or B.

### Task C1: Add `getFocalTag(state)` selector with tests

**Files:**
- Create: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/state/tagSelectors.js`
- Create: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/state/tagSelectors.test.js`

**Step 1: Write the failing tests**

Create `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/state/tagSelectors.test.js`:

```js
import { getFocalTag } from './tagSelectors';

describe('getFocalTag', () => {
  test('returns null tag when nothing is selected', () => {
    expect(getFocalTag({ selected_tag: null, showcase_tag: null, previewed_tag: null, tagMode: false }))
      .toEqual({ tag: null, source: null });
  });

  test('returns selected_tag with source=committed', () => {
    expect(getFocalTag({ selected_tag: 'Servant Song', showcase_tag: null, previewed_tag: null, tagMode: false }))
      .toEqual({ tag: 'Servant Song', source: 'committed' });
  });

  test('showcase_tag overrides selected_tag', () => {
    expect(getFocalTag({ selected_tag: 'Servant Song', showcase_tag: 'Vineyard', previewed_tag: null, tagMode: false }))
      .toEqual({ tag: 'Vineyard', source: 'showcase' });
  });

  test('previewed_tag wins in tagMode only when nothing else is set', () => {
    expect(getFocalTag({ selected_tag: null, showcase_tag: null, previewed_tag: 'Hope', tagMode: true }))
      .toEqual({ tag: 'Hope', source: 'previewed' });
  });

  test('previewed_tag ignored when tagMode is false', () => {
    expect(getFocalTag({ selected_tag: null, showcase_tag: null, previewed_tag: 'Hope', tagMode: false }))
      .toEqual({ tag: null, source: null });
  });

  test('previewed_tag ignored when selected_tag exists', () => {
    expect(getFocalTag({ selected_tag: 'Servant Song', showcase_tag: null, previewed_tag: 'Hope', tagMode: true }))
      .toEqual({ tag: 'Servant Song', source: 'committed' });
  });
});
```

**Step 2: Run the tests; verify they fail**

Run: `cd /Users/kckern/Documents/GitHub/IsaiahExplorer && CI=true npm test -- --testPathPattern=tagSelectors --watchAll=false 2>&1 | tail -10`
Expected: FAIL — module `./tagSelectors` not found.

**Step 3: Create the selector**

Create `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/state/tagSelectors.js`:

```js
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
```

**Step 4: Run the tests; verify they pass**

Run: `cd /Users/kckern/Documents/GitHub/IsaiahExplorer && CI=true npm test -- --testPathPattern=tagSelectors --watchAll=false 2>&1 | tail -10`
Expected: 6 tests pass.

**Step 5: Replace the four hand-coded precedence waterfalls**

Search for the current open-coded waterfalls:

Run: `grep -nE "showcase_tag.*selected_tag|state\.showcase_tag \|\| state\.selected_tag" /Users/kckern/Documents/GitHub/IsaiahExplorer/src/`

Replace each with a call to `getFocalTag`:

`Tags.js:77–79` (in `TaggedHeading`):
```js
// before
var key_tag = state.selected_tag;
if (state.showcase_tag !== null) key_tag = state.showcase_tag;
if (state.tagMode && key_tag === null) key_tag = state.previewed_tag;

// after
import { getFocalTag } from '../state/tagSelectors';
// ...
var key_tag = getFocalTag(state).tag;
```

`App.js:getSeoData` (~line 341):
```js
// before
var activeTag = this.state.showcase_tag || this.state.selected_tag || null;

// after
import { getFocalTag } from './state/tagSelectors';
// ...
var activeTag = getFocalTag(this.state).tag;
```

`App.js:setUrl` (~line 407): same replacement.

`Tags.js:TagTreeLeaf` (lines 239–240): keep both highlights but use a single source-of-truth:
```js
// before
if (tag === state.selected_tag) classes.push("highlight");
if (tag === state.showcase_tag) classes.push("highlight");

// after
if (tag === getFocalTag(state).tag) classes.push("highlight");
```

**Step 6: Run build + tests**

Run:
```
cd /Users/kckern/Documents/GitHub/IsaiahExplorer && \
  CI=true npm test -- --watchAll=false 2>&1 | tail -10 && \
  CI=false NODE_OPTIONS=--openssl-legacy-provider node_modules/.bin/react-scripts build 2>&1 | tail -5
```
Expected: tests pass; build succeeds.

**Step 7: Commit**

```bash
git add src/state/tagSelectors.js src/state/tagSelectors.test.js src/Components/Tags.js src/App.js
git commit -m "refactor(tags): introduce getFocalTag() selector; replace 4 open-coded precedence waterfalls"
```

---

### Task C2: Replace `tagMode` + `infoOpen` with a `tagPanel` enum

**Files:**
- Modify: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/App.js` (the `state = { … }` initializer ~line 43, plus every reader/writer of `tagMode` and `infoOpen`)
- Modify: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/Components/Tags.js`
- Create: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/state/tagPanel.js` (the enum + transition helpers)
- Create: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/state/tagPanel.test.js`

**Step 1: Catalogue every reader/writer**

Run: `grep -nE "tagMode|infoOpen" /Users/kckern/Documents/GitHub/IsaiahExplorer/src/`
Expected: ~30–40 hits across `App.js`, `Tags.js`, and a few other components.

Write the list down. You'll touch each one.

**Step 2: Write the enum + tests**

Create `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/state/tagPanel.test.js`:

```js
import { TAG_PANEL, derivedTagMode, derivedInfoOpen } from './tagPanel';

describe('tagPanel enum', () => {
  test('enum values are stable', () => {
    expect(TAG_PANEL.CLOSED).toBe('closed');
    expect(TAG_PANEL.VERSES).toBe('verses');
    expect(TAG_PANEL.TREE).toBe('tree');
  });

  test('derivedTagMode: tagMode is true in verses or tree, false in closed', () => {
    expect(derivedTagMode(TAG_PANEL.CLOSED)).toBe(false);
    expect(derivedTagMode(TAG_PANEL.VERSES)).toBe(true);
    expect(derivedTagMode(TAG_PANEL.TREE)).toBe(true);
  });

  test('derivedInfoOpen: infoOpen is true only in tree', () => {
    expect(derivedInfoOpen(TAG_PANEL.CLOSED)).toBe(false);
    expect(derivedInfoOpen(TAG_PANEL.VERSES)).toBe(false);
    expect(derivedInfoOpen(TAG_PANEL.TREE)).toBe(true);
  });
});
```

Run the tests; verify they fail (module not found).

**Step 3: Create the enum**

Create `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/state/tagPanel.js`:

```js
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
```

Run the tests; verify they pass.

**Step 4: Add `tagPanel` to App state and keep old fields as a temporary bridge**

In `App.js`, near the state initializer (~line 43), add:

```js
import { TAG_PANEL, derivedTagMode, derivedInfoOpen } from './state/tagPanel';
// ...
// inside state = { … }:
tagPanel: TAG_PANEL.CLOSED,
// keep old fields for now — they shadow the enum until callers migrate
tagMode: false,
infoOpen: false,
```

**Step 5: Add a single setter that updates all three fields together**

In `App.js`, add a method:

```js
setTagPanel(panel) {
  this.setState({
    tagPanel: panel,
    tagMode: derivedTagMode(panel),
    infoOpen: derivedInfoOpen(panel),
  });
}
```

**Step 6: Replace every `setState({tagMode: …, infoOpen: …})` with `setTagPanel`**

Find every `setState` call that touches `tagMode` or `infoOpen`. For each, decide which `TAG_PANEL` value matches the boolean combination, and replace with `this.setTagPanel(…)` (or `app.setTagPanel(…)` from components).

Concrete examples:

`App.js:993` (or wherever — find via grep):
```js
// before
this.setState({ infoOpen: false, tagMode: false })

// after
this.setTagPanel(TAG_PANEL.CLOSED)
```

`Tags.js:72–74`:
```js
// before
app.setState({ infoOpen: true, commentaryMode: false }, function() { … });

// after
app.setTagPanel(TAG_PANEL.TREE);
app.setState({ commentaryMode: false }, function() { … });
```

(Two setStates is fine — React batches them in event handlers.)

`Tags.js:2274`:
```js
// before
this.setState({infoOpen: false})

// after — figure out from context: are we exiting tag mode entirely or just collapsing the tree?
// In the context of "after picking a tag to view its verses", you want VERSES, not CLOSED.
this.setTagPanel(TAG_PANEL.VERSES)
```

Take each replacement carefully — the audit's §10 warns that the boolean overlap encodes implicit precedence rules. Use the file-by-file map you built in Step 1.

**Step 7: Replace every read of `state.tagMode` and `state.infoOpen`**

For now, leave them as-is. They are still kept in state by `setTagPanel`. The reader migration can be a *separate* commit if it makes review easier:

```js
// before (read)
if (this.state.tagMode) …
if (this.state.infoOpen) …

// after (read)
if (this.state.tagPanel !== TAG_PANEL.CLOSED) …
if (this.state.tagPanel === TAG_PANEL.TREE) …
```

Optionally split this into Task C2b if it grows long.

**Step 8: Run tests + build**

```
cd /Users/kckern/Documents/GitHub/IsaiahExplorer && \
  CI=true npm test -- --watchAll=false 2>&1 | tail -10 && \
  CI=false NODE_OPTIONS=--openssl-legacy-provider node_modules/.bin/react-scripts build 2>&1 | tail -5
```
Expected: tests pass; build succeeds.

**Step 9: Manually verify**

- Open the app, open a tag → verses shown (was: tagMode true, infoOpen false → now: tagPanel="verses").
- Click the info button → tree shows (was: tagMode true, infoOpen true → now: tagPanel="tree").
- Click outside or use Escape (whatever closes it today) → all closed (tagPanel="closed").
- Verify no console warnings about state-update races.

**Step 10: Commit**

```bash
git add src/state/tagPanel.js src/state/tagPanel.test.js src/App.js src/Components/Tags.js
git commit -m "refactor(tags): introduce tagPanel enum; keep tagMode/infoOpen as derived bridge"
```

---

### Task C3: Collapse audio state into a 5-field model

**Files:**
- Modify: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/App.js` (state initializer, plus every audio-related state update)
- Modify: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/Components/Audio.js`
- Modify: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/Components/Verse.js`
- Create: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/state/audioState.js`
- Create: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/state/audioState.test.js`

**Note:** This task is the largest in Phase C. It's safe to defer until after the Phase D Task D1 (split-button) which redesigns the toolbar — both Tasks together compose the full audio rewrite proposed in the audit. Recommended order: D1 first (visible win), then C3 (deeper plumbing).

**Step 1: Define the AUDIO_MODE enum + transition helpers + tests**

Create `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/state/audioState.test.js`:

```js
import { AUDIO_MODE, isPlaying, isLoading, isVerseMode, isCommentaryMode } from './audioState';

describe('audio state predicates', () => {
  test('AUDIO_MODE values are stable', () => {
    expect(AUDIO_MODE.IDLE).toBe('idle');
    expect(AUDIO_MODE.VERSE_LOADING).toBe('verse-loading');
    expect(AUDIO_MODE.VERSE_PLAYING).toBe('verse-playing');
    expect(AUDIO_MODE.COMMENTARY_LOADING).toBe('commentary-loading');
    expect(AUDIO_MODE.COMMENTARY_PLAYING).toBe('commentary-playing');
  });

  test('isPlaying matches both playing modes', () => {
    expect(isPlaying(AUDIO_MODE.VERSE_PLAYING)).toBe(true);
    expect(isPlaying(AUDIO_MODE.COMMENTARY_PLAYING)).toBe(true);
    expect(isPlaying(AUDIO_MODE.VERSE_LOADING)).toBe(false);
    expect(isPlaying(AUDIO_MODE.IDLE)).toBe(false);
  });

  test('isLoading matches both loading modes', () => {
    expect(isLoading(AUDIO_MODE.VERSE_LOADING)).toBe(true);
    expect(isLoading(AUDIO_MODE.COMMENTARY_LOADING)).toBe(true);
    expect(isLoading(AUDIO_MODE.VERSE_PLAYING)).toBe(false);
  });

  test('isVerseMode / isCommentaryMode disambiguate', () => {
    expect(isVerseMode(AUDIO_MODE.VERSE_PLAYING)).toBe(true);
    expect(isVerseMode(AUDIO_MODE.COMMENTARY_PLAYING)).toBe(false);
    expect(isCommentaryMode(AUDIO_MODE.COMMENTARY_LOADING)).toBe(true);
    expect(isCommentaryMode(AUDIO_MODE.VERSE_LOADING)).toBe(false);
  });
});
```

Run tests; verify fail.

**Step 2: Create the module**

Create `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/state/audioState.js`:

```js
/**
 * Audio mode enum + predicates.
 *
 * Replaces the pair of booleans (state.audioState ∈ {null,"loading","playing"}
 * × state.commentaryAudioMode ∈ {true,false}) which had 6 combinations but
 * only 5 valid ones, and where the meaning of "loading" depended on the
 * second boolean.
 */
export const AUDIO_MODE = {
  IDLE: 'idle',
  VERSE_LOADING: 'verse-loading',
  VERSE_PLAYING: 'verse-playing',
  COMMENTARY_LOADING: 'commentary-loading',
  COMMENTARY_PLAYING: 'commentary-playing',
};

export function isPlaying(mode) {
  return mode === AUDIO_MODE.VERSE_PLAYING || mode === AUDIO_MODE.COMMENTARY_PLAYING;
}

export function isLoading(mode) {
  return mode === AUDIO_MODE.VERSE_LOADING || mode === AUDIO_MODE.COMMENTARY_LOADING;
}

export function isVerseMode(mode) {
  return mode === AUDIO_MODE.VERSE_LOADING || mode === AUDIO_MODE.VERSE_PLAYING;
}

export function isCommentaryMode(mode) {
  return mode === AUDIO_MODE.COMMENTARY_LOADING || mode === AUDIO_MODE.COMMENTARY_PLAYING;
}

// Bridge accessors for transitional migration: derived legacy fields.
export function legacyAudioState(mode) {
  if (isLoading(mode)) return 'loading';
  if (isPlaying(mode)) return 'playing';
  return null;
}

export function legacyCommentaryAudioMode(mode) {
  return isCommentaryMode(mode);
}
```

Run tests; verify pass.

**Step 3: Add `audioMode` to App state and a single setter**

In `App.js`, near state init:

```js
import { AUDIO_MODE, legacyAudioState, legacyCommentaryAudioMode } from './state/audioState';
// inside state:
audioMode: AUDIO_MODE.IDLE,
// (keep legacy fields audioState, commentaryAudioMode for now)
```

Add method:

```js
setAudioMode(mode) {
  this.setState({
    audioMode: mode,
    audioState: legacyAudioState(mode),
    commentaryAudioMode: legacyCommentaryAudioMode(mode),
  });
}
```

**Step 4: Replace every `setState({audioState: …, commentaryAudioMode: …})` with `setAudioMode(…)`**

In `Verse.js`, `startPlaying` (line 112 for AudioVerse):

```js
// before
function startPlaying() {
  app.setState({
    audioState: "loading",
    audioPointer: 0,
    selected_verse_id: null,
    commentary_audio_verse_range: [],
    commentaryAudioMode: false
  }, app.setUrl.bind(app));
}

// after
function startPlaying() {
  app.setAudioMode(AUDIO_MODE.VERSE_LOADING);
  app.setState({
    audioPointer: 0,
    selected_verse_id: null,
    commentary_audio_verse_range: [],
  }, app.setUrl.bind(app));
}
```

In `Verse.js` `AudioVerse.handleClick`:

```js
// before
if (state.audioState !== null) {
  app.setState({ audioState: null }, function() { … });
}

// after
if (isPlaying(state.audioMode) || isLoading(state.audioMode)) {
  app.setAudioMode(AUDIO_MODE.IDLE);
  // then chain whatever was inside the callback
}
```

In `Verse.js` `AudioCommentary.startPlaying` (line 177):

```js
// before
function startPlaying(shortcode) {
  app.setState({
    audioState: "loading",
    audioPointer: 0,
    tagMode: false,
    commentaryAudio: shortcode,
    commentaryAudioMode: true
  });
}

// after
function startPlaying(shortcode) {
  app.setAudioMode(AUDIO_MODE.COMMENTARY_LOADING);
  app.setState({
    audioPointer: 0,
    commentaryAudio: shortcode,
  });
  app.setTagPanel(TAG_PANEL.CLOSED); // assumes Task C2 done
}
```

In `Audio.js` `onStart` (multiple places):

```js
// before
app.setState({ audioState: "playing" });

// after  (verse player)
app.setAudioMode(AUDIO_MODE.VERSE_PLAYING);

// after  (commentary player)
app.setAudioMode(AUDIO_MODE.COMMENTARY_PLAYING);
```

In `Audio.js` `onError` and `onEnded`:

```js
// before
app.setState({ audioState: null, commentary_audio_verse_range: [] });

// after
app.setAudioMode(AUDIO_MODE.IDLE);
app.setState({ commentary_audio_verse_range: [] });
```

**Step 5: Replace reads of legacy fields with predicates**

In `Audio.js` `<Audio>` root:

```js
// before
if (state.audioState === null) return null;
if (state.commentaryAudioMode) return <AudioCommentaryPlayer />;
return <AudioVersePlayer />;

// after
import { isVerseMode, isCommentaryMode, AUDIO_MODE } from '../state/audioState';
// …
if (state.audioMode === AUDIO_MODE.IDLE) return null;
if (isCommentaryMode(state.audioMode)) return <AudioCommentaryPlayer />;
return <AudioVersePlayer />;
```

In `Verse.js` (the `AudioVerse` component, choosing icon/text based on mode):

```js
// before
if (state.commentaryAudioMode === false) {
  if (state.audioState === "loading") { … }
  if (state.audioState === "playing") { … }
}

// after
import { AUDIO_MODE } from '../state/audioState';
// …
if (state.audioMode === AUDIO_MODE.VERSE_LOADING) { … }
if (state.audioMode === AUDIO_MODE.VERSE_PLAYING) { … }
```

Same pattern in `AudioCommentary`.

**Step 6: Run tests + build**

```
cd /Users/kckern/Documents/GitHub/IsaiahExplorer && \
  CI=true npm test -- --watchAll=false 2>&1 | tail -10 && \
  CI=false NODE_OPTIONS=--openssl-legacy-provider node_modules/.bin/react-scripts build 2>&1 | tail -5
```
Expected: tests pass; build succeeds.

**Step 7: Manually verify the full audio flow**

- Click Play Audio Verse → button shows "Loading…", then "Pause Audio Verse" with accent color. ✓
- Click Play Commentary → button shows "Loading…", then "Pause Commentary". Switching to commentary stops the verse audio. ✓
- Click cog/source picker, choose other source → playback continues (per Phase A4 changes), then switches to new source. ✓
- Audio ends naturally → auto-advances to next verse. ✓
- Click pause → all audio stops, button reverts to play state. ✓

**Step 8: Commit**

```bash
git add src/state/audioState.js src/state/audioState.test.js \
        src/App.js src/Components/Audio.js src/Components/Verse.js
git commit -m "refactor(audio): collapse audioState+commentaryAudioMode into audioMode enum"
```

---

## Phase D — UI Redesigns (target: 4–6 hours)

Goal: ship the split-button audio toolbar (audit §9 of `audio-heading-audit-2026.md`), memoize the recursive `<TagTree>` to fix the O(N) render cost on every state change, and remove `body.narrow` if it's not needed any more.

Phase D depends on Phases A and C3 being complete (or at least Phase A1–A3).

### Task D1: Audio split-button redesign

**Files:**
- Modify: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/Components/Verse.js` (the `AudioVerse` and `AudioCommentary` functions)
- Create: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/Components/AudioMenuPopover.js`
- Modify: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/App.css` (replace `#audio_heading … {…}` rules 3045–3179 with the new sketch from `audio-heading-audit-2026.md` §9)

**Step 1: Implement the popover component**

Create `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/Components/AudioMenuPopover.js`:

```js
import React, { useEffect, useRef } from 'react';

/**
 * Anchored popover for the audio button dropdown menus.
 * - Closes on outside click and Escape.
 * - Does NOT stop active playback when opened.
 * - Renders children inline below the trigger.
 */
export default function AudioMenuPopover({ open, onClose, children }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return <div className="audio-menu-popover" ref={ref} role="menu">{children}</div>;
}
```

**Step 2: Rebuild `AudioVerse` as a split button**

In `Verse.js` `AudioVerse()`:

```js
return (
  <div className="audio-btn-group" id="audio_verse_group">
    <button
      type="button"
      className={[..classes, "audio-btn audio-btn--primary"].join(" ")}
      onClick={handleClick}
      disabled={isDisabled}
      aria-pressed={isVerseMode(state.audioMode) && isPlaying(state.audioMode)}
    >
      <img alt="" src={icon} aria-hidden="true" /> <span className="audio-btn__label">{shortText}</span>
      <span className="audio-btn__rate" onClick={(e) => { e.stopPropagation(); cyclePlaybackRate(); }}>{rateLabel}</span>
    </button>
    <button
      type="button"
      className="audio-btn audio-btn--dropdown"
      onClick={() => setMenuOpen(o => !o)}
      aria-label="Verse audio options"
      aria-haspopup="menu"
      aria-expanded={menuOpen}
    >▾</button>
    <AudioMenuPopover open={menuOpen} onClose={() => setMenuOpen(false)}>
      <div className="audio-menu__group" role="group" aria-label="Playback speed">
        <div className="audio-menu__heading">Playback speed</div>
        {[1, 1.25, 1.5, 2].map(rate =>
          <button
            key={rate}
            type="button"
            className={"audio-menu__chip" + (state.playbackRate === rate ? " audio-menu__chip--active" : "")}
            onClick={() => { app.setState({ playbackRate: rate }); setMenuOpen(false); }}
          >{rate}×</button>
        )}
      </div>
    </AudioMenuPopover>
  </div>
);
```

Where `shortText` is the new short label ("Verse" / "Loading…" / "Pause") and `menuOpen` is a `useState(false)` declared at the top of the component.

**Step 3: Rebuild `AudioCommentary` as a split button**

Same pattern. The dropdown menu shows:
1. A list of commentary sources (radio buttons; current source has check mark; clicking switches without stopping playback)
2. The same playback-speed chip row

Source picker (replaces the broken `<select>`):

```js
<div className="audio-menu__group" role="group" aria-label="Commentary source">
  <div className="audio-menu__heading">Commentary source</div>
  {Object.values(globalData.meta.audiocom).map(src =>
    <button
      key={src.shortcode}
      type="button"
      className={"audio-menu__item" + (state.commentaryAudio === src.shortcode ? " audio-menu__item--active" : "")}
      onClick={() => { startPlaying(src.shortcode); setMenuOpen(false); }}
    >
      {state.commentaryAudio === src.shortcode ? "● " : "○ "}{src.short_title || src.title}
    </button>
  )}
</div>
```

Delete the `useState(false)` for `options` and the `<select>`-based fork at lines 219–227. The `handleOptions` function is also gone.

**Step 4: Rewrite the CSS for `#audio_heading`**

In `App.css`, delete rules from line 3045 to 3179 (the entire `#audio_heading` block). Replace with the §9 sketch from `audio-heading-audit-2026.md`:

```css
:root {
    --ui-surface: #444;
    --ui-surface-hover: #555;
    --ui-border: #222;
    --ui-accent: #2a6ea1;
    --ui-on-accent: #fff;
    --ui-focus: #4a90e2;
}

#audio_heading {
    display: flex;
    gap: 8px;
    align-items: center;
    line-height: 1;
}

.audio-btn-group {
    display: inline-flex;
    flex: auto;
    min-width: 0;
}

.audio-btn {
    height: 44px;
    padding: 0 14px;
    border: 1px solid var(--ui-border);
    background: var(--ui-surface);
    color: var(--ui-on-accent);
    font: 500 13px 'Roboto Condensed', 'Helvetica Neue', Arial, sans-serif;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.audio-btn--primary {
    border-radius: 8px 0 0 8px;
    flex: auto;
    min-width: 0;
    justify-content: flex-start;
}
.audio-btn--dropdown {
    border-radius: 0 8px 8px 0;
    border-left: 0;
    padding: 0 8px;
    flex: 0 0 auto;
}
.audio-btn:hover { background: var(--ui-surface-hover); }
.audio-btn:focus-visible { outline: 2px solid var(--ui-focus); outline-offset: -2px; z-index: 1; }
.audio-btn[aria-pressed="true"] { background: var(--ui-accent); }
.audio-btn[disabled] { opacity: 0.4; cursor: not-allowed; }
.audio-btn__label { flex: 1; overflow: hidden; text-overflow: ellipsis; }
.audio-btn__rate {
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 999px;
    background: rgba(0,0,0,0.25);
    margin-left: 8px;
}
.audio-btn__rate:hover { background: rgba(0,0,0,0.4); }

.audio-menu-popover {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 4px;
    background: #fff;
    color: #222;
    border: 1px solid var(--ui-border);
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    padding: 8px;
    min-width: 200px;
    z-index: 100;
}
.audio-menu__group { margin: 8px 0; }
.audio-menu__heading { font: 600 11px 'Roboto Condensed', sans-serif; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 4px; }
.audio-menu__item, .audio-menu__chip {
    display: block;
    width: 100%;
    text-align: left;
    background: transparent;
    border: 0;
    padding: 6px 8px;
    cursor: pointer;
    font: 400 13px 'Roboto Condensed', sans-serif;
    border-radius: 4px;
}
.audio-menu__chip { display: inline-block; width: auto; padding: 4px 10px; margin: 2px; background: #eee; }
.audio-menu__item:hover, .audio-menu__chip:hover { background: #def; }
.audio-menu__item--active, .audio-menu__chip--active { background: var(--ui-accent); color: var(--ui-on-accent); }
```

**Step 5: Run build**

```
cd /Users/kckern/Documents/GitHub/IsaiahExplorer && \
  CI=false NODE_OPTIONS=--openssl-legacy-provider node_modules/.bin/react-scripts build 2>&1 | tail -5
```
Expected: build succeeds.

**Step 6: Manually verify — full audio toolbar smoke test**

For each of these, confirm the labels DO NOT truncate at any width down to ~1200 px, all buttons keyboard-focusable, all menus close on Escape, no layout shifts when playing/pausing:

- Idle state: 3 buttons in a row (Verse + ▾, Commentary + ▾, Read). Speed shows `1×` inline in Verse button.
- Click Verse primary → loads, plays. Rate badge stays put.
- Click Verse ▾ → popover opens BELOW. Choose 1.5× → playback speeds up immediately, button shows `1.5×`. Click outside → popover closes.
- Click Commentary ▾ → popover shows Gileadi (current) and McGee. Click McGee → audio source switches, playback continues. ✓ no pause.
- Press Tab through everything → focus rings on each button.
- Press Escape with a menu open → menu closes.
- Open a version without audio → Verse split button is disabled (both halves).

**Step 7: Commit**

```bash
git add src/Components/Verse.js src/Components/AudioMenuPopover.js src/App.css
git commit -m "feat(audio): split-button toolbar with popover menus (speed, commentary source)"
```

---

### Task D2: Memoize `<TagTree>` recursion

**Files:**
- Modify: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/Components/Tags.js` (`TagTree` and `TagTreeLeaf` exports)

**Step 1: Wrap `TagTree` and `TagTreeLeaf` in `React.memo`**

In `Tags.js`, change the exports/decls:

```js
// before
export function TagTree({ base }) { … }
function TagTreeLeaf({ tag, desc }) { … }

// after
function TagTreeImpl({ base }) { … }
export const TagTree = React.memo(TagTreeImpl, function(prev, next) {
  // Re-render only when `base` changes (parent re-renders cascade in)
  return prev.base === next.base;
});

function TagTreeLeafImpl({ tag, desc }) { … }
const TagTreeLeaf = React.memo(TagTreeLeafImpl, function(prev, next) {
  return prev.tag === next.tag && prev.desc === next.desc;
});
```

`TagTreeImpl` and `TagTreeLeafImpl` still call `useContext(DataContext)`, so they still react to global state changes; `React.memo` only blocks re-renders triggered by parent re-rendering with same props.

**Step 2: Verify `useContext` propagation still works**

The audit note: `<TagTree>` calls `useContext(DataContext)` — that's a subscription, so even memoized children re-render when `DataContext.Provider` value changes. Confirm by reading the implementation; no change needed.

**Step 3: Run build**

Expected: build succeeds.

**Step 4: Manually verify**

- Open the tag tree. Click around to expand branches. All branches still expand correctly.
- React DevTools → Profiler: record opening a branch. Count re-renders of `<TagTree>` nodes. Before this fix: O(N) where N = total tags. After: only nodes whose `base` prop changed.

**Step 5: Commit**

```bash
git add src/Components/Tags.js
git commit -m "perf(tags): memoize TagTree and TagTreeLeaf to prevent O(N) re-renders per parent update"
```

---

## Final Verification

After all phases:

1. **Run all tests:**
   ```
   cd /Users/kckern/Documents/GitHub/IsaiahExplorer && CI=true npm test -- --watchAll=false 2>&1 | tail -15
   ```
   Expected: at minimum, all of `routeCodec.test.js`, `tagSelectors.test.js`, `tagPanel.test.js`, `audioState.test.js` pass.

2. **Run build:**
   ```
   cd /Users/kckern/Documents/GitHub/IsaiahExplorer && CI=false NODE_OPTIONS=--openssl-legacy-provider node_modules/.bin/react-scripts build 2>&1 | tail -5
   ```
   Expected: "The build folder is ready to be deployed."

3. **Manual smoke test:**
   - Verse audio plays, pauses, advances, speed cycles 1 → 1.25 → 1.5 → 2 → 1.
   - Commentary audio plays, source picker swaps without stopping playback.
   - Tag panel opens, tree shows, scrolling smooth, no console warnings.
   - Arrow-key navigation through verses: smooth scroll, no jank, history not flooded.

4. **Lighthouse / DevTools quick check:**
   - Open Performance tab → record 10 seconds of arrow-key navigation. Verify no "long task" warnings (>50ms) other than initial paint.
   - Open Accessibility tab → focus order through audio toolbar is sensible.

---

## Notes for the Executor

- **Phases A–D are independent.** Ship after any phase that's complete; don't block on later ones.
- **Each Task in Phase A is < 30 min.** If you find a task taking longer, it probably means the refactor scope grew. Stop and re-scope.
- **Tasks C2 and C3 are the largest** — they each touch 30+ lines across 3+ files. Read the audit referenced in this plan before starting. If a task feels too big, split it: e.g., C2a = "introduce enum + bridge", C2b = "migrate readers."
- **Don't add `Tags.js` ESLint fixes** beyond what each task strictly requires. The pre-existing exhaustive-deps warnings are out of scope.
- **The audio CSS rewrite in D1 deletes ~135 lines.** This is intentional — most of the old `#audio_heading` rules are subsumed by 5 modern rules.
- **Mobile is out of scope** for this plan (see `responsive-mobile-audit-2026.md`). The split-button design here is *forward-compatible* with mobile work but doesn't ship mobile.
- **No new npm packages** are required.

---

## Out of Scope (for separate plans)

- Replacing the `previewed_tag` hover model with long-press — depends on mobile work (see `responsive-mobile-audit-2026.md` §9).
- Migrating from class component `App.js` to function components.
- Replacing `react-player` (works fine for our use case).
- Per-route SEO meta generation beyond `react-helmet` (already shipped earlier).
- Removing `body.narrow` — wait for the unified mobile layout plan.

---

## Done.
