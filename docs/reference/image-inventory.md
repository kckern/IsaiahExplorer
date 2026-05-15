# Image, Icon, Font & Glyph Inventory

Exhaustive inventory of every visual binary asset and every Unicode glyph used
as an icon in the Isaiah Explorer codebase. Generated to support an eventual
conversion of these raster assets to SVG.

All paths in this document are absolute, rooted at the repository checkout
`/Users/kckern/Documents/GitHub/IsaiahExplorer`.

## Totals at a glance

| Category | Count |
|---|---|
| Interface icons / GIFs / SVG on disk (`src/img/interface/*`) | 25 files |
| Structure thumbnails (`src/img/structures/*.png`) | 16 files |
| Version cover thumbnails (`src/img/versions/*.jpg`) | 93 files |
| Commentary source thumbnails (`src/img/commentaries/*.jpg`) | 23 files |
| Web fonts in `src/img/fonts/` | 3 files (Comfortaa woff/woff2 + scripture woff2) |
| Public-root static assets (favicon, scroll, icon, fonts, html, php) | 5 binary assets (`favicon.ico`, `icon.png`, `scroll.jpg`, `goudybol.ttf`, `scripture.ttf`) |
| External image URLs referenced from JSX/CSS | 1 active (`scripture-guide-assets` S3 scroll JPGs) + 1 commented-out |
| CSS `background-image: url(...)` references | 2 active (`collapse.png`, `expand.png`) + 1 commented-out |
| Inline Unicode glyphs used as icons in JSX (`▽ ▷ ⤷ □ ▫ ▼ ► ⚙ ⋯ ⇦ ⇨ « » ● ○ ⦗ ⦘ × etc.`) | ~38 JSX/string call-sites across 9 components |
| Pseudo-element icons in CSS (`content:"…"`) | 2 (`◀`, `▼` in `.tagtree` branch toggle) |

---

## 1. UI icons (`src/img/interface/`)

Raster icons used for interface controls. All paths below are
`/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/interface/<file>`.

| Asset | Used by (file:line) | Semantic role |
|---|---|---|
| `settings.png` | `src/App.js:4` import → `src/App.js:189` | Open user settings (top-left cog in `<h1>`) |
| `video.png` | `src/App.js:5` import → `src/App.js:202` | Open video tutorial overlay |
| `close.png` | `src/Components/Commentary.js:3` import → `src/Components/Commentary.js:40`, `:50`; `src/Components/Settings/Settings.js:64` (inline `require`) | Close commentary panel / close settings dialog (X button) |
| `play.png` | `src/Components/Verse.js:6` import → `:42`, `:46`, `:50`; `src/Components/AudioToolbar.js:6` import → `:29` (`verseIcon` default), `:38` (`commIcon` default), eventually rendered at `:161`, `:171` | Play verse audio / play commentary audio idle state |
| `pause.png` | (file exists on disk; **no source reference found** — appears unused. Pause state currently uses `audio.gif`.) | Pause control (orphan asset) |
| `audio.png` | `src/Components/Passage.js:9` import → `:476` (rendered via `audioimg` for versions with `audio===1`); `src/Components/Settings/Settings/Version.js:19` (inline `require`) | "Has audio" badge next to a version |
| `audio.gif` | `src/Components/AudioToolbar.js:7` import (`playing_icon`) → `:32` (verse playing), `:41` (commentary playing), rendered at `:161`/`:171` | Animated audio-playing indicator |
| `audioload.gif` | `src/Components/AudioToolbar.js:8` import (`loading_icon`) → `:31` (verse loading), `:40` (commentary loading), rendered at `:161`/`:171` | Audio buffering spinner |
| `comment.png` | `src/Components/AudioToolbar.js:9` import → `:181` | Open written commentary panel (Read button) |
| `tag.png` | `src/Components/Tags.js:7` import → `:126`; `src/Components/Passage.js:8` import → `:134`; `src/Components/Structure.js:6` import → `:124` (`gridTag` per section) | Tag mode toggle / per-section tag indicator (Tipsy library tag icon) |
| `hebrew.png` | `src/Components/Verse.js:8` import → `:77` (`hebimg` rendered in heading_subtitle at `:100`) | Open Hebrew lexicon / Strong's view for active verse |
| `gear.png` | (file exists on disk; **no source reference found** — gear glyph in the audio toolbar now uses the Unicode `⚙` character, see §10) | Audio-toolbar settings (orphan PNG) |
| `sprocket.png` | (file exists on disk; **no source reference found**) | Likely older settings-cog (orphan asset) |
| `collapse.png` | `src/App.css:3260` `background-image: url(./img/interface/collapse.png)` on `.treegrid-expander-expanded` | Tag-tree row "expanded" caret |
| `expand.png` | `src/App.css:3261` `background-image: url(./img/interface/expand.png)` on `.treegrid-expander-collapsed` | Tag-tree row "collapsed" caret |

