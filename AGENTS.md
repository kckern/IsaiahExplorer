# Isaiah Explorer — Agent Guide

## Project Overview

Isaiah Explorer is an interactive Bible-study tool for the Book of Isaiah. Users browse Isaiah's 66 chapters through multiple scholarly structural frameworks, read 30+ translations, explore thematic tags, and study the Hebrew text with Strong's concordance integration.

It is a **Next.js 14 App Router** application deployed to **AWS Amplify (WEB_COMPUTE / SSR)**. The server layer renders per-URL metadata (title, description, canonical, Open Graph, JSON-LD) for crawlers; the interactive UI is a client-only React SPA (the `src/` tree) hydrated inside a `dynamic(ssr:false)` boundary.

Canonical URL shape:
`/:structure/:outline/:version[/tag.:slug][/search.:query][/hebrew.:strong]/:chapter/:verse[/commentary.:source[/:id]]`

> This project is mid-modernization. See `docs/audits/2026-07-06-production-readiness-audit.md` and `docs/plans/2026-07-06-production-readiness.md` for the audit and the phased plan. Some patterns below (the global `globalData`/`app` singleton, the god-component `App.js`, DOM-driven navigation) are known debt being dismantled in Phase 5 of that plan — do not add new code that depends on them.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) — `app/`, `lib/server/`, `middleware.ts` |
| UI (SPA) | React 18 — legacy **class components** in `src/` (`app` singleton pattern; being migrated) |
| Routing | Clean paths (no hash). `src/routing/routeCodec.js` parses/builds; `src/routing/withRouter.js` writes URLs via the History API and handles `popstate` |
| State | Single root `App` class instance; child components reach it via `DataContext` (`globalData.app`) |
| Data | `pako` (gzip) — large datasets are base64+gzip `.txt` files under `public/`, fetched at request time |
| SEO | `lib/server/buildMetadata.ts` + shared `src/routing/seo.js`; `app/robots.ts`, `app/sitemap.ts`, JSON-LD in `app/[[...slug]]/page.tsx` |
| Tests | Jest (`npx jest`) for unit; Playwright (`npm run test:e2e`) for e2e |
| Deploy | AWS Amplify WEB_COMPUTE (`amplify.yml`) |

There is **no Electron and no PHP backend.** (Legacy `public/*.php` files are dead SEO stubs slated for removal; do not use them.)

---

## Directory Structure

```
/
├── app/                         # Next.js App Router
│   ├── layout.tsx               # <html> shell, fonts, Clicky analytics, viewport
│   ├── [[...slug]]/
│   │   ├── page.tsx             # generateMetadata (SSR SEO) + 404 gate + JSON-LD; renders AppClient
│   │   └── AppClient.tsx        # dynamic(ssr:false) boundary that loads src/App.js + withRouter
│   ├── error.tsx / global-error.tsx / not-found.tsx   # error & 404 boundaries
│   ├── robots.ts / sitemap.ts   # generated from the verse index
│   └── og/route.tsx             # dynamic Open Graph card image
├── lib/server/                  # server-only, typed, unit-tested
│   ├── dataCache.ts             # loads + caches public/core/core.txt (the in-memory dataset)
│   ├── routeFromParams.ts       # catch-all slug → route state; isRecognizedRoute (404 gate)
│   ├── buildMetadata.ts         # per-route <title>/description/OG/canonical (uses src/routing/seo.js)
│   ├── sitemapEntries.ts        # verse index → canonical sitemap URLs
│   ├── verseText.ts, resolveTag.ts, subsite.ts, applySubsite.ts
│   └── __tests__/               # jest
├── middleware.ts                # 308 permanent redirects for legacy /search/* and /hebrew/* forms
├── src/                         # client SPA (class components)
│   ├── App.js                   # root class component (large; owns most app logic — being decomposed)
│   ├── globals.js               # mutable `globalData` singleton (in-memory DB; being phased out)
│   ├── DataContext.js           # React context carrying globalData to children
│   ├── data/fetchData.js        # resilient client fetch + gzip decode (ok-check, retry, typed errors)
│   ├── routing/
│   │   ├── routeCodec.js         # parseRoute / buildRoute (pure, tested)
│   │   ├── defaults.js           # SHARED route/session defaults (structure/outline/version=KJV, verse id)
│   │   ├── seo.js                # SHARED buildTitle / buildDescription (isomorphic; server + client)
│   │   └── withRouter.js         # injects navigate/location; owns popstate
│   ├── state/                    # audioState, tagPanel, tagSelectors (+ tests)
│   └── Components/               # Structure, Section, Verse, Passage, VerseBox, Commentary,
│                                 # Hebrew, Tags, Audio, Search, VideoBox, Settings/
└── public/
    ├── core/core.txt            # PRIMARY DATA: base64(gzip(JSON)) — structures, outlines, tags, index, meta
    ├── core/meta.json, core/tags_hl.txt
    ├── text/verses_*.txt        # per-translation verse text (compressed); ~30 files
    ├── text/words_HEB.txt       # Hebrew words + Strong's numbers
    └── com/barnes.NNNN.json     # commentary entries, one JSON file per entry
```

---

## Architecture Patterns

