# Isaiah Explorer — Routing Reference

This document is the authoritative reference for every URL shape Isaiah Explorer accepts, every URL shape it emits, and the precedence rules that decide which is which. It is meant to be read in full before changing anything that touches `window.location`, `react-router-dom`, or `src/routing/`.

The grammar is **path-based** (despite a historical doc comment in `routeCodec.js` describing it as a hash path — see [Historical notes](#historical-notes)). The app reads `window.location.pathname` and writes via `react-router-dom` `navigate()`.

---

## 1. Topology

There are three layers that together produce the app's routing behavior:

| Layer | Source | Responsibility |
|---|---|---|
| Top-level router | `src/index.js` | Picks `BrowserRouter` (web) or `MemoryRouter` (Electron, because `file://` breaks `BrowserRouter`) |
| Route shell | `src/routing/RouterShell.js` | Three `<Route>` patterns: two legacy compatibility redirects + a catch-all that mounts `<App>` |
| Codec | `src/routing/routeCodec.js` | The actual route grammar. Parses pathnames into a state shape; emits canonical pathnames from app state |

The router itself is intentionally thin. **All non-trivial route logic lives in the codec.**

### 1.1 React Router patterns (RouterShell.js)

```
search/:query   →  <Navigate replace> to "/search.:query"   (legacy slash form)
hebrew/:strong  →  <Navigate replace> to "/hebrew.:strong"  (legacy slash form)
*               →  <App />                                  (every other path; App parses it itself)
```

There are only **three** router-level patterns. Everything else, including tag and commentary routes, falls through to the `*` catch-all and is handled by `App.js` calling `parseRoute(window.location.pathname)`.

### 1.2 Electron caveat

`App.setUrl()` (App.js:433) suppresses `navigate()` when `rootURL` starts with `file://`. So in Electron, routes are still parsed from the initial URL but not written back as state changes — the address bar concept doesn't exist there anyway. `MemoryRouter` keeps the React Router state coherent without touching `window.location`.

### 1.3 Subdomain / "subsite" parsing

Not a route per se, but it affects which routes resolve successfully. App.js:1268-1270 extracts a `subsite` prefix from the hostname:

```js
window.location.host.match(/^(.*?).isaiah/)
```

So `dev.isaiah.scripture.guide` → `subsite = "dev"`. The subsite drives a customization layer (`loadCustoms`) that can blacklist commentary sources, versions, etc. **The same `/commentary.<source>` URL may be valid on one subdomain and silently fall back on another.** This matters for SEO/SSR planning.

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

The two router-level redirects in `RouterShell.js` rewrite `/search/:query` → `/search.:query` and `/hebrew/:strong` → `/hebrew.:strong` **before** the App sees them. These dot-form URLs are NOT themselves canonical (they lack structure/outline/version), so `parseRoute` falls through MAIN_REGEX and returns `{}` — the modifier is lost.

This is almost certainly a bug or incomplete migration: the redirect targets are not valid canonical URLs. In practice, the user's intended modifier survives only if it came from a manually-typed legacy URL that the codec's own legacy regex catches **before** the redirect runs. Worth investigating if you touch this code.

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

## 9. Implications for SSR / Next.js migration

This is reference-level guidance for the migration discussion in the architecture thread, summarized here so it lives next to the grammar.

### 9.1 One catch-all route, one parser

All 13 canonical permutations parse through a single `MAIN_REGEX`. In Next.js this becomes **one catch-all dynamic route** (`app/[[...slug]]/page.tsx`) that:

1. Joins `params.slug` with `/`, prefixes with `/`
2. Calls `parseRoute()` (the existing function, unmodified)
3. Validates against `globalData.meta` (load it server-side)
4. Returns metadata via `generateMetadata` — port `getSeoData` directly

You do **not** need separate route files for tag, search, hebrew, commentary. The grammar is centralized.

### 9.2 Redirects become Next.js `redirect()`

The two `RouterShell` redirects (`/search/:query`, `/hebrew/:strong`) become either `redirects` entries in `next.config.js` or `redirect()` calls in a middleware. Either works.

### 9.3 Subsite customization complicates static rendering

Section 1.3 means the same URL can resolve to different content based on hostname. For ISR/SSG you have two options:

- **Per-subdomain builds** — separate Amplify branches per subsite
- **Runtime SSR with `headers()`** — read `Host`, apply customizations dynamically, lose static caching

Decide before scoping the migration. The current subsite list is small enough that per-subdomain builds may be cleaner.

### 9.4 Commentary URLs are the highest-value SSR targets

Each `/structure/outline/version/chapter/verse/commentary.<source>[/<id>]` is a unique scholarly note on a specific verse. These are the deep links that benefit most from:

- Rich Open Graph cards (`"<source-name> on Isaiah <ch>:<v>"`)
- Per-source structured data (Citation schema)
- Crawlable HTML for search engines

`getSeoData()` already produces the title/description for these. SSR just needs to render them into the initial HTML.

### 9.5 The codec is already pure

`parseRoute` and `buildRoute` have **no DOM, no React, no globals**. They are trivially portable to a Node SSR runtime. The only data dependency is `globalData.tags.tagIndex[*].slug` for slug ↔ tag-name resolution — make sure that index is available at request time.

---

## 10. Historical notes

### 10.1 The "hash path" doc comment is stale

`routeCodec.js:7` says:

```
URL shape (hash path, no leading #)
```

This is **not accurate today**. The app runs on path-based routing via `BrowserRouter`. The codec parses pathnames, not hashes. The Clicky tracker (App.js:441) still records pageviews as `"#" + path`, suggesting an earlier hash-routed implementation. Don't be misled by the comment.

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
