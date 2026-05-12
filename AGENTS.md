# Isaiah Explorer — Agent Guide

## Project Overview

Isaiah Explorer is an interactive Bible study tool for the Book of Isaiah. It runs as a React SPA (web) or Electron desktop app. Users can browse Isaiah's 66 chapters through multiple scholarly structural frameworks, read 30+ translations, explore thematic tags, and study Hebrew text with Strong's concordance integration.

Live URL shape: `/#/structure/outline/VERSION/chapter/verse[/tag.slug][/search.query][/hebrew.NNNN][/commentary.source/id]`

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 16 — **class components only, no hooks** |
| Build | Create React App 3 + `@rescripts` (for Electron variant) |
| Desktop | Electron 6 + `electron-builder` |
| State | Single root `App` class state — no Redux, no Context API |
| Data | `pako` (zlib inflate) + `atob` — all large datasets are gzip+base64-encoded `.txt` files |
| Routing | React Router v6 (BrowserRouter on web, MemoryRouter in Electron) — clean paths, no hash; see `docs/plans/react-router-migration-plan.md` |
| Backend | PHP (`server.php`, `index.php`) for OG/meta tags only — no REST API |

---

## Directory Structure

```
/
├── package.json               # CRA + Electron config; build scripts; author: KC Kern
├── public/
│   ├── electron.js            # Electron main process (window, IPC, native menus)
│   ├── preload.js             # Exposes ipcRenderer to renderer
│   ├── index.html             # CRA shell + Clicky analytics
│   ├── server.php / index.php # PHP: parse URL → emit OG meta tags for SEO only
│   ├── core/
│   │   ├── core.txt           # PRIMARY DATA: base64(gzip(JSON)) — structures, outlines, tags, index
│   │   ├── meta.json          # Plain JSON metadata for structures, outlines, versions, commentaries
│   │   └── tags_hl.txt        # Tag highlight data (compressed)
│   ├── text/
│   │   ├── index.txt          # Verse ID↔chapter/verse mapping (compressed)
│   │   ├── verses_KJV.txt     # Per-translation verse text (compressed); ~30 files
│   │   ├── words_HEB.txt      # Hebrew word data with Strong's numbers (compressed)
│   │   └── verses_*.txt       # Other translations (NIV, ESV, NRSV, MSG, NLT, NASB, …)
│   └── com/
│       └── barnes.NNNN.json   # Albert Barnes commentary entries, one JSON file per entry
└── src/
    ├── index.js               # ReactDOM.render(<HashRouter><RouterShell/></HashRouter>)
    ├── App.js                 # Root class component (~2500 lines) — all app logic
    ├── globals.js             # Mutable global singleton: `globalData`
    ├── App.css
    └── Components/
        ├── Structure.js       # Column 1: structural section panel
        ├── Section.js         # Column 2: outline/headings panel
        ├── Verse.js           # Column 3: verse list panel
        ├── Passage.js         # Column 4: reading pane
        ├── VerseBox.js        # Reusable verse renderer
        ├── Commentary.js      # Commentary panel (lazy-loaded per verse)
        ├── Hebrew.js          # Hebrew text + Strong's concordance panel
        ├── Tags.js            # Tag system + TagFloater overlay
        ├── Audio.js           # Audio playback
        ├── Search.js          # Search UI
        ├── VideoBox.js        # Tutorial video modal
        └── Settings/
            ├── Settings.js
            ├── StructureSettings.js
            ├── OutlineSettings.js
            ├── VersionSettings.js
            └── Preview/       # Version/Outline/Structure preview panes
```

---

## Architecture Patterns

### State Management
- **All state lives in `App.js`**. `App` is the single source of truth.
- Every child component receives `app={this}` — a direct reference to the root `App` instance. Components read `app.state.*` and call `app.setActiveVerse()`, `app.setState()`, etc. directly.
- There is **no Redux, no MobX, no Context API**.

### Global Data (`globalData`)
- Defined in `src/globals.js` as a mutable object export.
- Populated once during `loadCore()` after decompressing `core/core.txt`.
- Contains: `index`, `structures`, `outlines`, `tags`, `commentary`, `meta`, `custom`, and more.
- **Mutated in place** throughout the app; never reassigned entirely.

### Data Loading
- `loadCore()` → `fetch("core/core.txt")` → pako inflate + JSON.parse → `globalData`.
- `loadVersion(shortcode)` → `fetch("text/verses_${shortcode}.txt")` → decompress → cache in `globalData`. Called lazily when the user switches translation.
- Commentary is loaded per-entry: `fetch("com/barnes.${id}.json")`.