### Loading animations (sub-section of UI icons)

| Asset | Used by (file:line) | Semantic role |
|---|---|---|
| `book.gif` | `src/App.js:114` (preload); `src/Components/Commentary.js:399` rendered as `<img class="loading" …>` | Generic / commentary-loading spinner |
| `message.gif` | `src/Components/Verse.js:7` import → `:57` ("Loading Verse Details…") | Verse-column loading spinner |
| `typing.gif` | `src/Components/Passage.js:6` import → `:110` ("Loading Passage Text…") | Passage-column loading spinner |
| `version_loading.gif` | `src/App.js:1361` (preload); `src/Components/Passage.js:7` import → `:129` (replaces `version_img` while a new version is being fetched) | Version-cover swap-in placeholder during fetch |
| `loadingwave.gif` | `src/Components/Section.js:4` import → `:40` ("Loading Available Outlines…") | Section/outline column loading spinner |
| `loadingdna.gif` | `src/Components/Structure.js:5` import → `:42` ("Loading Available Structures…") | Structure column loading spinner |
| `loading.svg` | (file on disk; **no source reference found** — orphan; the only `.svg` in `src/img/`) | Orphan generic spinner |
| `equalizer.gif` | (file exists on disk; **no source reference found**) | Orphan animated audio meter |
| `tipsy.gif` | (file exists on disk; **no source reference found** — note `Tipsy` here means the `react-tipsy` tooltip library used by `src/App.js:16`, `Verse.js:5`, `Hebrew.js:3`, not this GIF) | Orphan asset |
| `gears.gif` | (file on disk; only reference is a commented-out `/* background:url("/img/gears.gif") … */` at `src/App.css:2606`) | Historical loading spinner; currently dead |

> **Orphans summary.** Files in `src/img/interface/` with no live reference in the codebase: `pause.png`, `gear.png`, `sprocket.png`, `loading.svg`, `equalizer.gif`, `tipsy.gif`, `gears.gif`. The SVG conversion plan can either drop these or keep them as a deliberate stub for the gear/pause UI states.

---

## 2. Tag icons (Tipsy/react-tipsy decoration)

`tag.png` (covered in §1) is the only `tag.*` asset on disk. Despite the user
prompt mentioning "Tipsy library icons", the only Tipsy in this repo is the
`react-tipsy` tooltip package (not the jQuery Tipsy lib); it ships no per-icon
PNGs. The visual "tag" iconography is entirely the single
`src/img/interface/tag.png`, used in three components:

- `src/Components/Tags.js:126` — tag-column title decoration.
- `src/Components/Passage.js:134` — passage heading tag-mode toggle (`#tagIcon`).
- `src/Components/Structure.js:124` — per-section `.gridTag` clickable marker.

---

## 3. Loading animations (consolidated)

(Repeats the GIFs from §1 for plan convenience.)

| File | Used by | Role |
|---|---|---|
| `src/img/interface/book.gif` | App.js preload (`:114`), Commentary.js:399 | Commentary loading |
| `src/img/interface/message.gif` | Verse.js:7 / :57 | Verse-detail loading |
| `src/img/interface/typing.gif` | Passage.js:6 / :110 | Passage-text loading |
| `src/img/interface/version_loading.gif` | App.js preload (`:1361`), Passage.js:7 / :129 | Version-cover fallback while a new version fetches |
| `src/img/interface/loadingwave.gif` | Section.js:4 / :40 | Outline-list loading |
| `src/img/interface/loadingdna.gif` | Structure.js:5 / :42 | Structure-list loading |
| `src/img/interface/audio.gif` | AudioToolbar.js:7 / :32, :41 (rendered :161, :171) | Audio playing animation |
| `src/img/interface/audioload.gif` | AudioToolbar.js:8 / :31, :40 (rendered :161, :171) | Audio buffering animation |
| `src/img/interface/equalizer.gif` | (orphan) | Unused |
| `src/img/interface/tipsy.gif` | (orphan) | Unused |
| `src/img/interface/gears.gif` | (orphan, mentioned only in commented CSS at App.css:2606) | Historical |

