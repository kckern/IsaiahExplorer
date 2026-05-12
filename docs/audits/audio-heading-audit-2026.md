# `#audio_heading` Audit — Isaiah Explorer
**Date:** May 2026
**Scope:** The three-button audio/commentary toolbar at the top of Column 4 (`#audio_heading`), rendered by `AudioVerse` / `AudioCommentary` in `src/Components/Verse.js` (lines 95–246), styled by `src/App.css:3045–3179`, and driven by ~12 state fields in `App.state`.
**Auditor note:** Companion to the existing audits. This is one of the smallest UI surfaces in the app (3 buttons + 1 playback-rate badge) and yet it touches more state fields per pixel than any other component.

---

## Executive Summary

The audio heading is failing both halves of its job: the **labels visibly truncate mid-word** ("Pause Audio V", "Audio Vers", "Read Commen"), and the **interaction model is non-obvious** (a config cog hidden inside a button, a `<select>` that takes over the same slot, a playback-rate pill that only appears when playing and pushes neighbors sideways).

The CSS is one declaration away from being the literal cause of the truncation: `word-break: break-all` (line 3056) explicitly says *"hyphenate anywhere, even mid-word."* That's a worst-case strategy applied to UI labels that are entirely Latin words.

| Concern | Severity | Notes |
|---|---|---|
| `word-break: break-all` on UI labels | 🔴 Critical | This is *the* line causing "Pause Audio V" / "Audio Vers" / "Read Commen" — one CSS change reverts to whole-word truncation with ellipsis |
| Fixed-width container with variable-width labels | 🔴 Critical | "Loading Audio Verse" is 19 chars, slot fits ~12 — no responsive sizing strategy |
| Playback-rate pill only appears when playing | 🟠 High | Reflows the whole row mid-interaction; user sees layout jump |
| Cog (sprocket) inside the Play Commentary button | 🟠 High | Button-inside-button. Click-target is ambiguous; `handleClick` guards with `if (e.target.id !== "audio_commentary") return false;` (fragile) |
| Native `<select>` replaces the button when picking commentary | 🟠 High | Visually different from the rest of the chrome; opening it stops playback as a side effect |
| `<div onClick>` instead of `<button>` | 🟠 High | No keyboard focus, no `role`, no `aria-label`, not announced as interactive |
| No semantic color (all buttons gray) | 🟡 Medium | Play, Pause, Read all look equally inert; no affordance hierarchy |
| 22 px touch targets, 16 px icons, 20 px rate badge | 🟡 Medium | Below Apple's 44 pt / Material's 48 dp minimums — unusable on touch |
| Hover state = same color as active state | 🟡 Medium | Hovering an actively-playing button shows no visible feedback |
| 12+ state fields drive 3 buttons | 🟠 High | `audioState`, `commentaryAudioMode`, `audioPointer`, `commentary_audio_verse_range`, `commentaryAudio`, `playbackRate`, `selected_verse_id`, `commentary_verse_id`, `commentary_verse_range`, `commentaryMode`, `tagMode`, `infoOpen` |
| No "cancel loading" affordance | 🟢 Low | Once "Loading Audio Verse" appears, the user has no way to abort |
| `border: 2px solid #000` + pill chrome | 🟢 Low | Visually heavy 2010-era iOS pill style at odds with the scripture-study aesthetic |

**Overall grade:** D. The buttons fire the correct actions when clicked, but everything *around* the click — the layout, the labels, the affordances, the touch targets, the accessibility — is broken.

---

## 1. The Truncation Bug Is One CSS Line

`src/App.css:3056`:

```css
#audio_heading div
{
    font-size:12px;
    border:2px solid #000;
    font-family:'Comfortaa', Helvetica, Arial, sans-serif;
    word-break: break-all;     /* ← this is the bug */
    line-height:20px;
    /* ... */
}
```

`word-break: break-all` tells the browser: *"when text overflows, break the line at any character, including mid-word."* It's designed for CJK text or pathological inputs (URLs without word boundaries). Applied to UI labels like "Pause Audio Verse," it produces the screenshots: `Pause Audio V` / `Audio Vers` / `Read Commen`.

Three reasonable strategies the codebase could pick instead:

| Strategy | Result |
|---|---|
| `word-break: keep-all; white-space: nowrap; overflow: hidden; text-overflow: ellipsis` | "Pause Audio…" — readable, recognizable |
| Shorter labels: "Play Verse" / "Play Commentary" / "Read" + icon | Always fits, label and icon reinforce each other |
| Icon-only buttons with tooltips/aria-label | Always fits, mobile-friendly, scales to N actions |

The current strategy — "let it run on, break anywhere, display whatever happens to fit" — is the only one that produces output that looks like a bug.