### Routing
- React Router v6 is the routing runtime. **BrowserRouter** on web (clean paths, no `#`), **MemoryRouter** in Electron (file:// has no URL bar).
- Entry: `index.js` wraps `<RouterShell>` in the correct router based on `is-electron`.
- `src/routing/routeCodec.js` owns all URL parse/build logic: `parseRoute(path)` and `buildRoute(state, getTagSlug)`. No route regex exists in App.js.
- `App.js` calls `parseRoute()` in `getSettingsFromUrl()` (reads `this.props.location.pathname`) and `buildRoute()` in `setUrl(replace)`, which calls `this.props.navigate` (injected by `withRouter` HOC). `replace=true` for keyboard/audio stepping to avoid history flooding.
- `src/routing/RouterShell.js` declares all routes with `<Routes>/<Route>`, including redirect routes for legacy `/search/:query` and `/hebrew/:strong` slash-form paths.
- `App.js` renders `<Helmet>` with computed `<title>`, `<meta name="description">`, and `<link rel="canonical">` per route for SEO.
- Canonical URL shape: `/:structure/:outline/:version[/tag.:slug][/search.:query][/hebrew.:strong]/:chapter/:verse[/commentary.:source[/:id]]`
- AWS Amplify rewrite rule: all paths → `/index.html` with status 200 (configure in Amplify Console under Rewrites and redirects, or see `amplify.yml` comments).

### Four-Column Layout
- The UI is always: **Structure | Section | Verse | Passage**, with overlays for Settings, Commentary, Hebrew, Tags, Audio, and Video.

### Keyboard Shortcuts
Comprehensive keyboard navigation is defined in `App.js`:
- Arrow keys: navigate verses/headings
- PgUp/PgDn: cycle translations
- Home/End: cycle outlines
- Ins/Del: cycle structures
- Tab: move between columns
- Space: play audio
- `~`: open commentary
- `+`/`-`: cycle tags

### Electron / Web Branching
- `is-electron` package guards Electron-specific code (IPC listeners, `file://` paths, dock icon).
- Native menu events (`structure`, `outline`, `version`) are received via `ipcRenderer`.

### User Preferences
- Top-5 lists (favorite structures, outlines, versions) stored in `localStorage` under key `"settings"`.

---

## Data Formats

### `public/core/core.txt`
Base64-encoded gzip of a large JSON object with keys:
- `index` — `{ verse_id: { chapter, verse } }`
- `structures` — `{ shortcode: [ { verses: [[v_id,...]], heading, ... }, ... ] }`
- `outlines` — `{ shortcode: [ { verses: [v_id], heading }, ... ] }`
- `tags` — `{ tagIndex, tagChildren, tagSiblings, parentTagIndex, verseTagIndex }`
- `commentary` — `{ comIndex, comOrder, comSources }`
- `custom` — per-subdomain whitelist/blacklist config
- `meta` — mirrors `meta.json`

### `public/text/verses_KJV.txt`
Same base64+gzip encoding; decompresses to verse text strings keyed by `verse_id`.

### `public/core/meta.json`
Plain JSON. Top-level keys: `structure`, `outline`, `version`, `commentary`, `audiocom`. Each entry has `shortcode`, `title`, `description`, `details`, `image`, `audio`.

### `public/com/barnes.NNNN.json`
```json
{
  "id": 1001,
  "source": "barnes",
  "verse_id": 17908,
  "verse_count": 1,
  "reference": "13:1",
  "title": "",
  "html": "<p>...</p>",
  "audit": 1
}
```
Internal cross-reference links: `<a class="isa" verses="base64([verse_ids])">`. External refs: `<a class="ref">`.

---

## Build & Dev Commands

| Command | Description |
|---|---|
| `npm start` | CRA dev server (port 3000) |
| `npm run build` | Production build → `build/` |
| `npm test` | CRA test runner |
| `npm run e-dev` | Dev server + Electron together (`concurrently` + `wait-on`) |
| `npm run e-build` | Electron production build (`rescripts build`) |
| `npm run e-pack` | Package for Mac + Windows (`electron-builder -mw`) |

Electron app ID: `guide.scripture.isaiah`. macOS category: Education.

---

## Conventions & Constraints

1. **React 16 class components only.** Do not introduce function components or hooks. The entire codebase uses class components.
2. **No new state management libraries.** All state changes go through `App.setState()`.
3. **`app` prop pattern.** Child components receive `app={this}` from the root `App`. Access state as `this.props.app.state.*` and trigger updates via `this.props.app.methodName(...)`.
4. **No React Router.** All routing is manual hash manipulation in `App.js` (`getSettingsFromUrl` / `setUrl`).
5. **Data files are static and compressed.** Do not add inline data to JS files. Large datasets go in `public/core/`, `public/text/`, or `public/com/` in the same base64+gzip format.
6. **PHP files are SEO-only.** `server.php` and `index.php` only emit meta tags; they are not an API. Do not add API routes to them.
7. **Subdomain customization** is handled by the `custom` block in `core.txt`. Do not hardcode per-subdomain logic in JS.
8. **Electron/Web parity.** Any feature added must work in both environments. Use `is-electron` guards only where unavoidable.
9. **No test suite exists.** There are no unit tests; CRA's default test runner is present but unused. Do not break the build.
10. **`globalData` is the in-memory database.** After `loadCore()` resolves, treat `globalData` as the authoritative data store. Do not re-fetch `core.txt` unnecessarily.