---

## 4. Structure section thumbnails (`src/img/structures/`)

Loaded dynamically by shortcode via `require('../img/structures/'+shortcode+'.png')`.
There are 16 PNGs, one per structure shortcode.

Call-sites:
- `src/Components/Structure.js:61` — large title image for currently-active structure.
- `src/Components/Structure.js:233` — option-list thumbnail per available structure.
- `src/Components/Verse.js:380` — `<img alt="Logo" …>` next to each section row in the structure breakdown for a verse.
- `src/Components/Settings/Settings/Structure.js:31` — option-row thumbnail in the structure settings list (`className="structure_title_icon"`).
- `src/Components/Settings/Preview/Structure.js:15` — preview-pane title image inside `<h3>`.

Files (alphabetical):

```
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/structures/7part.png
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/structures/authorship.png
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/structures/babylon.png
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/structures/beyer.png
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/structures/bibleproject.png
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/structures/hero.png
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/structures/hm.ex.rt.png
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/structures/literary.png
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/structures/mal-ben.png
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/structures/motyer.png
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/structures/msg.png
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/structures/tests.png
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/structures/ugaritic.png
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/structures/whole.png
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/structures/wikipedia.png
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/structures/zion.png
```

Each shortcode corresponds to one entry in `globalData["structures"]`; the
shortcode is taken from `state.structure`, `option.shortcode`, `item.shortcode`
or `meta.shortcode` at the call-sites above.

---

## 5. Version cover thumbnails (`src/img/versions/`)

Loaded dynamically by lower-cased shortcode via
`require('../img/versions/'+shortcode.toLowerCase()+'.jpg')`. There are 93 JPGs.

Call-sites:
- `src/App.js:1363` — preloads every version cover after globalData is fetched.
- `src/App.js:1610` — preloads cover for the version that is being switched in.
- `src/Components/Passage.js:128` — `version_img` in the passage heading.
- `src/Components/Passage.js:487` — version drawer/option row.
- `src/Components/Verse.js:92` — per-version cover inside the verse meta.
- `src/Components/Verse.js:189` — per-version column header in the per-verse comparison table.
- `src/Components/Verse.js:322` — per-version cover in the verse outline list.
- `src/Components/Section.js:53` — section-column outline-logo (clickable to open drawer).
- `src/Components/Section.js:269` — option row in the outline-selection drawer.
- `src/Components/Settings/Settings/Version.js:32` — option row in version-prefs panel.
- `src/Components/Settings/Settings/Outline.js:31` — option row in outline-prefs panel.
- `src/Components/Settings/Preview/Version.js:13` — large preview cover in settings details panel.
- `src/Components/Settings/Preview/Outline.js:16` — large preview cover in outline-settings details panel.

Files (alphabetical, 93 total):

```
1829.jpg  1830.jpg  1833.jpg  1835.jpg  1837.jpg  1840.jpg  1841.jpg  1879.jpg
1920.jpg  1981.jpg  2013.jpg  abwrks.jpg amp.jpg   ampc.jpg  anchor.jpg asitis.jpg
asitis72.jpg asitis74.jpg asv.jpg ceb.jpg cev.jpg chapters.jpg clearquran.jpg csb.jpg
earliest.jpg easwaran.jpg erv.jpg esv.jpg gfronsdal.jpg gnt.jpg gnv.jpg gw.jpg
hbrs.jpg  hcsb.jpg  icb.jpg   iinst.jpg jb.jpg    jst.jpg   kj21.jpg  kjv.jpg
law.jpg   lds-bm.jpg lds-bom2.jpg lds-dc.jpg lds-dc2.jpg lds-lec.jpg lds-nt.jpg lds-nt2.jpg
lds-ot.jpg lds-ot2.jpg lds-pgp.jpg lds-pgp2.jpg lds-qur.jpg lds.jpg ldskjv.jpg leb.jpg
lec.jpg   lof.jpg   mbook.jpg mev.jpg   miller.jpg morma.jpg motyer.jpg msg.jpg
muller.jpg nasb.jpg nasr.jpg  net.jpg   niv.jpg   nkjv.jpg  nlt.jpg   nlv.jpg
nmb.jpg   nog.jpg   nrsv.jpg  nte.jpg   nwt.jpg   nwt84.jpg pebom.jpg pgp.jpg
printer.jpg rebom.jpg redc.jpg rsv.jpg  slbom.jpg snuffer.jpg tlb.jpg  tsp.jpg
tyn.jpg   voice.jpg web.jpg   wyc.jpg   yali.jpg
```