---

## 2. The Layout Reflows on State Change

The container is `display: flex` with each button on `flex: auto`. The playback-rate pill (`<button>{rateLabel}</button>`, `Verse.js:167`) is conditionally rendered **only when `state.audioState === "playing"`**:

```js
let button = state.audioState === "playing"
  ? <button onClick={cyclePlaybackRate}>{rateLabel}</button>
  : null;
```

When the user clicks "Play Audio Verse":

1. `audioState` becomes `"loading"` → no rate pill yet → row has 3 buttons.
2. Audio loads → `audioState` becomes `"playing"` → rate pill appears → flex redistributes width → all three buttons shrink → truncation gets worse.

This is visible in the screenshots:
- **Image 2 (idle):** three buttons, "Play Audio Vers" already truncated.
- **Image 3 (playing):** three buttons + 1× pill, "Pause Audio V" now even more truncated.

The user perceives this as the buttons "shifting" mid-interaction. There is no good reason for it — the rate pill could:
- Be present always (greyed out / "—" when idle).
- Live inside the Play/Pause button, attached to its right side.
- Live in a separate row.

Reserving its space avoids the reflow.

---

## 3. The Cog (Sprocket) Button-Inside-a-Button

`Verse.js:245`:

```js
return <div className={classes.join(" ")} id="audio_commentary" onClick={handleClick}>
  <img alt="Audio Commentary" src={icon} /> {text}
  <img onClick={handleOptions} alt="Select" id="com_option" src={sprocket_icon} />
</div>;
```

The cog icon is positioned `position: absolute; right: 0; top: 2px` (line 3110), pinned to the right edge of the Play Commentary button. Two click handlers on overlapping regions:

- Click the cog → `handleOptions` → opens the `<select>` dropdown.
- Click anywhere else on the button → `handleClick` → toggles audio.

Three problems:

1. **The click target boundary is invisible to the user.** Nothing visually says "this 16 px cog has a different behavior than the rest of the 22 px tall button it sits in."
2. **The cog overlays the text** (visible in the screenshots as the cog drawn on top of "Play Commen[t]" — there's a small icon overlapping the last character).
3. **`handleClick` guards via `if (e.target.id !== "audio_commentary") return false;`** (Verse.js:189). This means clicks on the inner `<img>` (the play icon, *not* the cog) also get swallowed — clicking the play icon to start audio fails silently. The intent was probably to let cog clicks through, but the guard is too broad.

A proper toolbar pattern:

```
[▶ Play Commentary]  [⚙]
   primary action    secondary action
```

Two adjacent buttons. Two click targets. Each with its own visible boundary. No "what part of this button did you click" guessing.

---

## 4. The `<select>` Modal Takes Over the Button Slot

`Verse.js:219–227`:

```js
if (options) {
  var items = [<option key="top" value="top">Make a selection:</option>];
  for (var i in globalData.meta.audiocom) {
    var it = globalData.meta.audiocom[i];
    items.push(<option key={it.shortcode} value={it.shortcode}> ⤷ {it.title}</option>);
  }
  var selector = <select onChange={selectOption} id="com_selector">{items}</select>;
  return <div id="audio_commentary" onClick={handleClick}>{selector}</div>;
}
```

When the user clicks the cog, the entire Play Commentary button gets replaced with a native browser `<select>`. The third screenshot shows this state — "Make a selection:" with a rectangular bordered look that doesn't match the surrounding pills.

Problems:

1. **Visual inconsistency.** Native `<select>` styling varies by browser/OS — macOS Chrome renders it one way, iOS Safari another, Windows Firefox another. The custom CSS at line 3126–3136 only nudges it slightly.
2. **Opening the menu stops playback.** `handleOptions` (line 206) does `setState({ audioState: null }, ...)` before showing the dropdown. The user wanting to switch *which commentary is playing* has to stop the current one to even see the options — they can't preview options while listening.
3. **The menu lives inside a flex slot meant for a button.** This is the only flex child that doesn't render as a pill, so it breaks the visual rhythm.
4. **No close affordance.** Clicking elsewhere doesn't close the dropdown explicitly — only `<option>` `onChange` does. If the user changes their mind, they're stuck with the dropdown open until they choose something.

A proper pattern: open the source-picker as a popover/menu *above* the button (so the button stays visible), don't stop playback (let the user pre-select before committing), and add an explicit dismiss.

---

## 5. `<div onClick>` Instead of `<button>`

Every audio-heading "button" is actually a `<div>`:

```js
<div id="audio_verse" className="active_audio" onClick={handleClick}>
  <img alt="Play Audio" src={icon} /> Play Audio Verse
</div>
```

The only real `<button>` is the playback-rate pill. The rest are not buttons in the DOM, so they:

- **Don't receive keyboard focus.** Tab order skips them.
- **Aren't announced as interactive** by screen readers (no `role="button"`).
- **Don't fire on Enter/Space** the way real buttons do.
- **Don't get a focus ring** for keyboard users.
- **Don't respect `disabled`** semantically (the "noaudio" version uses `cursor: not-allowed` but is still focusable-not via Tab order — and clickable via DOM if someone fires a synthetic event).

This is a 5-minute fix per button: change the JSX element from `<div>` to `<button type="button">`, add `disabled={...}` for the `noaudio` case, drop the `cursor: not-allowed` workaround (the browser provides it free on disabled buttons).

---

## 6. The 1× Pill Is Visually Disconnected From What It Controls

`Verse.js:167–168`:

```js
let button = state.audioState === "playing" ? <button onClick={cyclePlaybackRate}>{rateLabel}</button> : null;
return <><div ... id="audio_verse">...{text}</div>{button}</>;
```

The rate button renders **between** "Pause Audio Verse" and "Play Commentary" — visually equidistant from both. The user has no way to know it controls the verse audio, not the commentary audio, except by trial and error.

```
[⏸ Pause Audio V]  (1×)  [▶ Play Comment[⚙]]  [💬 Read Comment]
       ↑                ↑          ↑                  ↑
   verse audio      ???      commentary audio    text toggle
```

It should be visually attached:

```
[⏸ Pause Audio Verse · 1×]  [▶ Play Commentary]  [⚙]  [💬 Read]
       ↑           ↑                ↑              ↑       ↑
       grouped: verse audio       commentary    source  text toggle
```

Grouping makes the relationship visible without a tooltip.

---

## 7. The State Model Is Disproportionate

Three buttons. Twelve state fields:

| Field | Set by which button? |
|---|---|
| `audioState` | Verse-play, Commentary-play, cog (sets it null) |
| `audioPointer` | Verse-play, Commentary-play |
| `commentaryAudioMode` | Verse-play (false), Commentary-play (true) |
| `commentary_audio_verse_range` | Commentary-play |
| `commentaryAudio` | Commentary-play, cog (via select) |
| `commentary_verse_range` | Read button |
| `commentary_verse_id` | Read button |
| `commentaryMode` | Read button |
| `selected_verse_id` | Verse-play, Read button |
| `tagMode` | Commentary-play |
| `infoOpen` | Read button |
| `playbackRate` | 1× pill |

That is roughly **4 fields modified per button click**, with overlapping reads. Same anti-pattern as the tag-tree audit (`tag-tree-state-audit-2026.md`): UI state mood encoded across N fields with no unifying enum.

Cleanest reduction:

```js
audio: {
  mode: 'idle' | 'verse-loading' | 'verse-playing' | 'commentary-loading' | 'commentary-playing',
  source: string,         // which commentary source
  playbackRate: 1 | 1.5 | 2,
  pointer: number,        // verse index inside the current queue
}
read: 'closed' | 'open'   // separate concern; not audio
```

Six fields, one enum, no implicit ordering rules. Each button maps to a transition on `audio.mode`.

---

## 8. Touch / Accessibility / Visual Polish

Stacking the smaller issues that each individually merit a fix:

| Issue | Today | Fix |
|---|---|---|
| Touch target height | 22 px | Bump to 44 px (Apple HIG) / 48 dp (Material) |
| Rate pill size | 20 × 20 px, 10 px font | 32 × 24 px or merge into adjacent button |
| Cog icon size | 16 × 16 px | 24 × 24 px, with its own pill button |
| Hover ≠ active state | Both = `#333` | Hover = slightly lighter than active so feedback is visible |
| `cursor: pointer` on `<div>` | Set explicitly | Free with `<button>` |
| Focus ring | None | `:focus-visible { outline: 2px solid CanvasText }` |
| Label color hierarchy | All gray | Play = filled accent color (e.g., a muted blue), Pause = warm, Read = neutral |
| 2 px black border | Heavy | 1 px or none; rely on background contrast |
| Pill radius | 10 px (very rounded) | 6–8 px feels less 2010s |
| `font-family: Comfortaa` | OK | Consider Roboto Condensed to match the rest of the UI (per the recent font pass) |

---

## 9. Suggested Redesign

Concrete, minimal-scope redesign that fits inside the same `#audio_heading` row:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [▶ Verse · 1×]   [▶ Commentary]  [⚙]   [💬 Read]                        │
│                                                                          │
│  44 px tall, real <button>s, focus-visible, semantic colors,             │
│  rate badge inline with verse-audio button, cog as its own pill          │
└──────────────────────────────────────────────────────────────────────────┘
```

States:

| Verse audio button | Commentary audio button | Cog | Read button |
|---|---|---|---|
| `▶ Verse · 1×` (idle) | `▶ Commentary` (idle) | `⚙` | `💬 Read` |
| `⏳ Loading · 1×` (loading; idle dim) | `⏳ Loading` | `⚙` | `💬 Read` |
| `⏸ Verse · 1×` (playing; accent color) | `▶ Commentary` (idle) | `⚙` | `💬 Read` |
| `▶ Verse · 1×` (idle) | `⏸ Commentary` (playing; accent color) | `⚙` | `💬 Read` |
| disabled (`.noaudio`) | `▶ Commentary` | `⚙` | `💬 Read` |

Source picker (clicking ⚙):

- Opens a **popover anchored to the cog**, *above* the toolbar.
- Lists the available commentary sources with the current selection checked.
- Does **not** stop playback when opened.
- Closes on outside-click, Escape, or selecting an option.

Label shortening (to eliminate truncation entirely):

- "Verse" instead of "Play Audio Verse" (verb is conveyed by icon; subject is "Verse")
- "Commentary" instead of "Play Commentary"
- "Read" instead of "Read Commentaries"

In context (Column 4 header), the noun-only labels remain unambiguous because the icons carry the verb.

### CSS sketch

```css
#audio_heading {
  display: flex;
  gap: 8px;
  align-items: center;
}
#audio_heading button {
  height: 44px;
  padding: 0 14px;
  border: 1px solid var(--ui-border);
  border-radius: 8px;
  background: var(--ui-surface);
  font: 500 13px 'Roboto Condensed', sans-serif;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