### Server / client split
- **Server (`app/`, `lib/server/`)** runs per request: `generateMetadata` builds SEO tags and `page.tsx` gates 404s (`isRecognizedRoute`) and emits JSON-LD. Data comes from `lib/server/dataCache.ts` (`loadGlobalData`), which reads and caches `public/core/core.txt` — there is no remote data origin at request time.
- **Client (`src/`)** is a class-component SPA loaded via `AppClient.tsx`'s `dynamic(ssr:false)` (it touches `window`/`document`/`localStorage`). It re-fetches the compressed datasets on the client through `src/data/fetchData.js`.

### State
- All app state lives on the root `App` instance. Children read it through `DataContext` as `globalData.app` / `globalData.state` and call `app.method(...)`. **This is legacy debt** — Phase 5 introduces a bounded actions API; prefer adding to that direction over deepening the `app.*` coupling.
- `globalData` (`src/globals.js`) is the in-memory dataset after load. Treat it as read-mostly.

### Routing
- URLs are clean paths. `src/routing/routeCodec.js` owns `parseRoute(path)` and `buildRoute(state, getTagSlug)` (pure, unit-tested; `parseRoute` reports `recognizedSegments` used by the 404 gate).
- `withRouter.js` injects `navigate(path,{replace})` (History API — no RSC round-trip, so the SPA never cold-reloads on navigation) and a `popstate` listener; `App.handlePopState` restores state on Back/Forward.
- Route/session **defaults are shared** via `src/routing/defaults.js` (server and client import the same constants; a bare `/` resolves to KJV on both sides).

### Data format
- All large datasets are `base64(gzip(JSON))` `.txt` files. Decode with `pako.ungzip(..., {to:'string'})` then `JSON.parse`. Client goes through `src/data/fetchData.js` (checks `response.ok`, retries once, throws typed `UnzipError`); server through `lib/server/dataCache.ts` / `verseText.ts`.
- Do **not** inline large data into JS. Add new datasets under `public/core|text|com` in the same encoding.

### SEO / metadata (single source of truth)
- `src/routing/seo.js` (`buildTitle`/`buildDescription`) is the one implementation, imported by both `lib/server/buildMetadata.ts` and `App.setUrl` (client `document.title` on SPA navigation). Do not reintroduce a second metadata path (react-helmet was removed).

### Four-column layout
- The desktop UI is **Structure | Section | Verse | Passage**, with overlays for Settings, Commentary, Hebrew, Tags, Audio, Video. (Responsive/mobile behavior is being added in Phase 3 of the plan.)

### Subdomain customization
- Per-subdomain whitelist/blacklist config lives in the `custom` block of `core.txt` and is applied by `lib/server/applySubsite.ts` (server) and the client loader. Don't hardcode per-subdomain logic.

### Keyboard shortcuts (defined in `App.js`)
- Arrows: navigate verses/headings · PgUp/PgDn: cycle translations · Home/End: cycle outlines · Ins/Del: cycle structures · Tab: move between columns · Space: play audio · `~`: commentary · `+`/`-`: cycle tags.

---

## Data Formats

### `public/core/core.txt`
`base64(gzip(JSON))` of one object:
- `index` — `{ verse_id: { chapter, verse, string } }` (1,292 verses, 66 chapters)
- `structures` — `{ shortcode: [ { verses, heading, ... } ] }`
- `outlines` — `{ shortcode: [ { verses, heading } ] }`
- `tags` — `{ tagIndex, tagChildren, tagSiblings, parentTagIndex, verseTagIndex }`
- `commentary` — `{ comIndex, comOrder, comSources }`
- `custom` — per-subdomain config · `meta` — mirrors `meta.json`

### `public/text/verses_KJV.txt`
Same encoding; decodes to verse-text strings keyed by `verse_id`.

### `public/com/barnes.NNNN.json`
```json
{ "id": 1001, "source": "barnes", "verse_id": 17908, "verse_count": 1,
  "reference": "13:1", "title": "", "html": "<p>...</p>", "audit": 1 }
```
Internal cross-refs in `html`: `<a class="isa" verses="base64([verse_ids])">`; external refs: `<a class="ref">`.

---

## Build, Dev & Test

| Command | Description |
|---|---|
| `npm run dev` | Next.js dev server on **http://localhost:3001** (never port 3000 — reserved) |
| `npm run build` | Production build |
| `npm start` | Serve the production build on port 3001 |
| `npm test` / `npx jest` | Unit tests (jest). On this machine, prefer `npx jest --runInBand` |
| `npm run test:e2e` | Playwright e2e (`tests-e2e/`; `prod-*.spec.ts` target production) |
| `npm run lint` | `next lint` |

Deploy is via AWS Amplify (`amplify.yml`, WEB_COMPUTE). Manage the Amplify app with the `aws amplify` CLI, not console click-throughs.

---

## Conventions & Constraints

1. **`src/` is React 18 class components.** Match the surrounding style when editing existing SPA code; don't rewrite unrelated code to hooks. New server code (`app/`, `lib/`) is TypeScript.
2. **One source of truth.** Route defaults live in `src/routing/defaults.js`; metadata strings in `src/routing/seo.js`; the route codec in `src/routing/routeCodec.js`. Import them — don't duplicate.
3. **Data files are static + compressed.** Large datasets go under `public/` in base64+gzip form, fetched at runtime — never inlined into JS.
4. **Server metadata is authoritative for SEO.** The client only updates `document.title` on SPA navigation.
5. **Don't deepen the legacy coupling.** Avoid new dependence on `globalData.app`/`app.setState` from components; the actions-API migration (Phase 5) is the intended direction.
6. **Tests must stay green.** `npx jest` (unit) before committing. Add tests for new pure modules under `lib/server/` and `src/`.