(All under `/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/versions/`.)

> Note: `motyer.jpg` and `msg.jpg` exist in **both** `src/img/versions/` and
> `src/img/structures/` (as `.png` in structures). They are distinct assets
> for distinct purposes (version cover vs. structure icon).

---

## 6. Commentary source thumbnails (`src/img/commentaries/`)

Loaded dynamically by source shortcode via
`require('../img/commentaries/'+source+'.jpg')`.

Call-site:
- `src/Components/Commentary.js:277` — `<img class="ver" …>` next to commentary heading.

Files (23 total):

```
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/commentaries/barnes.jpg
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/commentaries/benson.jpg
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/commentaries/blenkinsopp.jpg
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/commentaries/brewster.jpg
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/commentaries/btw.jpg
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/commentaries/bullinger.jpg
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/commentaries/calvin.jpg
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/commentaries/clarke.jpg
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/commentaries/ellicott.jpg
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/commentaries/gileadi.jpg
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/commentaries/hcc.jpg
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/commentaries/henry.jpg
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/commentaries/kdo.jpg
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/commentaries/ldsces.jpg
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/commentaries/ludlow.jpg
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/commentaries/mckenzie.jpg
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/commentaries/mhm.jpg
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/commentaries/niv.jpg
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/commentaries/nyman.jpg
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/commentaries/oswalt.jpg
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/commentaries/parry.jpg
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/commentaries/poet.jpg
/Users/kckern/Documents/GitHub/IsaiahExplorer/src/img/commentaries/wen.jpg
```

---

## 7. Fonts

### 7a. App fonts shipped with the bundle (`src/img/fonts/`)

| File | Declared in | Family / role |
|---|---|---|
| `src/img/fonts/scripture.woff2` | `src/App.css:10–14` (`@font-face { font-family:"Goudy Scripture"; src:url('./img/fonts/scripture.woff2') format('woff2'); }`) | Display font for verse text |
| `src/img/fonts/Comfortaa.woff2` | `src/App.css:18–24` (`@font-face { font-family:"Comfortaa"; src:url(...) }`) | UI display font |
| `src/img/fonts/Comfortaa.woff` | `src/App.css:23` (woff fallback for older browsers) | UI display font, legacy format |

### 7b. Server / OG fonts in `public/`

| File | Used by (file:line) | Role |
|---|---|---|
| `public/scripture.ttf` | `app/og/route.tsx:27` (`fs.readFileSync(...'scripture.ttf')`) → registered with `next/og` `ImageResponse` `fonts:[…]` at `:139–146` | OG / Twitter card hero font ("Goudy Scripture" 400) |
| `public/goudybol.ttf` | `public/image.php:87` (`$font = './goudybol.ttf';` → `imagettftext`) | Legacy PHP cover-image generator font |

> External font: Roboto Condensed (UI) is pulled via Google Fonts in
> `app/layout.tsx:16–21` (no local file).

---

## 8. Public-root static assets

Items at the top level of `/Users/kckern/Documents/GitHub/IsaiahExplorer/public/`:

| File | Used by | Role |
|---|---|---|
| `public/favicon.ico` | Served automatically by Next.js from `/favicon.ico`; no explicit reference in code | Browser tab icon |
| `public/icon.png` | Served from `/icon.png`; no explicit reference in code (legacy CRA touch-icon) | App icon (likely PWA / Apple touch-icon) |
| `public/scroll.jpg` | `app/og/route.tsx:33` (base64-inlined as background texture for the OG card); `public/image.php:74` (`imagecreatefromjpeg("scroll.jpg")`); `public/server.php:95` (`<meta name="twitter:image:src" content=".../scroll.jpg">`) | Parchment background for OG / social cards |
| `public/goudybol.ttf` | See §7b | PHP font |
| `public/scripture.ttf` | See §7b | next/og font |

