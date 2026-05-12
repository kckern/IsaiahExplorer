# Audio Toolbar Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the 10 remaining visual/UX issues identified by the vision agent's review of the post-F6 audio toolbar — cluster cohesion, state feedback, symmetry, and accent integration.

**Architecture:** All 10 issues are CSS or small JSX deltas in `src/Components/Verse.js` and `src/App.css`. No new components, no new state fields, no new dependencies. Each task is independently shippable. Live verification via the already-running `npm start` dev server at `http://localhost:3000`.

**Tech Stack:** React 16 (class + function components), CSS with `:root` design tokens, BEM naming, no preprocessor.

---

## Conventions Used in This Plan

- **File paths are absolute** (`/Users/kckern/Documents/GitHub/IsaiahExplorer/...`).
- **Build verification:** every task ends with `CI=true npm test -- --watchAll=false` (43 tests must still pass) + `CI=false NODE_OPTIONS=--openssl-legacy-provider node_modules/.bin/react-scripts build` (must end with "The build folder is ready to be deployed").
- **Live verification:** dev server at `localhost:3000` is already running. After each task, the implementer should open or refresh the page and visually confirm the change. For the implementer running headless, use the Playwright snippet from F6's `/tmp/screenshot.js` to capture `#audio_heading` and `iso-audio-toolbar.png` for inspection. (One screenshot per task, in `/tmp/iso-poish-task-N.png`.)
- **Each task = one commit.** Conventional message: `style(audio): …` for CSS-only, `fix(audio): …` for JSX changes that fix behavior, `feat(audio): …` for net-new UI features.
- **Tests** are not added per task (these are purely visual polish; the 43 existing tests cover the underlying logic and stay green).

---

## Vision Agent's 10 Issues (Mapped to Tasks)

| # | Issue | Task |
|---|---|---|
| 1 | No "currently playing" visual signal | T5 |
| 2 | Sub-controls visually detached (chip gaps) | T1 |
| 3 | Verse cluster narrower than Commentary | T2 |
| 4 | Commentary source name hidden behind ▾ | T8 |
| 5 | Read toggle has no pressed-state visual | T6 |
| 6 | Chevrons too heavy | T1 (paired with the divider work) |
| 7 | No rate pill on Commentary | T7 |
| 8 | Labels left-clumped, awkward right gap | T3 |
| 9 | Toolbar doesn't use the column's accent color | T9 |
| 10 | Rate-pill typography (letter-spacing on `1×`) | T4 |

Phases:

- **Phase 1 — Visual cohesion** (T1–T4): make each split-button cluster read as one control.
- **Phase 2 — State feedback** (T5–T6): playing-state + pressed-state visuals.
- **Phase 3 — Symmetry & info** (T7–T8): commentary parity with verse.
- **Phase 4 — Accent integration** (T9): use the column's existing accent.

---

## Phase 1 — Visual Cohesion

Each cluster (`Verse + 1× + ▾` and `Commentary + ▾`) should read as a single compound control, not three separate chips with thin grey gaps.

### Task T1: Unify cluster background + add subtle dividers; lighten chevrons