#audio_heading button:hover { background: var(--ui-surface-hover); }
#audio_heading button:focus-visible { outline: 2px solid var(--ui-focus); }
#audio_heading button[aria-pressed="true"] {
  background: var(--ui-accent);
  color: var(--ui-on-accent);
}
#audio_heading button[disabled] { opacity: 0.4; cursor: not-allowed; }
#audio_heading .rate-badge {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(0,0,0,0.15);
}
```

Five rules. Replaces lines 3045–3179 (135 lines).

---

## 10. Sequencing — Lowest-Risk Wins

If a full redesign is too much, here is the highest-value order:

1. **Remove `word-break: break-all`.** 1 minute. Stops the visible truncation immediately — replace with `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`.
2. **Shorten labels** to "Verse" / "Commentary" / "Read". 5 minutes in `Verse.js`. Eliminates the need to truncate at all in the common case.
3. **Reserve the playback-rate pill space when idle** (render it greyed out instead of hidden). 5 minutes. Stops the layout shift.
4. **Convert `<div onClick>` to `<button type="button">`** for the three audio buttons. 15 minutes. Wins keyboard focus, screen-reader semantics, and `disabled` for free.
5. **Split the cog into its own adjacent button.** 30 minutes. Removes the click-target ambiguity and the fragile `e.target.id` guard.
6. **Replace the `<select>` with a popover** for commentary source selection. 1–2 hours. Lets users browse options without stopping playback.
7. **Bump touch targets to 44 px and add focus-visible.** 15 minutes. Pre-requirement for any mobile work.
8. **Collapse the 12 audio state fields into the proposed 6-field model.** 2–4 hours. The biggest correctness win but also the largest blast radius — defer until after #1–#5.

Items 1–5 alone (~1 hour total) take this UI from D to B without touching the state model.

---

## 11. What NOT to Do

- **Don't make the buttons smaller** to fit the labels. The labels need to shrink, not the buttons.
- **Don't add a fourth button** (e.g., a separate "stop loading" button). The state machine should subsume cancellation into the existing button's transitions.
- **Don't keep the `<div onClick>` pattern** when adding more interactions. Use `<button>` for buttons.
- **Don't put the cog *inside* the Play Commentary button** in any future iteration. Adjacent and visible-bordered, always.
- **Don't keep the conditional rendering of the rate pill.** Either always render it (greyed when not applicable) or move it inside the verse button.
- **Don't style the `<select>` to "fit in."** Replace it with a popover that uses the same chrome as the buttons.

---

## 12. Conclusion

The audio heading is the highest UI-debt-per-square-pixel surface in the app: three buttons, twelve state fields, mid-word truncation, a button-inside-a-button, a stylesheet-modal `<select>` that interrupts playback, and no keyboard or touch support. None of it is broken in the sense of *not firing the right action* — it all works when clicked correctly. It's broken in the sense of *not telling the user what it does or what state it's in.*

The cheapest meaningful win (Items 1–3 in §10, ~15 minutes total) eliminates the visible truncation and layout shift. The full redesign (§9) takes a single short row from D to A and removes ~130 lines of CSS in the process.