(Other `public/` items — `com/`, `core/`, `text/`, `*.php`, `*.html`, `sitemap.xml`, `googlef67b19954f244adc.html` — are data, server-side templates, or Google site-verification, not visual assets.)

---

## 9. External image URLs referenced from JSX / CSS

| URL | Location | Role |
|---|---|---|
| `https://scripture-guide-assets.s3.us-west-2.amazonaws.com/scroll/<verse_id>.jpg` | `src/Components/Hebrew.js:124` and `:128` — used as inline `backgroundImage` for the Hebrew scroll display panel (`.hebrew_scroll`) | Per-verse scroll-photograph background, keyed on `state.active_verse_id` |
| `http://old.isaiah.scripture.guide/img/scroll/verses/18658.jpg` | `src/Components/Hebrew.js:121` — **commented out**, kept as a historical pointer to the previous host | (Dead reference) |
| `https://fonts.googleapis.com/...Roboto+Condensed...` | `app/layout.tsx:19` | Google Fonts stylesheet (UI font) |

No other `http(s)://*.(png\|jpg\|jpeg\|gif\|svg\|webp)` references exist in `src/` or `app/`.

---

## 10. Inline Unicode glyphs used as visual icons in JSX/JS

These characters are rendered directly as text in JSX (or assembled into
strings) where the role is iconographic rather than typographic. They are
candidates for SVG replacement alongside the raster icons.

### 10a. Generic structural / heading glyphs

| Glyph | File:line(s) | Where it appears | Semantic role |
|---|---|---|---|
| `□` (WHITE SQUARE, U+25A1) | `src/Components/Section.js:38`, `:52`; `src/Components/Passage.js:100`, `:202`; `src/Components/Structure.js:40`, `:55`; `src/Components/Verse.js:34`, `:63` | Inline at start of every `.heading_title` / `#outline_title` block | Visual bullet for a column's title row |
| `▽` (WHITE DOWN-POINTING TRIANGLE, U+25BD) | `src/Components/Passage.js:104`, `:149`; `src/Components/Search.js:188`, `:199`, `:204`; `src/Components/Hebrew.js:198` | Inside `<span class="section_tile">▽ {sectionTitle}</span>` | Down-caret prefix to a section/subsection title |
| `▷` (WHITE RIGHT-POINTING TRIANGLE, U+25B7) | `src/Components/Passage.js:106`, `:151`; `src/Components/Search.js:188`, `:199`, `:204`; `src/Components/Hebrew.js:199` | Plain text inside `.text_heading` between `<span id="drarrow">⤷</span>` and the heading title | Right-caret prefix to a heading title |
| `⤷` (ARROW POINTING DOWNWARDS THEN CURVING RIGHTWARDS, U+2937) | `src/Components/Passage.js:106`, `:151`; `src/Components/Search.js:188`, `:199`, `:204`; `src/Components/Hebrew.js:199`; `src/Components/Commentary.js:149` | `<span id="drarrow">⤷</span>` and inside commentary `<option>` text | Indent / "drill-down" decoration before subordinate heading or commentary entry |

### 10b. Audio toolbar / settings

| Glyph | File:line(s) | Role |
|---|---|---|
| `⚙` (GEAR, U+2699) | `src/Components/AudioToolbar.js:111` (`<button …>⚙</button>` audio-gear); `src/Components/Verse.js:38` (disabled placeholder `<button class="audio-gear" …>⚙</button>`) | Settings gear in audio toolbar (replaces former `gear.png`) |
| `×` (MULTIPLICATION SIGN, U+00D7) | `src/Components/AudioToolbar.js:124` (`{rate}×`) | Playback-speed suffix on speed chips (e.g. "1.5×") |
| `●` (BLACK CIRCLE, U+25CF) | `src/Components/AudioToolbar.js:142` (`{isActive ? "●" : "○"}`) | Selected commentary-source bullet |
| `○` (WHITE CIRCLE, U+25CB) | `src/Components/AudioToolbar.js:142` (same conditional) | Unselected commentary-source bullet |

### 10c. Commentary navigation

