# Isaiah Explorer — Routing Reference

This document is the authoritative reference for every URL shape Isaiah Explorer accepts, every URL shape it emits, and the precedence rules that decide which is which. It is meant to be read in full before changing anything that touches `window.location`, `next/navigation`, or `src/routing/`.

The grammar is **path-based** — the catch-all Next.js route reads `params.slug`, runs it through the codec, and either renders metadata server-side or hydrates the SPA on the client. Internal URL writes go through a Next.js-aware `withRouter` shim that picks between `router.push()` and `history.replaceState()`.

---

## 1. Topology

Three layers produce the routing behavior:

| Layer | Source | Responsibility |
|---|---|---|
| Next.js App Router | `app/[[...slug]]/page.tsx`, `middleware.ts` | Single catch-all dynamic route that runs `generateMetadata` server-side and renders the `<AppClient />` boundary on the client. Middleware handles two legacy slash-form redirects. |
| Client shell | `app/[[...slug]]/AppClient.tsx` | `'use client'` boundary that dynamically imports `App.js` with `ssr: false`. Wraps it in the `next/navigation`-backed `withRouter` shim. |
| Codec | `src/routing/routeCodec.js` | The actual route grammar. Parses pathnames into a state shape; emits canonical pathnames from app state. Unchanged from pre-Next.js — pure, framework-free. |

The router layer is intentionally thin. **All non-trivial route logic lives in the codec.**

### 1.1 Next.js routes

```
middleware.ts:
  /search/:query   →  307 redirect to /search.:query   (legacy slash form)
  /hebrew/:strong  →  307 redirect to /hebrew.:strong  (legacy slash form)

app/[[...slug]]/page.tsx:
  *                →  generateMetadata (server) + <AppClient /> (client)
```

There are only **three** route definitions. Everything else, including tag and commentary routes, matches the catch-all `[[...slug]]` and is parsed by `lib/server/routeFromParams.ts` which delegates to the codec's `parseRoute`. The same codec runs again in the browser when App.js calls `parseRoute(window.location.pathname)` after hydration.

### 1.2 URL-write flow (`withRouter` shim → `next/navigation`)

`src/routing/withRouter.js` is a `'use client'`-safe HOC that injects `navigate(path, opts)` and `location.pathname` into the class component:

| Call form | Mechanism | Metadata refetch? |
|---|---|---|
| `navigate(path)` or `navigate(path, { replace: false })` | `router.push(path)` from `next/navigation` | Yes — Next.js soft-navigates and re-runs `generateMetadata` |
| `navigate(path, { replace: true })` | `window.history.replaceState({}, '', path)` | **No** — bypasses Next.js entirely |

The `replace: true` branch is used by `App.setUrl()` for high-frequency scroll-driven URL updates that must not trigger a server round-trip. `react-helmet` (client-side) keeps the `<title>` and meta tags in sync during these silent updates.

### 1.3 Subdomain / "subsite" parsing

Not a route per se, but it affects which routes resolve successfully. The codec is host-agnostic, but `generateMetadata` reads the `Host` header on every request and applies the matching subsite blacklist before producing metadata:

```ts
const host = headers().get('host');     // "dev.isaiah.scripture.guide"
const subsite = subsiteFromHost(host);  // "dev"
const data = applySubsite(fullData, subsite);
```

`subsiteFromHost` mirrors the original `App.loadCore` regex (`/^(.*?)\.isaiah/`). The client-side path still does the same parsing for its own data load (`src/App.js:1268-1270`).

**The same `/commentary.<source>` URL may be valid on one subdomain and silently fall back on another** — that's a deliberate feature of the customization model. SSR honors it via the Host header so social-card previews match what users see.

---

## 2. Canonical URL grammar

The canonical pathname template, as emitted by `buildRoute()`:

```
/:structure/:outline/:version
  [/tag.:slug]
  [/search.:query]
  [/hebrew.:strong]
  /:chapter/:verse
  [/commentary.:source[/:id]]
```

