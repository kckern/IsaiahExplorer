# Responsive / Mobile-Friendliness Audit — Isaiah Explorer
**Date:** May 2026
**Scope:** Why the app cannot currently run on phones, what's structurally in the way, and what a realistic mobile path looks like.
**Auditor note:** Companion to `architecture-audit-2026.md`. The app was deliberately built desktop-only — this audit explains the depth of that decision, not whether it was the right one at the time.

---

## Executive Summary

The app is **actively unavailable on mobile** — `public/index.php` user-agent sniffs phones and serves a static "not supported" page (`public/mobile.html`) before React even loads. Behind that gate, the React app itself is hardcoded to **1920px** wide with a 4-column float-based layout that has no breakpoints, no fluid sizing, and a UX model (keyboard nav + hover-driven tag previews) that does not translate to touch.

Making it responsive is **not a CSS tidy-up** — it is closer to a UX redesign. The structural blockers, in descending order of cost:

| Blocker | Layer | Severity | Notes |
|---|---|---|---|
| 4-column layout assumption | UX | 🔴 Critical | The product *is* the 4 columns. A phone can show ~1.2 of them. |
| Hardcoded `#approot { width: 1920px }` | CSS | 🔴 Critical | Single source of layout; every child measures itself against it. |
| Zero `@media` queries | CSS | 🔴 Critical | No breakpoint infrastructure exists. |
| 59 `float:` vs 1 `display: flex` | CSS | 🟠 High | Layout primitives predate flexbox; rewriting per breakpoint = touching everything. |
| Hover-driven UI (47 `:hover` rules, 38 `onMouseEnter/Leave`) | JS/CSS | 🟠 High | Tag previews, structure tooltips, version swaps all depend on a mouse. |
| Keyboard-first navigation (26 keyCode handlers) | JS | 🟠 High | Arrows/PgUp/PgDn/Tab/Ins/Del/`~`/`+`/`-` — phones have none of these. |
| PHP mobile gate | Server | 🟡 Medium | Easy to remove, but removing it just exposes the deeper problems. |
| 84 fixed `font-size: ##px` declarations | CSS | 🟡 Medium | No fluid typography; readable at 1920px, broken at 375px. |
| Dead `checkZoom()` scaling code | JS | 🟢 Low | Old shrink-the-whole-thing approach abandoned (`src/App.js:2848`). |

**Overall mobile-readiness grade:** F — and that's a deliberate F, not an oversight.

---

## 1. The Mobile Gate (`public/index.php`)

The first thing a phone hits is a PHP file that decides whether React is allowed to load at all:

```php
if (preg_match('/Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile|Kindle|
                  NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|
                  Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/i', $useragent)) {
    echo file_get_contents("mobile.html"); exit;
}
```

`mobile.html` is a static HTML 4.01 page styled with inline `<style>` that says:

> *"The Isaiah Explorer requires a mouse and wide screen, and is therefore only available as a desktop web application. Mobile devices are not currently compatible."*

This is an honest gate. The author knew the app wouldn't work on phones and chose to admit it rather than ship a broken experience. Note also that **iPads are caught by this regex** (`iP(hone|od|ad)`) — even though some iPads have 1366px screens and could plausibly run the app — because the UX is also touch-incompatible regardless of screen size.

**The gate is the symptom, not the disease.** Removing it without fixing everything below would just produce a worse "not supported" message rendered by the user's confused browser.

> Note on the React Router migration: now that the app uses `BrowserRouter` and AWS Amplify, `index.php` is no longer in the deployment path on Amplify. The PHP-based UA sniff is only active on the legacy `scripture.guide` Apache host. Either path needs an equivalent mobile gate (or, ideally, no gate at all) once mobile is supported.

---

## 2. The 1920px Canvas Is a Symptom, Not the Cause

`src/App.css:45`:

```css
#approot {
    width: 1920px;
    /* ... */
}
```

It's tempting to read this as *"the app is locked to one resolution because the layout was lazy."* That reading is wrong. **The 1920px canvas exists because each of the four columns independently requires the width it has** — the canvas is the *sum* of the columns, not the *source* of them.