| Glyph | File:line(s) | Role |
|---|---|---|
| `⋯` (MIDLINE HORIZONTAL ELLIPSIS, U+22EF) | `src/Components/Commentary.js:144` (default `<option value="top">⋯</option>`), `:159` (`<span class="more">⋯</span>`) | "More commentary sources" affordance |
| `⇦` (LEFTWARDS WHITE ARROW, U+21E6) | `src/Components/Commentary.js:270` (`<div class="prev" id="com_prev">⇦</div>`) | Previous commentary item |
| `⇨` (RIGHTWARDS WHITE ARROW, U+21E8) | `src/Components/Commentary.js:273` (`<div class="next" id="com_next">⇨</div>`) | Next commentary item |

### 10d. Tag panel navigation

| Glyph | File:line(s) | Role |
|---|---|---|
| `»` (RIGHT-POINTING DOUBLE ANGLE QUOTATION, U+00BB) | `src/Components/Tags.js:114` (`#tag_next` button); `src/Components/Tags.js:151` (separator between parent-link breadcrumbs); `src/Components/Verse.js:258` (joiner in `.pedigree` breadcrumb: `tagData.parents.join(" » ")`) | Next tag / breadcrumb separator |
| `«` (LEFT-POINTING DOUBLE ANGLE QUOTATION, U+00AB) | `src/Components/Tags.js:116` (`#tag_prev` button) | Previous tag |

### 10e. Verse / structure positional indicators

| Glyph | File:line(s) | Role |
|---|---|---|
| `⦗` (LEFT BLACK TORTOISE-SHELL BRACKET, U+2997) | `src/Components/Verse.js:342` (`var count = "⦗" + (index + 1) + "/" + structure.length + "⦘";`) | Left bracket for "n/N" verse position counter inside structure breakdown |
| `⦘` (RIGHT BLACK TORTOISE-SHELL BRACKET, U+2998) | `src/Components/Verse.js:342` (same line) | Right bracket of the same counter |

### 10f. Passage-text marker glyphs (used as formatting tokens, not visible UI icons)

These glyphs appear in the source verse text and are split/replaced rather than
rendered as standalone icons; they're listed here for completeness because a
font/SVG migration must continue to recognise them.

| Glyph | File:line(s) | Role |
|---|---|---|
| `▫` (WHITE SMALL SQUARE, U+25AB) | `src/Components/Passage.js:249`, `:258`, `:263` | Verse-start marker prepended to every verse before splitting |
| `▼` (BLACK DOWN-POINTING TRIANGLE, U+25BC) | `src/Components/Passage.js:258`, `:263`, `:267`; `src/App.css:3445` (`content:"▼"` on `.tagtree .branch.open .taglink:before`) | Poetry-block marker in raw verse text; also CSS-only "expanded tag" caret |
| `▲` (BLACK UP-POINTING TRIANGLE, U+25B2) | `src/Components/Passage.js:258`, `:263` | Inverse poetry marker in raw text split regex |
| `►` (BLACK RIGHT-POINTING POINTER, U+25BA) | `src/Components/Passage.js:258`, `:263`, `:268` | Prose-block marker in raw verse text |
| `¶` (PILCROW, U+00B6) | `src/Components/Passage.js:28`, `:29`, `:258`, `:263`, `:269` | Paragraph break marker in raw verse text |
| `§` (SECTION SIGN, U+00A7) | `src/Components/Passage.js:258`, `:263` | Section-break marker in raw verse text |
| `◀` (BLACK LEFT-POINTING POINTER, U+25C0) | `src/App.css:3435` (`content:"◀"` on `.tagtree .branch .taglink:before`) | Collapsed-tag caret |

### 10g. Other Unicode used decoratively in text strings

| Glyph | File:line | Role |
|---|---|---|
| `•` (BULLET, U+2022) | `src/Components/Hebrew.js:200` (`<span class="hphon"> • {p}</span>`) | Separator between Hebrew word and phonetic |
| `·` (MIDDLE DOT, U+00B7) | `app/og/route.tsx:44` (`Isaiah ${chapter}:${verse} · ${shortcode}`) | Reference / version separator on OG card |
| `‑` / `‑` (NON-BREAKING HYPHEN, U+2011) | `src/Components/Search.js:185` (`Multi‑verse Audio Commentary`) | Non-breaking hyphen in label text |
| `…` (HORIZONTAL ELLIPSIS, U+2026) | `app/og/route.tsx:49` (truncation suffix) | Text-truncation ellipsis on OG card |