| Segment | Type | Required? | Source of truth |
|---|---|---|---|
| `structure` | string | yes | `globalData.meta.structure[*]` |
| `outline`   | string | yes | `globalData.meta.outline[*]`   |
| `version`   | string | yes | `globalData.meta.version[*]` (uppercased on parse) |
| `tag.<slug>` | string slug | optional middle modifier | `globalData.tags.tagIndex[tagName].slug` |
| `search.<query>` | encoded string | optional middle modifier | free text via `encodeSearchParam` |
| `hebrew.<strong>` | integer | optional middle modifier | Strong's number |
| `chapter` | integer | yes | 1–66 |
| `verse` | integer | yes | per-chapter range |
| `commentary.<source>` | string | optional trailing | `globalData.meta.commentary[*]` |
| `commentary id` | integer | optional trailing | only valid when source is present |

### 2.1 Required vs. optional segments

`structure`, `outline`, `version`, `chapter`, `verse` are required for a canonical URL. The codec will happily parse a URL without them (see [Legacy forms](#5-legacy-forms)), but `buildRoute` always emits all five.

### 2.2 Middle-modifier precedence

The three middle modifiers are mutually exclusive in emission. `buildRoute()` (routeCodec.js:119-130) applies this if/else chain:

```
1. tag       (showcase_tag || selected_tag)
2. search    (only if no hebrew)
3. hebrew    (wins over search)
4. none
```

In plain terms: **tag beats everything, hebrew beats search, search appears alone or not at all.** The parser is more permissive — its regex allows them to stack — but `buildRoute` will never produce a stacked URL, so don't rely on stacking.

### 2.3 Output is lowercase

`buildRoute` lowercases the entire path on emission (routeCodec.js:141). `parseRoute` uppercases only the `version` field (routeCodec.js:90). So `/whole/chapters/KJV/5/4` and `/whole/chapters/kjv/5/4` are equivalent on parse, but `buildRoute` always emits the lowercase form.

---

## 3. Permutation matrix

Every URL shape `buildRoute` can emit, plus every shape `parseRoute` recognizes. All examples use the live structure/outline/version triple `whole/chapters/iinst` (Isaiah Institute translation) for illustration; substitute any valid triple from `globalData.meta`.

### 3.1 Base canonical (no modifier, no commentary)

| # | Path | Notes |
|---|---|---|
| 1 | `/whole/chapters/iinst/5/4` | The minimum canonical URL |

### 3.2 With a middle modifier

| # | Path | Notes |
|---|---|---|
| 2 | `/whole/chapters/iinst/tag.suffering-servant/5/4` | Tag — slug from `tagIndex[tag].slug` |
| 3 | `/whole/chapters/iinst/search.comfort+my+people/40/3` | Search — see [Encoding](#4-encoding-rules) |
| 4 | `/whole/chapters/iinst/hebrew.2490/53/5` | Hebrew Strong's number, integer only |

### 3.3 With commentary appended

Commentary always follows chapter/verse. The source token is `[^/]+` (any non-slash characters, including dots and hyphens). The id token is `[0-9]+` (strictly numeric).

| # | Path | Notes |
|---|---|---|
| 5 | `/whole/chapters/iinst/5/4/commentary.barnes` | Source only |
| 6 | `/whole/chapters/iinst/5/4/commentary.barnes/123` | Source + id |
| 7 | `/whole/chapters/iinst/5/4/commentary.targum-jonathan` | Hyphens allowed in source |

When a commentary URL loads, App.js:270-275 sets:

- `commentaryMode = true`
- `commentarySource = parsed.commentarySource`
- `commentary_verse_id = active_verse_id` (i.e. the chapter/verse from the URL)
- `commentaryID = parsed.commentaryID` (if present)

The commentary is anchored to the URL's verse — you cannot put commentary on a verse different from `:chapter/:verse` in the same URL.

### 3.4 Middle modifier + commentary

| # | Path |
|---|---|
| 8 | `/whole/chapters/iinst/tag.suffering-servant/5/4/commentary.barnes` |
| 9 | `/whole/chapters/iinst/tag.suffering-servant/5/4/commentary.barnes/9` |
| 10 | `/whole/chapters/iinst/search.holy+one/5/4/commentary.barnes` |
| 11 | `/whole/chapters/iinst/search.holy+one/5/4/commentary.barnes/9` |
| 12 | `/whole/chapters/iinst/hebrew.6918/5/4/commentary.barnes` |
| 13 | `/whole/chapters/iinst/hebrew.6918/5/4/commentary.barnes/9` |

Total canonical permutations: **13** (1 base × 4 modifier states × ~3 commentary states, minus disallowed combos).

---

## 4. Encoding rules

### 4.1 Search query encoding (`encodeSearchParam`, routeCodec.js:174-181)

Search queries undergo a lossy, route-specific transformation on the way to the URL:

| Input | Output | Notes |
|---|---|---|
| `–` (en-dash, U+2013) | `-` | Normalized to ASCII hyphen |
| `; ` (semicolon + space) | `;` | Space stripped |
| `｢x` (corner bracket + letter) | `\bx` | Encodes a leading regex word boundary |
| `x｣` (letter + corner bracket) | `x\b` | Encodes a trailing regex word boundary |
| any whitespace | `+` | |
| `/` | (stripped) | Slashes silently dropped |
| All other chars | lowercased | |

`decodeSearchParam` (routeCodec.js:183-187) is **not** a true inverse — it only handles `+` → space and `｢｣` → `/`. The lowercase, hyphen, and semicolon transforms are one-way.

This means a search query like `"Comfort My People"` round-trips as `"comfort my people"` (lowercase), and `"foo / bar"` round-trips as `"foo  bar"` (slashes lost). Callers expecting exact preservation will be disappointed.

### 4.2 Tag slug encoding

**Tag slugs are not computed — they come from data.** `globalData.tags.tagIndex[tagName].slug` is the canonical URL token. To reverse a slug to a tag name, App.js:329-335 scans the entire `tagIndex`:

```js
loadTagFromSlug(slug) {
  var index = globalData.tags.tagIndex
  for (var tagName in index) {
    if (index[tagName].slug === slug) return tagName
  }
  return null  // slug not found → tag is silently dropped
}
```

A common confusion: `Tags.js:458` (and elsewhere) computes `state.selected_tag.toLowerCase().replace(/[^a-z]/g, "")` and calls this `tagstr`. **This is for DOM element IDs, not URLs.** It is unrelated to slug routing.

### 4.3 Version uppercasing

Versions are stored uppercase in `globalData.meta.version` but emitted lowercase in URLs (`buildRoute` lowercases the whole path). On parse, only `version` is upper-cased back (routeCodec.js:90).

### 4.4 Numeric tokens

`chapter`, `verse`, `hebrew`, and `commentaryID` are parsed as integers via `parseInt(_, 10)`. The regex enforces `[0-9]+` so leading zeros parse but normalize away.

---

## 5. Legacy forms

`parseRoute` recognizes several pre-canonical URL shapes for backwards compatibility. Each early-returns from the parser without setting `structure`/`outline`/`version` — the App fills those in from `localStorage` defaults via `getSettingsFromUrl`.

| Path | Parsed | Behavior |
|---|---|---|
| `/` or `""` | `{}` | App applies all defaults |
| `/:chapter` | `{ chapter, verse: 1 }` | Verse defaults to 1 |
| `/:chapter/:verse` | `{ chapter, verse }` | |
| `/tag.<slug>` (root) | `{ tag }` | Bare tag, no SoV prefix |
| `/search/<query>` | `{ search }` | Also redirected at router level → `/search.<query>` |
| `/hebrew/<strong>` | `{ hebrew }` | Also redirected at router level → `/hebrew.<strong>` |

### 5.1 Redirect interaction

The two redirects rewrite `/search/:query` → `/search.:query` and `/hebrew/:strong` → `/hebrew.:strong` **before** the page sees them. These dot-form URLs are NOT themselves canonical (they lack structure/outline/version), so `parseRoute` falls through MAIN_REGEX and returns `{}` — the modifier is lost.

**Status as of 2026-05-13:** Migrated to Next.js middleware (`middleware.ts`). `RouterShell.js` is deleted. The known issue persists: the redirect targets `/search.<query>` and `/hebrew.<strong>` are not valid canonical URLs without an SoV prefix, so they fall through to default state when parsed. This was the behavior under react-router too. A future task should redirect to a full canonical URL with default SoV instead (e.g. `/whole/chapters/iinst/search.<query>/1/1`).

### 5.2 Why no `normalizeRoute` redirects fire

`normalizeRoute()` (routeCodec.js:154-170) currently returns `null` for every input. The function exists as a hook for future canonicalization but is a no-op today. Don't rely on it for redirects — use the router-level `<Navigate>` or App-level `setUrl(replace=true)` instead.

---

## 6. Parser edge cases

These are real behaviors of the current codec, observed in `MAIN_REGEX`:

### 6.1 No `$` anchor

`MAIN_REGEX` (routeCodec.js:18-26) is not anchored at the end. Trailing garbage after a valid prefix is silently dropped:

```
/whole/chapters/iinst/5/4/commentary.barnes/foo   →   parses as commentary.barnes, no id (the /foo is ignored)
/whole/chapters/iinst/5/4/and-then-some-junk      →   parses as base canonical, /and-then-some-junk dropped
```

No 404 is produced. The App renders whatever the parsed prefix indicates.

### 6.2 Multiple trailing numeric segments collapse

```
/whole/chapters/iinst/5/4/commentary.barnes/123/456   →   commentaryID = "456"  (the 123 is lost)
```

The trailing capture group is `(/[0-9]+)*` with a single slot. Regex semantics keep only the last match. `buildRoute` never emits multiple numeric tails, so this is only reachable via hand-crafted URLs.

### 6.3 Modifier stacking is parsed but never emitted

```
/whole/chapters/iinst/tag.x/search.y/hebrew.z/5/4   →   parser sets tag, search, AND hebrew all together
```

The MAIN_REGEX uses `*` quantifiers on each modifier group, so all three can co-occur. App state will reflect all three. **Do not rely on this** — `buildRoute` will collapse to one modifier on the next `setUrl()`, immediately replacing this URL.

### 6.4 Invalid structure/outline/version silently fall back

App.js:247-252 only applies parsed values if they exist in `globalData.meta`. An invalid token like `/wat/chapters/iinst/5/4` produces `settings.structure` unset, which `validateSettings` then defaults to `Object.keys(g.meta.structure)[0]`. The URL becomes effectively `/<default-structure>/chapters/iinst/5/4` after the next `setUrl`.

This means **bookmarks containing renamed structures, outlines, or versions silently retarget** rather than 404.

### 6.5 Invalid commentary source silently falls back

Same pattern (App.js:302-303): `commentarySource` falls back to `Object.keys(g.meta.commentary)[0]` if unknown. Critical for subsite customization — a commentary blacklisted by the active subsite gets quietly substituted.

### 6.6 Tag slug not found → `selected_tag = null`

`loadTagFromSlug` returns `null` for unknown slugs (App.js:334). The URL retains the `tag.<slug>` segment until the next `setUrl`, which will emit a URL without the tag modifier.

---

## 7. URL writes (App.setUrl)

`App.setUrl(replace)` (App.js:385-443) is the single emission point for URLs in this app. Every state change that should be reflected in the URL goes through here.

### 7.1 What it does

1. Builds canonical path via `buildRoute(state, getTagSlug)`
2. Constructs the document title (with the same precedence as canonical URL modifiers)
3. Calls `navigate(path, { replace })` if not running under `file://`
4. Sets `document.title`
5. Fires a Clicky pageview event (legacy: tracks as `#<path>` even though we're not hash-routed)

### 7.2 When `replace: true` is used

Two main cases observed in App.js:

- `setUrl(isHighFreq)` at App.js:1777 — passes `replace=true` when the URL change is "high-frequency" (e.g. scroll-driven verse changes during reading). Prevents flooding browser history.
- All other call sites (2230, 2320, 2798) use the default push behavior.

### 7.3 `getSeoData` — parallel emission for `<head>`

`App.getSeoData()` (App.js:337-383) runs the same `buildRoute` against current state to produce the canonical `<head>` URL, plus a context-aware title and description. It uses the same precedence as the URL builder:

1. **Tag active** → `"<tag> | Isaiah <ch>:<v>"`
2. **Search active** (no hebrew) → `"<query> | Isaiah Explorer"`
3. **Hebrew active** → `"Hebrew H<strong> | Isaiah Explorer"`
4. **Commentary active** → `"Isaiah <ch>:<v> | <source-name>"`
5. **Default** → `"Isaiah <ch>:<v>"`

This is the data the React Helmet `<title>`/`<meta>` tags consume. **For SSR/SEO migration**, this is the function you want to call inside Next.js `generateMetadata`.

---

## 8. Special cases worth knowing

### 8.1 The `17656` default

App.js:243 sets `settings.active_verse_id = 17656` before parsing the URL. This appears to be the internal ID for a specific default verse. If `loadVerseId` cannot resolve a parsed `chapter:verse`, it also returns 17656 (App.js:326). Treat this as "the home verse" — likely Isaiah 1:1, but verify via `globalData.index[17656]` if you care.

### 8.2 `DOCUMENTS` / `CONTENTS` version sentinels

App.js:1257-1259 detects these two version codes and replaces them with `top_versions[0]`. They are not real translations — they appear to be UI mode sentinels that should never appear in URLs. If you see one in a URL, the loader will silently swap it.

### 8.3 The hebrew load-queue trigger

App.js:1265-1266 inspects `parseRoute(window.location.pathname).hebrew` during `loadCore()` and pushes `"hebrew"` into `this.load_queue` if present. This is the only piece of route-aware behavior in the data-loading pipeline; everything else reacts to state.

### 8.4 Search URL state has two flags

When the URL provides a search modifier, App.js:259-263 sets both `searchQuery = parsed.search` AND `urlSearch = true` AND `searchMode = false`. The `urlSearch` flag distinguishes "loaded from URL" from "user typed in search box" — used downstream to suppress some UI animations.

---

## 9. SSR / Next.js architecture (current state)

This section describes how SSR works today (post-migration 2026-05-13). The plan that produced this architecture is at `docs/plans/2026-05-13-nextjs-ssr-migration.md`.

### 9.1 One catch-all route, one parser

All 13 canonical permutations parse through a single `MAIN_REGEX`. Next.js routes them through **one catch-all dynamic route** (`app/[[...slug]]/page.tsx`) that:

1. URL-decodes each `params.slug` element (Next.js percent-encodes `+` to `%2B`)
2. Joins with `/`, prefixes with `/`
3. Calls `parseRoute()` (the existing function, unmodified) via `lib/server/routeFromParams.ts`
4. Resolves the tag slug to a tag name (`lib/server/resolveTag.ts`)
5. Loads `globalData` from the module-cached `core.txt` (`lib/server/dataCache.ts`)
6. Applies subsite filtering per `Host` header (`lib/server/applySubsite.ts`)
7. Returns metadata via `generateMetadata` using `lib/server/buildMetadata.ts` (port of the original `App.getSeoData`)

There are **no separate route files** for tag, search, hebrew, commentary. The grammar is centralized in the codec.

### 9.2 Redirects via Next.js middleware

`middleware.ts` handles the two legacy slash-form redirects:

```
/search/:query   →  307 redirect to /search.:query
/hebrew/:strong  →  307 redirect to /hebrew.:strong
```

The known quirk persists: the redirect targets lack structure/outline/version and so parse to default state. A future cleanup should redirect to a full canonical URL.

### 9.3 Subsite customization at runtime

The architecture chose runtime Host-header parsing over per-subdomain builds — one Amplify deployment serves all subdomains. `generateMetadata` reads `headers().get('host')` on every request, derives the subsite, and runs `applySubsite()` to remove blacklisted commentary sources before producing the title/description. This preserves the client-side customization model exactly: same URL → different content per subdomain.

### 9.4 Commentary URLs are the highest-value SSR targets

Each `/structure/outline/version/chapter/verse/commentary.<source>[/<id>]` is a unique scholarly note on a specific verse. These deep links benefit most from:

- Rich Open Graph cards (`"<source-name> on Isaiah <ch>:<v>"`)
- Per-source structured data (Citation schema — TODO)
- Crawlable HTML for search engines

`buildMetadata` produces the title/description and OG/Twitter tags for all 13 permutations. Verified by the Playwright suite at `tests-e2e/seo.spec.ts`.

### 9.5 The codec is pure and shared

`parseRoute` and `buildRoute` have **no DOM, no React, no globals**. The same `src/routing/routeCodec.js` runs on the server (inside `generateMetadata`) and the client (inside App.js). The only data dependency is `globalData.tags.tagIndex[*].slug` for slug ↔ tag-name resolution — `lib/server/dataCache.ts` keeps that available at request time, cached in module scope per Lambda instance.

### 9.6 What's NOT server-rendered

The page body itself ships as `'use client'` with `ssr: false` — App.js touches `window`, `document`, and `localStorage` in many places, so SSR is intentionally disabled for the body. The initial HTML has the correct `<title>`, `<meta>`, and `<link rel="canonical">` (which is what social-card crawlers and search engines need) but the verse content renders only after hydration. Future work could extract a server-renderable read view from App.js for better SEO content depth.

---

## 10. Historical notes

### 10.1 The "hash path" doc comment is stale

`routeCodec.js:7` says:

```
URL shape (hash path, no leading #)
```

This is **not accurate today**. The app runs on path-based routing via Next.js. The codec parses pathnames, not hashes. The Clicky tracker (App.js:441) still records pageviews as `"#" + path`, an artifact of an earlier hash-routed implementation. Don't be misled by the comment.

### 10.2 react-router-dom / RouterShell.js / BrowserRouter / MemoryRouter

All gone as of 2026-05-13. Next.js owns routing; `withRouter` is a thin shim over `next/navigation`. Electron support was removed alongside CRA.

### 10.2 `normalizeRoute` is vestigial

`normalizeRoute` (routeCodec.js:154-170) is a no-op. It exists as an unimplemented hook. Either delete it or implement it; do not depend on it.

### 10.3 `Tags.js`'s `tagstr` is not a URL slug

Multiple places in `Tags.js` (lines 458, 468, 491) compute `state.selected_tag.toLowerCase().replace(/[^a-z]/g, "")`. This is a DOM ID convention, distinct from the URL slug in `tagIndex[tag].slug`. Easy to confuse — don't.

---

## 11. Quick reference card

```
WEB:      BrowserRouter → RouterShell → App (parses pathname via parseRoute)
ELECTRON: MemoryRouter   → RouterShell → App (no URL writes)

ROUTER PATTERNS (3 total):
  /search/:query   → Navigate replace /search.:query
  /hebrew/:strong  → Navigate replace /hebrew.:strong
  *                → <App />

CODEC GRAMMAR (canonical):
  /:structure/:outline/:version
  [/tag.:slug | /search.:query | /hebrew.:strong]   (mutually exclusive on emit)
  /:chapter/:verse
  [/commentary.:source[/:id]]

EMISSION PRECEDENCE (buildRoute):
  tag > hebrew > search

PARSED LEGACY FORMS (parseRoute):
  /                    →  defaults
  /:chapter            →  { chapter, verse: 1 }
  /:chapter/:verse     →  { chapter, verse }
  /tag.:slug           →  { tag }
  /search/:query       →  { search }   (also redirected by RouterShell)
  /hebrew/:strong      →  { hebrew }   (also redirected by RouterShell)

WRITE PATH:
  state change → App.setUrl(replace?) → buildRoute → navigate
                                      → document.title
                                      → clicky pageview

READ PATH:
  pathname → parseRoute → getSettingsFromUrl → setState
                       → loadTagFromSlug (tagIndex lookup)
                       → loadVerseId (verse index lookup)
                       → validateSettings (fallbacks)

KEY FILES:
  src/index.js                       Router selection (web vs Electron)
  src/routing/RouterShell.js         The 3 router patterns
  src/routing/routeCodec.js          parseRoute, buildRoute, encoding
  src/routing/withRouter.js          HOC injecting navigate/location
  src/App.js:242-278                 getSettingsFromUrl (URL → state)
  src/App.js:337-383                 getSeoData (state → title/meta)
  src/App.js:385-443                 setUrl (state → URL)
  src/App.js:1268-1270               Subsite hostname parsing
```
