# Audio Toolbar Rewrite — Design Doc

**Date:** 2026-05-12
**Status:** Approved, ready for implementation plan.

## Context

Iterative polish on the existing split-button audio toolbar (F1–F6, T1–T11, the 3-button equal-width pass) reached "horrendous" in the user's words. Each fix landed a real improvement but compounded the inline complexity: rate pills, chevrons, inline source labels, hover popovers, focus outlines. Time to rip and replace.

## Requirements

The user's brief:

> "I need three buttons. One for playing the verse. One for playing a commentary. And one for opening commentary to read. The commentary ones need to be able to select the commentary and all the audio ones need the playback speed options somehow."

Translated:

- Exactly 3 main action buttons (no split-buttons, no chevrons attached, no inline sub-pills).
- Speed selector affects both audio buttons.
- Source selector affects both commentary buttons (audio + read).
- Secondary controls (speed, source) live *somewhere*, not on the buttons themselves.

## Selected approach

A two-zone strip:

1. **Settings strip (~24px tall):** a small ⚙ gear in the top-right corner of `#audio_heading`. Nothing else in this zone.
2. **Action zone (~52px tall):** three equal-width buttons (Verse, Commentary, Read), each a clean rectangle with icon + label. No sub-segments.

Clicking the gear opens a small popover anchored under it. The popover contains a speed-chip row and a commentary-source radio list. Click any option → applied instantly. Outside-click or Escape → close.

```
┌────────────────────────────────────────────────────────────┐
│                                                       ⚙    │
├────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────────┐  ┌────────────┐        │
│  │ ▶ Verse    │  │ ▶ Gileadi      │  │ 💬 Read    │        │
│  └────────────┘  └────────────────┘  └────────────┘        │
└────────────────────────────────────────────────────────────┘
```

## Button behavior

Single-click semantics. No popovers on the buttons themselves; no long-press; no hidden gestures.

| Button | Click | Idle label | Active label | Icon | Active styling |
|---|---|---|---|---|---|
| Verse audio | Toggle play/pause of current verse in active version | "Verse" | "Pause" | ▶ → ⏸ | accent fill, white icon |
| Commentary audio | Toggle play/pause of current commentary source | source short-name ("Gileadi") | "Pause Gileadi" | ▶ → ⏸ | accent fill |
| Read commentary | Toggle text-commentary panel below | "Read" | "Hide" | 💬 | accent fill |

States:

- **Idle** — dark surface (`#3a3a3a`), white icon, white label, soft bottom-edge shadow so the button reads as raised.
- **Loading** — same as idle but spinner icon + "Loading" label, click acts as cancel.
- **Playing / Read-open** — `#1976d2` accent fill, inset 1px white hairline, white text.
- **Disabled** (Verse audio when current version has no audio AND not in Hebrew mode) — 40% opacity, `cursor: not-allowed`.

## Gear / settings popover

**Anchor:** the ⚙ icon in the strip's top-right.

**Trigger ref pattern:** uses the existing `AudioMenuPopover` component (still has the F1 trigger-ref outside-click fix; reusable).

**Popover contents:**

```
┌──────────────────────────────┐
│  PLAYBACK SPEED              │
│  [1×]  [1.25×]  [1.5×]  [2×] │
│                              │
│  COMMENTARY SOURCE           │
│  ● Gileadi                   │
│  ○ McGee                     │
└──────────────────────────────┘
```

- **Speed chips:** clicking a chip sets `state.playbackRate` immediately; active chip has accent fill.
- **Source list:** clicking a source sets `state.commentaryAudio` immediately. If commentary audio is currently playing, the player switches to the new source without stopping (preserves F1 behavior). If Read is open, the read panel switches sources.
- **Instant apply** throughout — no Save/Apply button.
- **Popover stays open** after a click. Close on Escape, outside-click, or any of the 3 main buttons clicked (defensive).

## Files

**Create:**

- `src/Components/AudioToolbar.js` — the new root component for the whole strip. Contains the 3 buttons, the gear, the popover, and the small amount of orchestration left.

**Modify:**

- `src/Components/Verse.js` — `VerseColumn`'s `audio_heading` JSX simplifies to `<AudioToolbar />`. Delete `AudioVerse`, `AudioCommentary` function components and all their inline state (`menuOpen`, `triggerRef`, `cyclePlaybackRate`, `rateLabel`, `srcShort`, `COMMENTARY_SOURCE_LABELS` map). The `#commentary` Read button moves into `AudioToolbar`.
- `src/App.css` — delete the BEM block (`.audio-btn`, `.audio-btn--primary/--rate/--dropdown`, `.audio-btn-group`, `.audio-btn__rate`, `.audio-btn__label`, `.audio-menu-popover`, `.audio-menu__group/__heading/__item/__chip`, `#commentary`), the old `#audio_heading` flex layout, and the inset-shadow focus rules. Replace with a new, smaller block: `.audio-toolbar`, `.audio-toolbar__settings`, `.audio-toolbar__actions`, `.audio-action`, `.audio-action--playing`, `.audio-action--disabled`, `.audio-gear`, `.audio-options-popover`, `.audio-speed-chips`, `.audio-source-list`.

**Reuse:**

- `src/Components/AudioMenuPopover.js` — unchanged. Used by the gear.
- `src/Components/Audio.js` — unchanged. Still the ReactPlayer mount with the F11 preload-only prefetch fix.
- `src/App.js` — unchanged. `setAudioMode` is still the writer.
- `src/state/audioState.js` — unchanged. Same `AUDIO_MODE` enum and predicates.

## Testing

- All 43 existing tests stay green; none target the toolbar's JSX directly.
- The F4 source-scan invariant (`src/state/__tests__/bridge-invariants.test.js`) still passes — we only write `audioMode` via `setAudioMode`, never `audioState` / `commentaryAudioMode` directly.
- No new unit tests required. Manual smoke test (browser + Playwright) covers the visual + interaction surface.

## Out of scope

- No new state fields. Same `state.audioMode`, `state.playbackRate`, `state.commentaryAudio`, `state.commentaryMode` as today.
- No accent color, font, or typography changes beyond what's already in `:root` tokens.
- No mobile/touch redesign (separate effort).
- No commentary-source preloading or playlist-management changes beyond what F11 already shipped.

## Estimated diff

~250 lines deleted (old BEM + state ceremony) + ~200 lines added (new component + simpler CSS) = **net ~50 lines smaller**.

## Sequencing

Single PR / single feature branch. The whole rewrite is small enough that breaking it up by sub-task (component skeleton → CSS skeleton → wire state → polish) would add ceremony for no benefit. One commit per logical step, but all in one branch.