**Files:**
- Modify: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/App.css` (the `.audio-btn--rate`, `.audio-btn--dropdown` rules around line 3096–3115)

**Step 1: Find the current rules**

Run:
```bash
grep -nE "\.audio-btn--(rate|dropdown|primary)\b" /Users/kckern/Documents/GitHub/IsaiahExplorer/src/App.css
```

Expected output: each rule with its line number.

**Step 2: Make the rate pill share the cluster background; replace the colored differentiation with a thin inner divider**

In `App.css`, replace the `.audio-btn--rate` block with:

```css
.audio-btn--rate {
    border-radius: 0;
    /* Use inner dividers (subtle white rule) instead of a contrasting bg
       so the cluster reads as one rounded surface. */
    border-left: 1px solid rgba(255,255,255,0.12);
    border-right: 1px solid rgba(255,255,255,0.12);
    padding: 0 10px;
    font-size: 11px;
    font-weight: 600;
    flex: 0 0 auto;
    background: var(--ui-surface);
    color: rgba(255,255,255,0.85);
}
.audio-btn--rate:hover { background: var(--ui-surface-hover); color: #fff; }
```

**Step 3: Adjust the dropdown chevron — lighter background, smaller glyph**

Replace `.audio-btn--dropdown`:

```css
.audio-btn--dropdown {
    border-radius: 0 8px 8px 0;
    border-left: 1px solid rgba(255,255,255,0.12);
    padding: 0 10px;
    flex: 0 0 auto;
    font-size: 10px;
    color: rgba(255,255,255,0.6);
}
.audio-btn--dropdown:hover { color: #fff; }
```

**Step 4: Run build + tests**

```bash
cd /Users/kckern/Documents/GitHub/IsaiahExplorer
CI=true npm test -- --watchAll=false 2>&1 | tail -5
CI=false NODE_OPTIONS=--openssl-legacy-provider node_modules/.bin/react-scripts build 2>&1 | tail -5
```

Expected: 43 tests pass; build succeeds.

**Step 5: Visual verification**

Refresh `http://localhost:3000/divisions/divisions/KJV/5/10` in a browser, look at Column 4. Each cluster should now look like one rounded rectangle with thin internal vertical lines, instead of three separate chips. Chevrons should look lighter / less attention-grabbing.

If running headless, take a screenshot:
```bash
cd /tmp && node screenshot.js
```

**Step 6: Commit**

```bash
cd /Users/kckern/Documents/GitHub/IsaiahExplorer
git add src/App.css
git commit -m "style(audio): unify cluster background; replace gap with inner dividers; lighten chevrons"
```

---

### Task T2: Equalize cluster widths

**Files:**
- Modify: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/App.css` (the `.audio-btn-group` rule around line 3068)

**Step 1: Find the current rule**

```bash
grep -nE "^\.audio-btn-group\b" /Users/kckern/Documents/GitHub/IsaiahExplorer/src/App.css
```

**Step 2: Change `flex: auto` to `flex: 1 1 0` for equal sharing**

Replace `.audio-btn-group`:

```css
.audio-btn-group {
    display: inline-flex;
    flex: 1 1 0;            /* equal share of available width */
    min-width: 0;
    position: relative;
}
```

The `1 1 0` (grow, shrink, basis 0) ensures both clusters get the same fraction of the parent's free space, regardless of the natural width of their content.

**Step 3: Run build + tests**

```bash
cd /Users/kckern/Documents/GitHub/IsaiahExplorer
CI=true npm test -- --watchAll=false 2>&1 | tail -5
CI=false NODE_OPTIONS=--openssl-legacy-provider node_modules/.bin/react-scripts build 2>&1 | tail -5
```

**Step 4: Visual verification**

Refresh browser. The Verse cluster and Commentary cluster should now be the same width. The Read button stays its natural size (no flex grow on it).

**Step 5: Commit**

```bash
git add src/App.css
git commit -m "style(audio): equalize verse + commentary cluster widths via flex:1 1 0"
```

---

### Task T3: Center labels within primary buttons

**Files:**
- Modify: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/App.css` (the `.audio-btn--primary` rule)

**Step 1: Locate the rule**

```bash
grep -nE "^\.audio-btn--primary\b" /Users/kckern/Documents/GitHub/IsaiahExplorer/src/App.css
```

**Step 2: Change `justify-content` to center**

Replace `.audio-btn--primary`:

```css
.audio-btn--primary {
    border-radius: 8px 0 0 8px;
    flex: auto;
    min-width: 0;
    justify-content: center;   /* icon + label group sits centered */
}
```

Now the icon and label are centered together in the primary button, balancing the visual weight against the sub-controls on the right.

**Step 3: Build + test**

```bash
cd /Users/kckern/Documents/GitHub/IsaiahExplorer
CI=true npm test -- --watchAll=false 2>&1 | tail -5
CI=false NODE_OPTIONS=--openssl-legacy-provider node_modules/.bin/react-scripts build 2>&1 | tail -5
```

**Step 4: Visual verification**

Refresh browser. The labels "Verse" and "Commentary" should now sit centered in their primary buttons, with the play icon flanking on the left, instead of being clumped to the left.

**Step 5: Commit**

```bash
git add src/App.css
git commit -m "style(audio): center icon+label group inside primary buttons"
```

---

### Task T4: Rate-pill typography (letter-spacing)

**Files:**
- Modify: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/App.css` (the `.audio-btn--rate` rule from T1)

**Step 1: Add a small `letter-spacing` to the rate pill rule**

In `App.css`, the `.audio-btn--rate` rule (from T1) gets one more property. Replace:

```css
.audio-btn--rate {
    border-radius: 0;
    border-left: 1px solid rgba(255,255,255,0.12);
    border-right: 1px solid rgba(255,255,255,0.12);
    padding: 0 10px;
    font-size: 11px;
    font-weight: 600;
    flex: 0 0 auto;
    background: var(--ui-surface);
    color: rgba(255,255,255,0.85);
}
```

with the same block plus `letter-spacing: 0.5px;`:

```css
.audio-btn--rate {
    border-radius: 0;
    border-left: 1px solid rgba(255,255,255,0.12);
    border-right: 1px solid rgba(255,255,255,0.12);
    padding: 0 10px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.5px;
    flex: 0 0 auto;
    background: var(--ui-surface);
    color: rgba(255,255,255,0.85);
}
```

**Step 2: Build + test**

```bash
cd /Users/kckern/Documents/GitHub/IsaiahExplorer
CI=true npm test -- --watchAll=false 2>&1 | tail -5
CI=false NODE_OPTIONS=--openssl-legacy-provider node_modules/.bin/react-scripts build 2>&1 | tail -5
```

**Step 3: Visual verification**

Refresh. `1×` should read with a touch more breathing room between the digit and the multiplication sign. Cycle to `1.25×` and `1.5×` — they should all look similarly proportioned.

**Step 4: Commit**

```bash
git add src/App.css
git commit -m "style(audio): tune rate-pill typography (letter-spacing for 1× legibility)"
```

---

## Phase 2 — State Feedback

The toolbar needs to visually convey "this is playing" and "this toggle is on."

### Task T5: Make playing-state visually unmistakable

**Files:**
- Modify: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/App.css` (the `:root` token block + the `.audio-btn[aria-pressed="true"]` rule)

**Step 1: Brighten the accent token**

The current `--ui-accent: #2a6ea1` is a muted blue that doesn't pop against the dark `--ui-surface`. We want a more energetic accent that visibly says "I am playing right now."

In `App.css`, near the top of the file (the `:root` block was hoisted there in F5), find `--ui-accent`. Replace its value with a brighter teal-blue:

```css
:root {
    --ui-surface: #444;
    --ui-surface-hover: #555;
    --ui-border: #222;
    --ui-accent: #3aa3d8;        /* was #2a6ea1 — brighter for clearer "playing" state */
    --ui-on-accent: #fff;
    --ui-focus: #4a90e2;
}
```

**Step 2: Enhance the playing-state rule — accent bg, white text, subtle inner glow**

Find `.audio-btn[aria-pressed="true"]`:

```bash
grep -n 'audio-btn\[aria-pressed' /Users/kckern/Documents/GitHub/IsaiahExplorer/src/App.css
```

Replace with:

```css
.audio-btn[aria-pressed="true"] {
    background: var(--ui-accent);
    color: #fff;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.25);
}
.audio-btn[aria-pressed="true"]:hover {
    background: var(--ui-accent);
    filter: brightness(1.08);
}
```

**Step 3: Build + test**

```bash
cd /Users/kckern/Documents/GitHub/IsaiahExplorer
CI=true npm test -- --watchAll=false 2>&1 | tail -5
CI=false NODE_OPTIONS=--openssl-legacy-provider node_modules/.bin/react-scripts build 2>&1 | tail -5
```

**Step 4: Visual verification (REQUIRES INTERACTION)**

In a browser at `localhost:3000/divisions/divisions/KJV/5/10`:
1. Click the **Verse** button to start playing. The primary verse button should glow with the new bright teal-blue accent. The label switches to "Pause" and the animated audio-bars icon plays.
2. Click again to pause. Button returns to neutral grey.
3. Click **Commentary** → same behavior, the Commentary primary button glows.

This is harder to capture headlessly; if running automated, set a state where the button has `aria-pressed=true` and screenshot the toolbar.

**Step 5: Commit**

```bash
git add src/App.css
git commit -m "feat(audio): brighter accent for playing state; subtle inner ring for emphasis"
```

---

### Task T6: Read button pressed-state (when text panel is open)

**Files:**
- Modify: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/Components/Verse.js` (the Read button JSX around line 100)
- Modify: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/App.css` (add `#commentary[aria-pressed]` rule)

**Step 1: Add `aria-pressed` to the Read button**

In `Verse.js`, find the Read button (around line 100):

```bash
grep -n 'id="commentary"' /Users/kckern/Documents/GitHub/IsaiahExplorer/src/Components/Verse.js
```

Replace its opening tag with:

```jsx
<button
  type="button"
  id="commentary"
  aria-pressed={state.commentaryMode === true}
  onClick={() => app.setState({ commentaryMode: !state.commentaryMode, commentary_verse_range: [], selected_verse_id: null, commentary_verse_id: state.active_verse_id }, function() { app.setTagPanel(TAG_PANEL.CLOSED); app.setUrl(); })}
>
```

Note: the existing `setState` payload already sets `infoOpen: false`. Since C2's `setTagPanel(TAG_PANEL.CLOSED)` already handles that, we can simplify the call. But to keep diff minimal, just add `aria-pressed`.

If keeping the call exactly as-is is simpler, just inject `aria-pressed={state.commentaryMode === true}` as a new attribute on the `<button>` and leave the rest.

**Step 2: Add CSS for the pressed Read state**

In `App.css`, find the `#commentary` block (around line 3117):

```bash
grep -n '^#commentary\b' /Users/kckern/Documents/GitHub/IsaiahExplorer/src/App.css
```

Add this rule immediately after the existing `#commentary:hover` rule:

```css
#commentary[aria-pressed="true"] {
    background: var(--ui-accent);
    color: #fff;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.25);
}
#commentary[aria-pressed="true"]:hover {
    background: var(--ui-accent);
    filter: brightness(1.08);
}
```

**Step 3: Build + test**

```bash
cd /Users/kckern/Documents/GitHub/IsaiahExplorer
CI=true npm test -- --watchAll=false 2>&1 | tail -5
CI=false NODE_OPTIONS=--openssl-legacy-provider node_modules/.bin/react-scripts build 2>&1 | tail -5
```

**Step 4: Visual verification**

In browser: click **Read**. The button should glow in the new accent (matching the playing-state look) and the label switches from "Read" to "Hide". Click again to close — returns to neutral.

**Step 5: Commit**

```bash
git add src/Components/Verse.js src/App.css
git commit -m "feat(audio): visible pressed-state for Read commentary toggle (aria-pressed + accent)"
```

---

## Phase 3 — Symmetry & Information

Commentary should match Verse's affordances; the active commentary source should be visible without opening the dropdown.

### Task T7: Add rate-pill to Commentary cluster

**Files:**
- Modify: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/Components/Verse.js` (the `AudioCommentary` return)

**Step 1: Locate the current commentary group**

Find the `.audio-btn-group` inside `AudioCommentary`. Look for `id="audio_commentary_group"`.

```bash
grep -n 'audio_commentary_group' /Users/kckern/Documents/GitHub/IsaiahExplorer/src/Components/Verse.js
```

**Step 2: Insert a rate-pill button between the primary and the dropdown**

The verse cluster has this pattern:

```jsx
<button id="audio_verse" ...>…primary content…</button>
<button className="audio-btn audio-btn--rate" onClick={cyclePlaybackRate} aria-label={...}>{rateLabel}</button>
<button className="audio-btn audio-btn--dropdown" ...>▾</button>
```

Match the same pattern in `AudioCommentary`. Add the same rate-pill button between the primary `<button id="audio_commentary">…</button>` and the `<button className="audio-btn audio-btn--dropdown">▾</button>`:

```jsx
<button
    type="button"
    className="audio-btn audio-btn--rate"
    onClick={cyclePlaybackRate}
    aria-label={"Playback speed: " + rateLabel}
>{rateLabel}</button>
```

**Important:** `cyclePlaybackRate` and `rateLabel` are currently defined in `AudioVerse`, not `AudioCommentary`. You need to either:

- (a) Duplicate the function and label-computation inside `AudioCommentary`, OR
- (b) Lift them to a shared scope (e.g., the parent `VerseColumn` and pass via props).

For minimal diff, go with (a): copy the `cyclePlaybackRate` function and `rateLabel` computation lines into the top of `AudioCommentary` (after `var state = globalData.state;`). Both functions read the same `state.playbackRate` and write through `app.setState({ playbackRate })`, so duplication doesn't drift behavior.

The `cyclePlaybackRate` function from `AudioVerse`:

```js
function cyclePlaybackRate() {
    let sequence = {
        "1": 1.25,
        "1.25": 1.5,
        "1.5": 2,
        "2": 1
    };
    let rate = state.playbackRate;
    app.setState({ playbackRate: sequence[rate] || 1 });
}
```

And the `rateLabel` block:

```js
let rateLabel = state.playbackRate + "×";
if (state.playbackRate === 1.5) rateLabel = "1½";
if (state.playbackRate === 1.25) rateLabel = "1¼";
```

Paste these inside `AudioCommentary` so the new button can reference them.

**Step 3: Build + test**

```bash
cd /Users/kckern/Documents/GitHub/IsaiahExplorer
CI=true npm test -- --watchAll=false 2>&1 | tail -5
CI=false NODE_OPTIONS=--openssl-legacy-provider node_modules/.bin/react-scripts build 2>&1 | tail -5
```

**Step 4: Visual verification**

Refresh browser. The Commentary cluster should now show `[▶ Commentary] [1×] [▾]` exactly like Verse. Click the new pill — it should cycle the rate. Both clusters show the same rate (since it's one shared `playbackRate` state).

**Step 5: Commit**

```bash
git add src/Components/Verse.js
git commit -m "feat(audio): add rate-pill to commentary cluster (symmetry with verse)"
```

---

### Task T8: Surface the current commentary source name in the button label

**Files:**
- Modify: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/Components/Verse.js` (the `shortText` computation in `AudioCommentary`)

**Step 1: Find the current shortText assignment**

```bash
grep -nE "shortText.*Commentary" /Users/kckern/Documents/GitHub/IsaiahExplorer/src/Components/Verse.js
```

**Step 2: Compute a short source label**

In `AudioCommentary`, near where `shortText` is currently set to "Commentary"/"Loading"/"Pause", add a source-name lookup. Place this near the top of the function body:

```js
// Short display name for the current commentary source, used inline so
// users see what they'll hear without opening the source picker.
var srcMeta = globalData.meta.audiocom[state.commentaryAudio];
var srcName = (srcMeta && (srcMeta.short_title || srcMeta.title)) || state.commentaryAudio;
// "Analytical Commentary of Isaiah by Avraham Gileadi" is too long;
// "short_title" in meta is "Analytical Commentary" or "Thru the Bible"
// — pick the first word for inline brevity.
var srcShort = srcName.split(/\s+/)[0];   // "Analytical", "Thru" … not great
```

That heuristic doesn't produce a great label. Use an explicit map keyed by shortcode:

```js
var SOURCE_LABELS = {
    gileadi: "Gileadi",
    mcgee: "McGee"
};
var srcShort = SOURCE_LABELS[state.commentaryAudio] || state.commentaryAudio;
```

Define `SOURCE_LABELS` once at module scope (top of `Verse.js`, near the imports) so other components could share it later:

```js
const COMMENTARY_SOURCE_LABELS = {
    gileadi: "Gileadi",
    mcgee: "McGee",
};
```

Then in `AudioCommentary`:

```js
var srcShort = COMMENTARY_SOURCE_LABELS[state.commentaryAudio] || state.commentaryAudio;
```

**Step 3: Update the `shortText` strings to include the source**

Change the existing assignments:

```js
// before
var shortText = "Commentary";
if (state.audioMode === AUDIO_MODE.COMMENTARY_LOADING) shortText = "Loading";
if (state.audioMode === AUDIO_MODE.COMMENTARY_PLAYING) shortText = "Pause";

// after
var shortText = srcShort;
if (state.audioMode === AUDIO_MODE.COMMENTARY_LOADING) shortText = "Loading " + srcShort;
if (state.audioMode === AUDIO_MODE.COMMENTARY_PLAYING) shortText = "Pause " + srcShort;
```

So idle Commentary button reads "Gileadi" (or "McGee"); loading reads "Loading Gileadi"; playing reads "Pause Gileadi."

**Step 4: Build + test**

```bash
cd /Users/kckern/Documents/GitHub/IsaiahExplorer
CI=true npm test -- --watchAll=false 2>&1 | tail -5
CI=false NODE_OPTIONS=--openssl-legacy-provider node_modules/.bin/react-scripts build 2>&1 | tail -5
```

**Step 5: Visual verification**

Refresh. The Commentary primary button should now read "Gileadi" (the default source). Open the dropdown, pick "McGee" — the label updates to "McGee" instantly. Click play — it changes to "Pause McGee".

**Step 6: Commit**

```bash
git add src/Components/Verse.js
git commit -m "feat(audio): show current commentary source name inline (Gileadi / McGee)"
```

---

## Phase 4 — Accent Integration

The toolbar should rhyme with the column's existing yellow highlight motif used in the section headers below.

### Task T9: Add column-yellow accent strip (optional, design judgment call)

This is the most stylistic of the changes. The vision agent flagged that "the audio toolbar is the only horizontal band in the column without any color cue — every section below it has a yellow accent strip."

**Files:**
- Modify: `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/App.css` (locate the yellow accent currently used in `Encompassing Passages` etc., reuse it on `#audio_heading`)

**Step 1: Find the yellow accent**

```bash
grep -nE "#[Ff][Ff][CDcd]|#[Ff][Ff][BCbc]|background.*[Yy]ellow|tag_desc_highlighted|heading_grid_highlighted" /Users/kckern/Documents/GitHub/IsaiahExplorer/src/App.css | head -20
```

Look for the yellow `background-color` used in section headers. (Likely `#FFC`, `#FFD`, `#FFF8DC`, or similar.) Copy the exact hex.

**Step 2: Choose an integration:**

There are three reasonable ways to use the accent. Choose ONE — talk to the controller if unclear:

(a) **Thin left border on the toolbar strip** — minimal change, just a 4px accent rule on the left edge:

```css
#audio_heading {
    /* ... existing rules ... */
    border-left: 4px solid #FFD;   /* or the column's yellow */
}
```

(b) **Underline below the toolbar** — accent strip between the toolbar and the verse text:

```css
#audio_heading {
    /* ... existing rules ... */
    border-bottom: 3px solid #FFD;
}
```

(c) **Pill-color the rate badge** — most subtle, just the rate pill picks up the yellow:

```css
.audio-btn--rate {
    /* override the dark fill */
    background: #FFD;
    color: #555;
}
```

**Recommendation:** Start with (b) — a 3px yellow underline. It echoes the yellow row-highlight motif in sections below without altering button colors. If it doesn't feel right after the other tasks land, fall back to (a).

**Step 3: Build + test**

```bash
cd /Users/kckern/Documents/GitHub/IsaiahExplorer
CI=true npm test -- --watchAll=false 2>&1 | tail -5
CI=false NODE_OPTIONS=--openssl-legacy-provider node_modules/.bin/react-scripts build 2>&1 | tail -5
```

**Step 4: Visual verification**

Refresh. The audio toolbar should visually "belong" to the column — sharing the yellow accent that appears below in Encompassing Passages, Verse Tags, etc.

**Step 5: Commit**

```bash
git add src/App.css
git commit -m "style(audio): adopt column's yellow accent strip on toolbar"
```

---

## Final Verification (after all 9 tasks)

```bash
cd /Users/kckern/Documents/GitHub/IsaiahExplorer
CI=true npm test -- --watchAll=false 2>&1 | tail -10
CI=false NODE_OPTIONS=--openssl-legacy-provider node_modules/.bin/react-scripts build 2>&1 | tail -5
```

Expected: 43 tests pass; build succeeds.

**Manual smoke test** (in browser at `localhost:3000/divisions/divisions/KJV/5/10`):

1. Verse cluster and Commentary cluster are the same width.
2. Each cluster looks like one rounded surface with subtle internal dividers (not 3 separate chips).
3. Click Verse → button gains a bright teal-blue accent; label switches to "Pause"; animated audio-bars icon plays.
4. Click again → back to grey, "Verse" label.
5. Click Commentary → glows accent, label reads "Pause Gileadi" (or "Pause McGee" if previously selected).
6. Click rate pill (in either cluster) → cycles 1× → 1.25× → 1.5× → 2× → 1×; both pills show the same value.
7. Click Read → button gains the same accent treatment as the play buttons; label switches to "Hide".
8. Chevrons (`▾`) look noticeably lighter / less attention-grabbing than the play icons.
9. Labels "Verse", "Pause Gileadi", "Hide" are visually centered in their primary buttons.
10. Yellow accent strip is visible below (or beside) the toolbar, echoing the rest of the column.

**Screenshot the final state** (use the Playwright snippet at `/tmp/screenshot.js`) and compare against the pre-plan baseline at `/tmp/iso-audio-toolbar.png`.

---

## Sequencing & Dependencies

- Tasks T1–T4 are independent of each other and of Phase 2/3/4 — can ship in any order within Phase 1.
- T5 must come before/with T6 because they share the `--ui-accent` token and the `aria-pressed` rule pattern.
- T7 must come before T8 (T7 adds the rate pill; T8 changes the primary label — both modify `AudioCommentary`'s return).
- T9 is fully independent; can land first if desired for visual confirmation that the accent works in the strip.

**Recommended order:** T2 (equal widths) → T1 (dividers) → T3 (center labels) → T4 (rate-pill type) → T5 (playing state) → T6 (Read state) → T7 (add rate pill to commentary) → T8 (source name) → T9 (accent strip). Each task at this scale = ~10 min including review.

---

## What NOT to Do

- **Don't add new state fields.** All visual changes ride on existing state (`state.audioMode`, `state.playbackRate`, `state.commentaryAudio`, `state.commentaryMode`).
- **Don't replace icons** unless explicitly required. The animated audio-bars GIF for playing state is already serviceable.
- **Don't introduce a CSS preprocessor.** The codebase uses plain CSS with `:root` tokens. Stay with that.
- **Don't add new keyboard shortcuts.** The existing space-bar handler for `audio_verse` / `audio_commentary` still works; don't add chord variants.
- **Don't refactor the popover** in this plan. F1–F5 stabilized it; leave it alone.
- **Don't expand mobile or touch behavior.** The responsive-mobile audit is a separate effort; this plan is desktop-only polish.

---

## Out of Scope (track for later)

- Mobile/touch redesign (see `docs/audits/responsive-mobile-audit-2026.md`).
- Animated playing-state indicators beyond the existing GIF (e.g., waveform visualisation).
- A11y improvements beyond `aria-pressed` (e.g., `aria-controls` linking the dropdown to the popover, `aria-keyshortcuts`).
- Hoisting the rate-pill / cyclePlaybackRate into a shared `<RatePill />` component (T7 duplicates code intentionally — can dedupe later).

---

## Done.