> Pure punctuation (em/en dashes `— –`, curly quotes `“ ” ‘ ’`, minus-sign
> `−`) and box-drawing characters used only in JSDoc banners are typographic,
> not iconographic, and are intentionally **not** included in §10.

---

## Appendix A: Components → assets cross-reference

For quick orientation when refactoring a single component.

| Component | Static imports / requires | Inline glyphs |
|---|---|---|
| `src/App.js` | `settings.png` (top-left), `video.png` (top-right), preloads `book.gif`, `version_loading.gif`, all `versions/*.jpg` | — |
| `src/Components/Section.js` | `loadingwave.gif`, dynamic `versions/{outline}.jpg` | `□` |
| `src/Components/Structure.js` | `loadingdna.gif`, `tag.png`, dynamic `structures/{shortcode}.png` | `□` |
| `src/Components/Verse.js` | `play.png`, `message.gif`, `hebrew.png`, dynamic `versions/{shortcode}.jpg`, dynamic `structures/{shortcode}.png` | `□`, `⚙` (disabled placeholder), `»`, `⦗`, `⦘` |
| `src/Components/Passage.js` | `typing.gif`, `version_loading.gif`, `tag.png`, `audio.png`, dynamic `versions/{shortcode}.jpg` | `□`, `▽`, `▷`, `⤷`, `▫`, `▼`, `►`, `¶`, `§` |
| `src/Components/Tags.js` | `tag.png` | `»`, `«` |
| `src/Components/Audio.js` | — | — |
| `src/Components/AudioToolbar.js` | `play.png`, `audio.gif`, `audioload.gif`, `comment.png` | `⚙`, `×`, `●`, `○` |
| `src/Components/AudioMenuPopover.js` | — | — |
| `src/Components/Commentary.js` | `close.png`, `book.gif`, dynamic `commentaries/{source}.jpg` | `⋯`, `⤷`, `⇦`, `⇨` |
| `src/Components/Search.js` | — | `▽`, `▷`, `⤷`, `‑` |
| `src/Components/Hebrew.js` | — (external S3 scroll JPG via `backgroundImage`) | `▽`, `▷`, `⤷`, `•` |
| `src/Components/VerseBox.js`, `src/Components/VideoBox.js` | — | — |
| `src/Components/Settings/Settings.js` | `close.png` | — |
| `src/Components/Settings/Settings/Version.js` | `audio.png`, dynamic `versions/{shortcode}.jpg` | — |
| `src/Components/Settings/Settings/Outline.js` | dynamic `versions/{shortcode}.jpg` | — |
| `src/Components/Settings/Settings/Structure.js` | dynamic `structures/{shortcode}.png` | — |
| `src/Components/Settings/Preview/Version.js` | dynamic `versions/{shortcode}.jpg` | — |
| `src/Components/Settings/Preview/Outline.js` | dynamic `versions/{shortcode}.jpg` | — |
| `src/Components/Settings/Preview/Structure.js` | dynamic `structures/{shortcode}.png` | — |
| `src/App.css` | `@font-face` Comfortaa + Goudy Scripture; `background-image: collapse.png` / `expand.png` | CSS `content:"◀"`, `content:"▼"` |
| `app/layout.tsx` | Google Fonts (Roboto Condensed) | — |
| `app/og/route.tsx` | `public/scripture.ttf`, `public/scroll.jpg` | `·`, `…` |
| `public/server.php` | references `/scroll.jpg` in meta tags | — |
| `public/image.php` | `scroll.jpg`, `goudybol.ttf` (legacy cover generator) | — |

---

## Appendix B: Orphaned assets (on disk, no live reference)

Candidates for deletion or deliberate adoption during SVG conversion:

```
src/img/interface/pause.png
src/img/interface/gear.png        (superseded by inline ⚙ Unicode glyph)
src/img/interface/sprocket.png
src/img/interface/loading.svg
src/img/interface/equalizer.gif
src/img/interface/tipsy.gif
src/img/interface/gears.gif       (only mentioned in a commented-out CSS rule)
```

These have no `import`, `require()`, or string reference anywhere in
`src/`, `app/`, or `lib/`.