| Col | CSS | Content | Why this specific width |
|---|---|---|---|
| 1 — Structural Sections (`.col1`) | `width: 491px` | A verse-number grid that lays all 1,292 verses out as a visual *shape* (~6–10 numbers per row per Part) | Narrower → rows wrap, the shape disintegrates and the structural metaphor breaks |
| 2 — Section Passages (`.col2b`) | `width: 310px` | Chapter list with verse-density bars + chapter ranges (`7:1–25`) | Narrower → range labels truncate; wider → wasted space because the content is uniform |
| 3 — Passage Verses (`.col3`) | `margin-left:820px; margin-right:570px; min-width:400px` | **Justified prose** at fixed line length | This is the *reading column*. Narrower → justified text gets hyphenation rivers; wider → eye fatigue from line length >75 chars. There is a known-good range and we sit inside it. |
| 4 — Verse Details (`.col2`) | `width: 560px` | Focal verse + **4 side-by-side translations** + tag chips + commentary | The "4 side-by-side translations" panel literally requires room for 4 narrow vertical text columns. Below ~500px it collapses to 3 or fewer, which defeats the comparison UX. |

Sum: 491 + 310 + 400 + 560 ≈ 1761px of content; +margins/borders ≈ 1920px. The canvas width is **derived**, not chosen.

This is the deepest reason mobile is hard. It is not that the CSS is rigid — it is that **the product cannot be the same product without all four content types visible simultaneously**, and three of the four cannot be shrunk past a content-defined floor:

- The verse-number grid stops being a grid below ~300px.
- The justified reading column stops being readable below ~400px.
- The 4-up translation comparator stops being a comparator below ~500px.

Add those floors together and you get ~1200–1400px *minimum* — which is exactly why the "narrow mode" stops at 1530px and never tries to go lower.

There are **67 fixed pixel widths** across `App.css`, but the vast majority are content-density choices inside each column (verse-number cell size, translation cell padding, tag chip height) — not arbitrary numbers tuned to a global canvas.

---

## 3. The Synchronized Visual Vocabulary (the real reason mobile was excluded)

The four-columns-at-once layout is not just a visibility constraint — it is a **synchronization mechanism**. The same verse, the same tag, the same structural section appears *simultaneously* in multiple columns, and a single state change in `App.state` makes all of them light up in unison. This synchronized lighting *is* the product's pedagogical core: it teaches the relationships between structure, outline, prose, and translation by **showing them update together**.

### The shared state (read by every column)

From `src/App.js:43–56` — the state fields that drive cross-column highlighting:

```js
selected_verse_id:                          null,  // secondary selection
active_verse_id:                            null,  // focal verse — the "you are here"
selected_tag:                               null,  // active thematic tag
showcase_tag:                               null,  // hover-previewed tag
highlighted_heading_index:                  null,  // outline heading containing focal verse
highlighted_section_index:                  null,  // structural section containing focal verse
highlighted_tagged_verse_range:             [],    // all verses sharing active tag
highlighted_tagged_parent_verse_range:      [],    // verses in parent tag
highlighted_verse_range:                    [],    // section's verse range
highlighted_section_verses:                 [],    // all verses in the section
selected_tag_block_index:                   null,  // which tag block is open
chiasm_letter:                              null,  // chiastic pairing letter
```

These flow into `globalData` (`src/globals.js`) where every component reads them via `DataContext`. A `<VerseBox>` component is reused across all four columns and looks at the same fields:

### The visual grammar (CSS class chord that maps state → appearance)

`src/App.css` — six layered modifier classes, applied combinatorially:

| Class | What it means | Where it appears |
|---|---|---|
| `versebox_highlighted` | the focal verse (`active_verse_id`) | bright yellow / orange outline |
| `versebox_range_highlighted` | in the focal section's verse range | softer yellow background |
| `versebox_tag_highlighted` | shares the active tag | tag color overlay |
| `versebox_selected` | secondary selection | indigo outline |
| `active_commentary` | commentary loaded for this verse | small indicator dot |
| `greyed_out` (on `#text`) | context dimming for non-focal prose | rest of column dims |

These aren't six exclusive states — they **combine** into ~24+ rendered permutations (e.g., `versebox.versebox_highlighted.versebox_selected.active_commentary` at `App.css:926`).

### How the chord plays in the screenshot

A single state mutation — `setActiveVerse(7:2)` — produces a chord of changes across all four columns:

1. **Col 1 (Structure)**: the verse-number `2` cell inside Part II's grid gets `versebox_highlighted` (orange outline). The surrounding chapter-7 cells get `versebox_range_highlighted` (yellow). The active-tag verses across the *whole 1,292-verse grid* are still lit up faintly — so the eye can scan and say *"oh, this verse is part of a much larger tagged constellation."*
2. **Col 2 (Section)**: the Chapter 7 row gets `range_highlighted` (yellow box). Inside its inline chapter grid, verse `2` gets `versebox_highlighted`.
3. **Col 3 (Passage)**: the prose run of verse 2 gets `versebox_highlighted` (yellow background span). The other verses dim (`greyed_out`) so the focal sentence pops.
4. **Col 4 (Verse Details)**: the heading shows `Isaiah 7:2`, the verse renders large, the 4-up translation comparator updates, and `Isaiah Chapter 7` in *Encompassing Passages* gets `range_highlighted`.

**Five visual updates fired by one state mutation.** That is the vocabulary. It is *deeper than the data layer* — the data is just verses and tags; the *grammar* is the rule that says *"every representation of the focal verse, in every column, must update together, in a recognizable family of visual states, every time."*

### Why mobile compromises this so easily

If only one column is visible at a time on a phone, then **four-fifths of every chord is silent**. You can still play the note (`setActiveVerse` still runs, `versebox_highlighted` still applies wherever that verse exists in the DOM) — but the user doesn't *see* the harmonized response. The pedagogical signal collapses.

The risks specifically:

1. **The chord becomes inaudible.** State changes still happen, but the user only sees one panel's reaction. The whole "this verse means X in this structure, Y in that outline, Z in this translation" insight requires *seeing them update simultaneously*. Tabs or carousels don't deliver this.
2. **The chord becomes incoherent.** If a mobile flow lets the user navigate Col 3 forward while Col 1's structure shows a section that no longer contains the new focal verse, the visual grammar contradicts itself — the user trusted that columns stay in sync, and they don't.
3. **The chord becomes optional.** If mobile UX adds "preview-only" or "lazy-update" modes for performance, the contract that *every column always reflects current state* is silently broken. Users learn not to trust the highlights.
4. **The vocabulary fragments.** If mobile-only components introduce their own highlight classes (e.g., `mobile-active-verse` distinct from `versebox_highlighted`), the visual language splits in two and the desktop ↔ mobile feel diverges.

### Design constraints any mobile work must honor

If you do mobile (and the existing audit recommends you should), it must obey these rules — they are the *real* spec, not the screen sizes:

1. **The chord must always play, even when partially visible.** If a column is off-screen on mobile, its highlight state must still be *computed* and *re-applied* the instant the user swipes to it. No lazy state. Today, all four `<VerseBox>` instances re-render against the same `globalData` — preserving this on mobile means *the components stay mounted* (not lazy-mounted on swipe).
2. **Mobile components must reuse the existing modifier classes**, not invent new ones. `versebox_highlighted` means the same thing on a phone as on desktop. The visual grammar is one language.
3. **State changes from any mobile gesture must produce the same chord a click would.** Tap-and-hold to set focal verse should fire the same `setActiveVerse(id)` that desktop click does, with the same downstream highlight ripple.
4. **No mobile-specific "simplified" states.** Resist the temptation to omit `versebox_range_highlighted` because "it's subtle on a phone." That subtlety *is* the grammar; muting it muddles the language.
5. **Cross-column navigation must preserve the chord.** A "peek Col 1 from Col 3" gesture must show Col 1 *already lit up* with the right state — not Col 1 in some default unhighlighted view that becomes correct after a render.
6. **There must be a peripheral indicator of unseen chord notes.** Some lightweight always-visible element on mobile (a sticky bottom strip, breadcrumb, or mini-map) should hint at what's lit in the columns that aren't currently on screen — so the user knows the chord is still playing.

These constraints are *much* stricter than what "responsive design" usually means. They are why the author chose to exclude mobile rather than ship a degraded experience.

---

## 4. The "Narrow Mode" Band-Aid

There *is* an attempt at responsiveness, but it doesn't survive contact with a phone. `App.js:114`:

```js
if (window.innerWidth < 1920) {
    document.getElementsByTagName("body")[0].className = "narrow";
}
```

When that class is applied, `App.css:3900` kicks in:

```css
body.narrow #approot { width: 1530px; }
body.narrow .col1   { width: 300px; }
body.narrow .col2   { width: 430px; }
body.narrow .col3   { margin-left: 570px; width: 500px; }
body.narrow .col2b  { width: 250px; }
```

This works **only between roughly 1530px and 1919px** — i.e., on small laptops. Below 1530px the columns overflow and clip. There is no second breakpoint, no tablet mode, no phone mode. The `body.narrow` style block runs from line 3900 to 4017, ~118 lines of overrides — and even that fragile second mode required nearly 4x more CSS than a unified responsive system would.

There is also a **dead third attempt** in `App.js:2848`:

```js
checkZoom() {
    return false;
    /* OLD CODE — commented out:
       compute ratio = innerWidth / 1920
       set #approot transform: scale(ratio)
       set body overflow: hidden
    */
}
```

This was a "scale the whole 1920px canvas down with `transform: scale()`" approach. It was abandoned (the function now just returns `false`), but the residue is still in `html, body { transform-origin: 0 0; }`. Conceptually this would have made the app *visible* on phones at the cost of unreadable text and unclickable targets — the author wisely backed out.

---

## 5. No Breakpoint Infrastructure

```
@media queries in src/App.css: 0
```

Every `min-width:` / `max-width:` match in the file is a property declaration on a single element (e.g., `max-width: 95px` on a thumbnail), not a media query. **There is no breakpoint vocabulary at all.**

The viewport meta tag *is* set correctly in `public/index.html:5`:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
```

So the foundation is there — phones will report their real width — but nothing in the CSS uses that information.

---

## 6. Float-Based Layout Predates Flexbox

```
float: declarations:     59
display: flex declared:   1
display: grid declared:   0
display: table:           6
```

The 4-column layout is held together by:

1. `.col1` floats left, `.col2` floats right, `.col3` sits in the middle using `margin-left/margin-right` to clear the floats.
2. Inside each column, sub-panels use `position: absolute` (20 occurrences) with hardcoded `top: 67px; left: 0; right: 0; bottom: 0` to fill the parent column.

Floats can be made responsive (`float: left; width: 50%`), but the absolute positioning inside each column cannot — once you flow columns vertically on a phone, every nested `position: absolute` panel needs its anchor recomputed.

**Translation:** you cannot ship a phone layout by adjusting widths; you have to rebuild the layout primitive (float → flex/grid) before any responsive work is possible.

---

## 7. The UX Model Itself Is Desktop-Only

This is the deepest problem. Even with a perfect CSS rewrite, the *interaction model* assumes a desktop:

### Keyboard-first navigation (`App.js`, 26 `keyCode` handlers)

| Key | Action |
|---|---|
| Arrow keys | Navigate verses / headings |
| PgUp / PgDn | Cycle translations |
| Home / End | Cycle outlines |
| Ins / Del | Cycle structures |
| Tab | Move between columns |
| Space | Play audio |
| `~` | Open commentary |
| `+` / `-` | Cycle tags |

Phones have none of these keys. Every shortcut needs a touch UI equivalent before mobile users can do what desktop users do.

### Hover-driven interactions (47 `:hover` rules, 38 `onMouseEnter`/`onMouseLeave`)

| Component | What hover does |
|---|---|
| `Tags.js` (16 mouse handlers) | Tag previews, floater overlay |
| `Verse.js` (9 handlers) | Verse-row highlights, related-verse ranges |
| `Hebrew.js` (3 handlers) | Strong's hover-card |
| `Commentary.js` (3 handlers) | Source preview |
| `Settings/*Version/Outline/Structure.js` | Preview pane |

Touch screens fire `touchstart` → `mousedown` → `click`, but **not `mouseenter`/`mouseleave`** in any reliable way. The "preview before commit" pattern that drives a lot of the discoverability in this app simply has no touch equivalent. You'd have to introduce long-press, pull-out drawers, or two-tap reveal — design work, not just CSS.

### Four columns visible simultaneously

The product's value proposition is *seeing all four columns at once* — structure → section → verse → passage — so you can correlate scholarly framework, outline, verse, and reading text in a single glance. A phone in portrait mode can show **one** of those columns comfortably (~360 CSS px usable). A tablet in landscape, maybe two and a half.

The honest options for mobile:

1. **Single-column with breadcrumb back stack** — phones get one column at a time, tap to drill in (Settings → Structures → 7-Part → Section A → Verse 5 → Reading). Loses the "see it all at once" magic.
2. **Carousel/tab switcher** — swipe between the 4 columns. Closer to the desktop mental model but still only shows one at a time.
3. **Reading-mode only** — phones get the Passage column with a hamburger to choose translation, and nothing else. Honest about the product limit, gives mobile users something useful.

Option 3 is probably the right product call — desktop is the "study tool," mobile is the "read it" tool — but it requires committing to that split.

---

## 8. Typography

```
font-size: ##px declarations: 84
```

Every font size is in absolute pixels (e.g., `font-size: 16px`, `font-size: 18px`), set to look right at 1920px viewing distance. None use `rem`, `em` (for fluid scaling from a single root), `clamp()`, or viewport units. On a phone, the 16px body text is OK but the 10–12px metadata labels (verse numbers, tag pills, structure headings) become unreadable.

Fluid typography (`clamp(14px, 2.5vw, 18px)`) would let the whole app breathe across screen sizes with a one-line change per declaration — but you need to do it ~84 times.

---

## 9. The "Second, Smaller App" — Concrete Sketch

If you decide to honor the synchronized-vocabulary constraints from §3, the path that emerges is not *"make App.js responsive"* — it is *"keep the existing App.js, mount a different presentation tree when on mobile, share all state."* The existing architecture makes this surprisingly natural.

### Why this is "smaller than it sounds"

The desktop app already isolates the things that *would* be hard to share:

| Already isolated | What that means for mobile |
|---|---|
| Data layer (`globalData`, `loadCore`, `loadVersion`) | Mobile reuses 100% — no second backend, no second fetch path |
| Routing layer (`routeCodec`, `RouterShell`) | Mobile reuses 100% — same URLs, same parser/builder |
| State model (App.state — `active_verse_id`, tags, etc.) | Mobile reuses 100% — one source of truth |
| `<VerseBox>` component + `versebox_*` modifier classes | Mobile reuses 100% — the chord vocabulary is preserved automatically |
| Action methods (`setActiveVerse`, `setActiveTag`, `search`, etc.) | Mobile reuses 100% — same chord-firing logic |

What mobile actually adds:

| New | Scope |
|---|---|
| 4–6 mobile-only presentation components (`ReadingView`, `StructurePicker`, `VerseDetailsSheet`, `ChordIndicator`) | ~1,000 lines of JSX + a focused CSS module |
| Layout switch at the App root (`if viewport < 768 → MobileLayout`) | ~30 lines |
| Gesture handlers (swipe between columns, long-press, bottom-sheet) | One library (e.g., `react-use-gesture`) |
| Mobile-specific CSS module — does **not** modify `App.css` | ~300–500 lines |

Total new surface area: maybe 1,500–2,000 lines. Compare to App.js + App.css = ~6,500 lines being left untouched.

### Proposed structure

```
src/
  App.js                      ← unchanged; the four-column "study tool"
  index.js                    ← chooses layout root based on viewport
  Layouts/
    DesktopLayout.js          ← extracted from current App.js render() — four-column shell
    MobileLayout.js           ← new; single-column with bottom-sheet drawers
  Components/                 ← shared atoms
    VerseBox.js               ← unchanged
    Verse.js, Passage.js, …   ← unchanged
    mobile/
      ReadingView.js          ← Col 3 prose, full-screen, current verse highlighted
      StructurePicker.js      ← Col 1 + Col 2 collapsed into a hierarchical picker
      VerseDetailsSheet.js    ← Col 4 as a bottom sheet
      ChordIndicator.js       ← thin always-visible strip showing what's lit off-screen
      KeyboardHelperBar.js    ← virtual "← → audio commentary tag" toolbar
```

`App.js` keeps owning state. The mobile components are *consumers* of `app={this}` exactly like the desktop columns are — same prop drilling pattern, same context, same actions. **The state model does not fork.**

### The chord on mobile

The user's primary mobile mode is **ReadingView (Col 3)**:

```
┌──────────────────────────────────────┐
│  ◀  Isaiah 7:2 · KJV · Divisions  ⋮  │  ← header reflects active_verse_id
│ [▓▓▓░░] [▓▓░░░] [▓░░░░] [▓▓▓▓░]      │  ← ChordIndicator: 4 bars showing what's lit in each off-screen column
├──────────────────────────────────────┤
│                                      │
│  And it came to pass in the days of  │
│  Ahaz the son of Jotham…             │
│                                      │
│  ┃ And it was told the house of      │  ← verseboxes carry versebox_highlighted
│  ┃ David, saying, Syria is           │     versebox_range_highlighted etc.
│  ┃ confederate with Ephraim…         │     (same CSS classes as desktop)
│                                      │
│  And his heart was moved, and the    │
│  heart of his people…                │
│                                      │
├──────────────────────────────────────┤
│  📖 Read  📐 Structure  📋 Verses  ℹ️ │  ← bottom nav; each tab opens its
└──────────────────────────────────────┘     bottom-sheet column
```

**Key:** the four ChordIndicator bars at top are *not decoration*. They show — at a glance — that columns 1, 2, and 4 *are currently lit up* even though they are not on screen. The user *sees the chord is playing* even when they can hear only one note. Swiping up on any bottom-nav icon opens that column with its highlight state *already correct* (because it was mounted and computed from `app.state` the whole time).

### Why every column stays mounted (not lazy)

Critical implementation rule, from §3: **all four mobile presentation components stay mounted at all times, just hidden via `transform: translateY()` or `visibility`.** This guarantees:

- `app.state` changes ripple to every component instantly (the chord plays).
- Swiping to a column shows it already in the correct state.
- No "loading" flash when opening a bottom sheet.

The "lazy-mount on swipe" pattern that mobile frameworks default to is exactly what would silently break the synchronized vocabulary. Worth budgeting RAM for the chord.

### Routing

The post-migration `routeCodec` already produces canonical paths the same way for any layout. Mobile uses the *exact same URL shape* as desktop — there is no `/m/` prefix or separate domain. A URL shared from desktop opens to the same focal verse on mobile, and vice versa. **The URL is part of the chord.**

### What gets cut, and how to be honest about it

Three desktop interactions probably will not survive the mobile transition; admit it instead of half-shipping:

1. **The 1,292-verse structural grid as a *shape*.** It cannot fit on a phone in a way that preserves the gestalt. Mobile's `StructurePicker` shows Parts and sections as a list, with the focal verse's path highlighted. The "shape" insight is desktop-only — and that's OK.
2. **The 4-up translation comparator.** Mobile shows them as vertically stacked panels with snap-scroll between them. You can compare 2 at a time, not 4.
3. **Hover-driven tag previews.** Mobile uses long-press for "preview without selecting," reusing `showcase_tag` (which already exists) on long-press-start and clearing on release.

### Risk register

| Risk | Mitigation |
|---|---|
| Mobile components diverge visually from desktop over time | Keep mobile in the same CSS file, reuse `versebox_*` classes verbatim, no parallel class hierarchy |
| State model gets bloated with mobile-specific fields | Forbidden — anything mobile-only is local state inside a mobile component, never on `App.state` |
| Layout switch flickers on resize across the breakpoint | One-time decision at mount; resize across breakpoint reloads (or shows banner: "Rotate / resize to switch layouts") |
| Mobile builds a parallel data layer "for performance" | Forbidden — perf optimizations go in the shared data layer where desktop benefits too |
| Mobile loses access to keyboard shortcuts and feels less powerful | KeyboardHelperBar surfaces the top 5–6 shortcuts as on-screen buttons; advanced users see the same actions, just via taps |

### Sequencing

Realistic phased delivery:

1. **Layout switch + ReadingView only.** Mobile users can read any verse, URL works, but no navigation deeper than scrolling. Smallest shippable. ~1 week.
2. **StructurePicker bottom sheet.** Now users can navigate to verses. ~1 week.
3. **VerseDetailsSheet bottom sheet.** Now users can see translations + tags + commentary. ~1 week.
4. **ChordIndicator + cross-column highlight previews.** Now the synchronized vocabulary is properly conveyed peripherally. ~1 week.
5. **Polish + KeyboardHelperBar + long-press tag preview.** ~1 week.

That is 4–6 focused weeks. The audit's earlier estimate of "weeks per phase" stands, but those weeks are now scoped concretely.

---

## 10. Recommended Path (If You Decide to Do It)

In order of *value per hour of work*. Each step is independently shippable.

### Phase 0 — Stop telling mobile users to go away
- Remove the UA sniff in `index.php` (or its equivalent in the Amplify rewrite).
- Replace `mobile.html` with a friendly *"reading mode coming soon"* page that at minimum shows the verse text for any URL.
- **Why first:** legal/SEO benefit (Googlebot is mobile-first now and is being told the site doesn't support it).

### Phase 1 — Build a single-column "read mode" route
- New route: `/read/:chapter/:verse` rendered only when `window.innerWidth < 768`.
- Reuses existing data layer + `routeCodec` — no new backend.
- Renders Passage column content only, with chapter/verse pickers as bottom sheets.
- Desktop continues to use the existing app untouched.
- **Why second:** smallest scope that gives mobile users something real, and the result is shippable on day one.

### Phase 2 — Replace `body.narrow` with proper breakpoints
- Introduce a breakpoint vocabulary in CSS (`--bp-mobile: 480px; --bp-tablet: 1024px; --bp-desktop: 1530px;`).
- Convert `.col1/.col2/.col3/.col2b` from float-based to CSS Grid (one rule, three breakpoints).
- Delete the 118-line `body.narrow` block; it's replaced by 30 lines of `@media`.
- **Why third:** unblocks tablet support without redesigning interactions.

### Phase 3 — Touch interactions
- Audit every `onMouseEnter`/`onMouseLeave` and decide: replace with tap-to-reveal, long-press, or simply remove for mobile.
- Add a virtual keyboard helper bar at the bottom of the screen for the most-used shortcuts (next/prev verse, play audio, toggle commentary).
- **Why fourth:** by this point, you actually have users on tablets giving feedback about what they miss.

### Phase 4 — Fluid typography pass
- Replace `font-size: 16px` with `font-size: clamp(14px, 1.2vw + 0.5rem, 18px)` family-by-family.
- Can be automated with a codemod over the 84 declarations.
- **Why last:** it's polish; nothing else depends on it.

---

## 11. What NOT to Do

- **Don't `transform: scale()` the 1920px canvas to fit small screens.** The dead `checkZoom()` code already tried this. Text becomes unreadable, hit targets become un-tappable, and the browser's accessibility tooling reports the wrong sizes to assistive tech.
- **Don't add a 5th "phone mode" CSS class** parallel to `body.narrow`. That path leads to 4× the CSS for half the experience. Proper `@media` breakpoints are the right primitive.
- **Don't rewrite the desktop app** to make it responsive in place. The desktop app *works* and serves users. The mobile experience is a different product; build it as a separate route or app, not as a refactor of the existing one.
- **Don't try to make hover-previews work on touch with `:hover` + `:focus` polyfills.** They never feel right. Design the touch interaction from scratch.

---

## 12. The Honest Conclusion

The app is hard to make responsive because the **four columns are four different content types**, each with a hard content-defined width floor (a 1,292-verse grid that has to read as a shape, justified prose with a known-good line length, a 4-up translation comparator, etc.). The 1920px canvas is the sum of those floors, not the cause of them.

That reframes the problem:

- It is **not** "the CSS is locked to one resolution."
  It **is** "the product requires four content-rich panels to be visible simultaneously, and three of them physically cannot shrink past their content's needs."

- It is **not** "make the columns fluid."
  It **is** "decide which columns get dropped at which breakpoint, because they cannot all fit."

The cost of mobile support is high because the four-column simultaneous-display UX **is** the product. Phones cannot show four columns; they can show one. So mobile cannot be "the same app, smaller" — it has to be a deliberately different product (probably reading-mode-only with a way to drill into structure/verse details on tap) that lives alongside the desktop app and reuses the existing data layer, routing layer (post-migration), and component model.

The good news: you will not be rewriting the app for mobile. You will be writing a *second, smaller app* on top of the same data — and because each desktop column is already a self-contained React component with a self-contained content type, those components are the right unit to *select from* on mobile rather than to *shrink*.
