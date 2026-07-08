# Production-Readiness Audit — Isaiah Explorer

**Date:** 2026-07-06
**Scope:** Full codebase — architecture/SSoT, separation of concerns, dead code & dependencies, UX/accessibility/mobile, production operations.
**Method:** Four parallel read-only audit passes plus verification. `npm test` passes (8 suites / 57 tests), `npx tsc --noEmit` is clean.

---

## Disposition (updated 2026-07-07)

Executed on branch `production-readiness` (44 commits). Baseline now: **222 tests / 21 suites green, `tsc --noEmit` 0 errors, ESLint 0 errors, `next build` succeeds, `npm audit` 1 high (dev-only `xlsx`, no fix) + 2 moderate (postcss bundled in Next 16).** Two adversarial-review passes (Fable model) ran over Phase 1 and Phase 4 and their findings were fixed and re-verified.

**✅ Done and verified (all P0 + all P1 + platform + most P2 architecture):**
- **P0:** responsive grid + mobile tab bar (P0.1); popstate Back/Forward incl. history-pollution + stale-mode fixes (P0.2); fetch resilience + error banner + error boundaries + strict unzip (P0.3); real 404s + robots + generated sitemap + 308 + JSON-LD (P0.4); CSP + security headers + `html-react-parser` upgrade + Next 14→16 clearing the runtime advisories (P0.5); shared route defaults + single isomorphic metadata builder, KJV agreement (P0.6).
- **P1:** analytics restored (P1.1); ESLint + GitHub Actions + Amplify test gates + fixed `tsc` gate (P1.2); data-corpus CDN caching (P1.3); the always-throwing scripture popup (P1.4); `debugger` removal + radix (P1.5/P1.6); keydown lifecycle (P1.7); `getTagData` mutation → pure memoized selector (P1.8); deterministic data / load-time shuffle removed (P1.9); `setState` callback bug (P1.10); silent verse drop (P1.11); selectable commentary + cursor/audio/debug CSS (P1.12–P1.15); loading skeleton + CLS (P1.16/P1.17); repo slimming (P1.21); AGENTS.md rewrite (P1.22); testMatch un-orphaning (P1.19); dep purge (P1.20).
- **P2 architecture done:** actions API + per-render context snapshot, no render-time global mutation (P2.1 core); `loadIsaiahData`/`normalizeCoreData` extraction (P2.2 data); declarative keymap (P2.2 keyboard); pure tag selector (P1.8); search codec consolidation (P2.5); touch targets + AA contrast (P2.9 partial); button infrastructure + first icon-button conversions + h2-nesting fix (P2.6/P2.10 partial).

**✅ Additional P2 a11y/architecture landed (verified by jest/tsc/build):**
- Dialog semantics for the Settings modal (role=dialog, aria-modal, focus-in, Tab trap, Escape, focus restore) and the audio popover (dropped the false role=menu, focus in/out) — P2.7.
- ~13 of the ~25 interactive elements converted to real `<button>`s with aria-labels + a `.linklike` reset + visible focus, plus the invalid `<div>`-in-`<h2>` fix — P2.6/P2.10 (the composite heading-cycler regions, which wrap nested controls, remain).
- Removed the dead `Element.prototype.matches` polyfill — P2.11.

**✅ Browser-verified pass (2026-07-07, Chromium via Playwright):** 44/44 e2e tests green (responsive, render, SEO, settings, side-by-side, tag feature, visual); screenshots reviewed at 1920/1440/1280/820/390 px plus Settings/tag/commentary/search views. Found and fixed in the process:
- **Commentary route crash** — a legacy string ref was a hard render error under Next 16's bundled React 19 react-dom; every `/commentary.*` deep link hit the error boundary.
- **Fluid-column clipping family** — drawer rows, info-box row titles, the version-swap strip, and the tag-collapse edge were all still sized for the old fixed columns and clipped mid-glyph at other widths; now fluid (container query, pinned spans, flex rows, fade mask).
- **Client bare-`/` IINST clobber** — `checkLoaded`'s validate snapped an unseeded patch to meta-first IINST, contradicting the server's KJV metadata (the client half of P0.6); patch now seeded from session state.
- **DOM-driven navigation removed (P2.3, Task 37)** — `clickElementID` deleted; keyboard drives state directly (10/10 keyboard behaviors browser-verified).
- **`resolveInitialState` extracted (P2.5, Task 39)** — pure, 9 unit tests; 5/5 boot paths browser-verified (fresh `/`→KJV, URL override, search/hebrew deep links, stored-preference persistence).
- CSP allows `unsafe-eval` in development only (react-refresh); production unchanged.

**⏸ Deferred (accepted risk):**
- **Error tracking (P1.1 Sentry):** deferred by user decision — `/api/health` probe + Clicky analytics are in place; add Sentry later with a DSN.
- **P1.18 git history for `public/com`:** requires `git filter-repo` (history rewrite) — sign-off needed; keeping the dir tracked going forward is fine.
- **Cosmetic sub-items:** the composite heading-cycler `<button>` conversions (nested-interactive markup), the controlled search input, removal of the `spread*` measured-layout engine (live callers in Verse/Section), the font-size legibility floor on width-constrained boxes, and native-audio behavior on real iOS Safari (desktop-Chromium verified; the constant-key/user-activation fix targets iOS but only a device test proves it).

---

## Executive summary

The Next.js 14 server layer (`app/`, `lib/server/`) is in decent shape — typed, tested, sensibly designed. The problems concentrate in three places:

1. **The legacy SPA (`src/`) is desktop-only and fragile.** Zero media queries, `min-width: 1820px`, broken browser Back button, no fetch error handling (any data hiccup = permanent loading screen), and core navigation that keyboards/screen readers cannot operate.
2. **The server and client disagree about the truth.** Metadata, route defaults, subsite logic, and search encoding each exist in 2–5 places and have already drifted (the server says the default version is `IINST`; the client renders `KJV`).
3. **Ops is blind.** Analytics silently died in the Next.js migration, there is no error tracking, no CI test step, no error boundaries, no real 404s, no security headers, and the deployed Next version has open high-severity advisories.

---

## P0 — Ship blockers

### P0.1 No responsive design exists (CRITICAL — UX/mobile)
- `src/App.css:113-114` — `#approot { min-width: 1820px }`; phones pan a 1820px canvas.
- `src/App.css:295-312` — fixed-width float columns (`491px` / `560px` / `310px` / `margin-left:820px`).
- `grep -c "@media" src/App.css` → **0** media queries in 4,019 lines.
- `src/App.css:121-131` — page scroll disabled (`overflow:hidden` wrapper); four independent inner scroll regions. Relies on `height:100%` chain, not `dvh` (iOS Safari URL-bar issue for any future mobile layout).
- Good news: `react-device-detect` is declared but never imported — nothing is UA-sniffed, so the fix path is pure CSS.
- **Fix:** breakpoint system (~1820px → 2 columns; ~1024px → single column with tabs/accordion); CSS grid with `minmax()`/`fr`; delete the min-width; `100dvh` if a fixed shell is kept; explicit `viewport` export in `app/layout.tsx`.

### P0.2 Browser Back/Forward is broken (CRITICAL — UX)
- `src/routing/withRouter.js:28-35` — raw `history.pushState/replaceState`; **zero `popstate` listeners** anywhere in `src/` or `app/`. Every verse/tag/version click pushes a history entry; Back changes the URL bar but not the app.
- **Fix:** `popstate` listener in the withRouter shim that re-runs `getSettingsFromUrl` + setState; use `replaceState` for non-structural changes.

### P0.3 Any data failure = permanent blank/skeleton page (CRITICAL — resilience)
- `src/App.js:1238, 1470, 1488, 1500, 1519, 1597` — of ~9 client `fetch()` chains, only one has a `.catch`, and **none check `response.ok`** — a 404/503 HTML body is piped straight into `unzipJSON`.
- `src/App.js:2740-2742` — `unzipJSON` catches and returns `["Unzip Failure", err]`; caller at `:1241` merges keys `"0"`/`"1"` into `globalData` and continues as if loading succeeded.
- If `core.txt` fails, `load_queue` (`src/App.js:103`) never drains, `checkLoaded()` never sets `ready`, and all four columns spin forever.
- **No error boundaries:** `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx` don't exist. A `generateMetadata` throw renders Next's raw 500; a client render exception white-screens the SPA.
- `src/Components/Commentary.js:291` — `JSON.parse(atob(...))` on attributes from commentary HTML with no try/catch → render throw → white screen (compounds the missing boundary).
- **Fix:** shared `fetchData(url)` helper (checks `ok`, retries once, sets a visible error state with Retry); `unzipJSON` throws; add the three error-boundary files; wrap the Commentary parse.

### P0.4 The site cannot 404, robots.txt is missing, sitemap is stale (HIGH — SEO/correctness)
- `app/[[...slug]]/page.tsx` + `lib/server/routeFromParams.ts:38-53` — every garbage URL silently gets defaults and returns **200** with a canonical pointing at Isaiah 1:1. `notFound()` is never called.
- No `public/robots.txt` or `app/robots.ts` — `GET /robots.txt` returns the SPA as HTML with 200.
- `public/sitemap.xml` — 1,358 URLs, every `lastmod` = 2020-07-19, and the URLs use legacy short forms (`/1/1`) while pages now declare `/whole/chapters/iinst/...` canonicals → Search Console "Duplicate, submitted URL not selected as canonical" at scale.
- `middleware.ts:24, 31` — legacy redirects use 307 (temporary) instead of 308 (permanent).
- No structured data (JSON-LD) anywhere.
- **Fix:** `notFound()` on unrecognized non-empty slugs and out-of-range chapter/verse; add `app/robots.ts` and a generated `app/sitemap.ts` (from `loadGlobalData()` + `buildRoute`); 307→308; JSON-LD from `buildMetadata` state.

### P0.5 Security: zero headers + vulnerable runtime deps (HIGH)
- No security headers anywhere (`next.config.js` has no `headers()`; `amplify.yml` customHeaders set only Cache-Control): no CSP, `X-Frame-Options`, `X-Content-Type-Options`, HSTS, or Referrer-Policy. `poweredByHeader` still on.
- `npm audit`: **13 vulnerabilities (10 high)**. `next@14.2.35` matches 14 open advisories (cache poisoning GHSA-wfc6-r584-vfw7, request smuggling, DoS — fixed in 15/16). `html-react-parser@0.4.6` (2018) drags in `react-dom-core → react@16-alpha → fbjs → isomorphic-fetch → node-fetch <2.6.7` (high) and is used in exactly one file (`src/Components/Commentary.js:4`).
- `lib/server/verseText.ts:33` — URL/query-derived `version` interpolated into a filesystem path (`verses_${key}.txt`); mostly neutered but unvalidated, and unknown versions trigger an fs read per request (only successes cached).
- `public/server.php:3` / `public/image.php` — dead PHP served as static text, leaking internal server paths (`/var/www/kckern.info/...`).
- **Fix:** headers block in `amplify.yml` or `next.config.js` (only external origins are Google Fonts); upgrade `html-react-parser` to ^5 and run `npm audit fix`; plan Next 15/16 upgrade; validate `version` against `data.meta.version` before touching fs; `git rm public/*.php public/.htaccess`.

### P0.6 Server and client disagree on defaults — SSR metadata mismatches rendered content (HIGH — SSoT)
- `lib/server/routeFromParams.ts:23-25` — server defaults `IINST` / `whole` (hardcoded copies of data-file ordering); `src/App.js:452` — client defaults to `top_versions[0]` = `KJV`. A bare `/` gets IINST metadata server-side and KJV content client-side.
- `lib/server/buildMetadata.ts:42-116` vs `src/App.js:318-364` (Helmet) vs `src/App.js:391-418` (`document.title`) — **three** title/description implementations, already drifted (different title formats, different hebrew/search precedence). Hydration silently rewrites the SSR title, and Helmet emits a *second* canonical/description tag alongside Next's.
- **Fix:** delete `getSeoData`/Helmet and the manual `document.title` write; one shared metadata builder; derive server defaults from loaded `globalData.meta.*`, not constants.

---

## P1 — Production hygiene (before/at launch)

### Ops & observability
- **P1.1 Analytics is silently dead** — `src/App.js:421` calls `window.clicky.log` but no Clicky script exists anywhere (died with the CRA `index.html`). No Sentry/error tracking. No health endpoint. **Fix:** re-add analytics tag in `app/layout.tsx`; add error tracking; `/api/health`.
- **P1.2 No CI** — no `.github/`; `amplify.yml` runs only `npm ci --legacy-peer-deps && npm run build` — never tests or typecheck. `npm run lint` is broken (no ESLint installed, no config; hits the interactive prompt). **Fix:** add `npm test` + `npx tsc --noEmit` to the build; install `eslint` + `eslint-config-next` (then `no-debugger` and `radix` rules pay off immediately — see P1.5/P1.6).
- **P1.3 Fully dynamic rendering + `max-age=0` on everything** — `generateMetadata` calls `headers()` (forces dynamic); amplify `'**/*'` → `max-age=0, must-revalidate` including the immutable 67 MB data corpus (`com/`, `text/`, `core/`). Every page view is a Lambda invocation that decompresses 554 KB `core.txt` on cold start. **Fix:** long-max-age cache patterns for `com/**`, `text/**`, `core/**`; `s-maxage`/SWR for HTML or ISR with env-derived origin.

### Live bugs & landmines in the client
- **P1.4 Broken feature: scripture-reference popup always throws** — `src/App.js:2069-2079` `sgshow` reads `this.props.reference` on the App instance (doesn't exist) → TypeError on every reference click after `preventDefault()`; link neither pops up nor navigates. Fix: move into `SGLink` using its own prop.
- **P1.5 Live `debugger` statements** — `src/App.js:2274, 2476, 2559`. Remove; add `no-debugger` lint.
- **P1.6 `parseInt` radix bugs** — `src/Components/Structure.js:163-171` uses radix **16** for outline striping (index "10" → 16); ~80 sites use `parseInt(x, 0)`. Fix: `Number()`; `radix` lint rule.
- **P1.7 Global keydown listener leaked** — `src/App.js:119-124` added in deprecated `componentWillMount` via fresh `.bind()`, no `componentWillUnmount` anywhere — unremovable, stacks on remount.
- **P1.8 `getTagData` mutates the shared tag index on every read** — `src/App.js:2532-2533` `delete g.verses` then rebuild — a read API that rewrites `globalData` and recurses through children each call.
- **P1.9 Core data shuffled at load** — `src/App.js:1441-1444` `verseTagIndex` arrays shuffled in `loadCore` → nondeterministic per session; breaks "same URL, same page" and snapshot testing. Shuffle at render time instead.
- **P1.10 `setState(x, fn(args))` immediate-invoke bug** — `src/Components/Tags.js:304` calls `setTagBlock` immediately and passes `undefined` as callback (same bug class fixed elsewhere per comments). Grep `setState(.*,\s*app\.` for siblings.
- **P1.11 Silent verse drop** — `src/Components/Passage.js:382-383` logs "ERROR" and returns null — a verse silently disappears from the page.

### UX quick wins (single-file CSS fixes)
- **P1.12 Users cannot copy commentary text** — `src/App.css:382-392` applies `user-select:none` to commentary prose (plus `-webkit-touch-callout:none` at 199-204 killing iOS long-press). In a scripture-study app this is a direct failure. Restrict to real controls.
- **P1.13 `cursor:pointer` on the entire document** — `src/App.css:46` `html,body { cursor:pointer }` — every pixel signals clickable; affordances invisible.
- **P1.14 Audio playback layout blowup** — `src/App.css:1065-1069` playing verse jumps to `font-size:40px`, reflowing the column mid-listen. Highlight with background/border.
- **P1.15 Leftover debug CSS** — `src/App.css:1057-1062` red-bordered `position:fixed` block.
- **P1.16 Black screen before SPA boots** — `AppClient.tsx` `dynamic(..., {ssr:false})` with no `loading` option + `body { background:#000 }`. Provide a 4-column skeleton.
- **P1.17 Content pops in on a hard 3s timer** — `src/App.js:1511-1534` `setTimeout(...,3000)` before loading side-by-side versions; version `<img>`s lack width/height (CLS). Load on idle; reserve dimensions.

### Repo & dependency hygiene
- **P1.18 `public/com/` — 13,671 JSON files (67 MB) tracked; ~597 MiB git pack** from old Jenkins auto-commits. 98% of all tracked files. Fix: publish data to S3/CDN or a gitignored build output; `git filter-repo` if clone size matters.
- **P1.19 Five test files Jest never runs** — `jest.config.js` `testMatch` misses `src/state/*.test.js`, `src/state/__tests__/`, `src/routing/routeCodec.test.js` (`npx jest --listTests` = 8 files). Add `<rootDir>/src/**/*.test.{js,jsx}`.
- **P1.20 Unused/dead deps** — never imported: `ajv`, `jsoncomp`, `react-device-detect`, `core-js`. Redundant: `atob` (browser/Node global). Unmaintained & React-18-hostile: `react-helmet` (drop with P0.6), `react-sortable-hoc` (archived; the reason for `--legacy-peer-deps`; migrate Settings to `@dnd-kit/sortable`), `react-tipsy`, `react-player@1` (native `<audio>` suffices). Misaligned: `pako@1` with `@types/pako@2`.
- **P1.21 Dead config/build artifacts** — `.rescriptsrc.js`, `.webpack.config.js` (electron-renderer config with no rescripts/react-scripts installed), `src/react-app-env.d.ts`, stale `build/` (77 MB local CRA/Electron output), `test-results/`, CRA `browserslist` block, 7 orphan images per `docs/reference/image-inventory.md`.
- **P1.22 AGENTS.md is dangerously stale** — describes CRA 3 + Electron 6 + React 16 "class components only," says "No React Router" in Constraints while the Routing section documents React Router v6, and claims "No test suite exists" (there are 57 passing unit tests + 9 Playwright specs). Any agent or contributor following it will make wrong changes. Rewrite to match the Next.js reality.

---

## P2 — Structural refactor (post-launch, highest-leverage first)

### The state architecture (CRITICAL, the root cause of most P1 client bugs)
- **P2.1 `globalData` + `app={this}`** — `src/globals.js:4-17`, `src/App.js:137-138`: `globalData.app = this; globalData.state = this.state` assigned **inside `render()`**; 40+ call sites across components invoke `app.setState` directly; the `DataContext.Provider` value never changes so context never signals updates — the app only works because the root re-renders everything. **Fix:** immutable per-render snapshot `{data, state, actions}`, bounded actions API, no global writes in render.
- **P2.2 `App.js` is a 2,829-line god component** owning ~12 concerns (50-field flat state, fetch+gzip decode, data indexing, subsite blacklist mutation, keyboard, imperative scrolling, DOM layout math, URL sync, SEO, settings persistence, tag-graph traversal, reference formatting, popup helper). **Extraction order:** (1) data loading/normalization → `loadIsaiahData()` module returning a frozen dataset; (2) navigation/URL sync → routing layer; (3) tag-graph + reference utils → pure modules in `src/state/`; (4) keyboard → its own handler with a declarative `e.key` map (currently ~25 magic `keyCode` numbers, `src/App.js:515-655`).
- **P2.3 Navigation via DOM clicks; state read back out of the DOM** — `clickElementID` (`src/App.js:657-661`) drives arrow keys/cycling by clicking buttons found by id/selector; `tagUp/tagDown` rebuild the tag list from `querySelectorAll(".parentTag")` `innerText` (`:779-799`); `checkFloater` sniffs another component's open state via `classList` (`:2114-2116`). Components should register actions; keyDown dispatches actions.
- **P2.4 Manual layout engine** — `spreadVerse`/`spreadOutline` (`src/App.js:1121-1177`) `while`-loop inline-style mutation with forced reflow per iteration. Replace with flexbox/`clamp()`.
- **P2.5 Remaining SSoT consolidation** — search-encoding copy-pasted in 5 places with non-round-tripping codecs (`routeCodec.js:174-187` et al.); subsite blacklist duplicated client/server with the server half "not yet implemented" (`src/App.js:1249-1330` vs `lib/server/applySubsite.ts`); settings precedence smeared across four methods (`initApp`/`checkLoaded`/`getSettingsFromUrl`/`validateSettings`) → one pure `resolveInitialState()`; dual legacy/enum state fields (`tagPanel`/`audioMode`) with hand-written literal writers (`App.js:2192-2194`); magic verse id `17656` in two places; load coordination via mutable `load_queue` array → `Promise.all`.

### Accessibility & touch (large but mechanical)
- **P2.6 26 div/span/img click targets** with no `tabIndex`/`role`/key handlers — chapter nav, version cycling, tag open, Settings close are keyboard- and screen-reader-inaccessible (`Commentary.js:269-272`, `Tags.js:118-120`, `Search.js:78`, `Settings.js:63`, `Structure.js:54`, `Verse.js:203`, …). `AudioToolbar.js` shows the house pattern done right — replicate it.
- **P2.7 Settings modal** — no focus trap/dialog role/Escape; ranking is drag-only (no keyboard/touch path). `AudioMenuPopover` is `role="menu"` in name only.
- **P2.8 Hover-only interactions** — version swap, commentary menu, previews are `onMouseEnter`-only (`Verse.js:88-102, 274-384`, `Commentary.js:158`); need tap equivalents.
- **P2.9 Touch targets & legibility** — clickable elements at 15–24px (`.vernum`, `.audio-gear`, `.taglink`); text at 7–12px in ~22 rules; contrast failures (`#999` on white 2.8:1, `#999` on `#DDD` ~2.1:1, `#AAA` on `#EEE` ~1.9:1). Floor text at 13–14px, `pointer:coarse` sizing, darken grays to ≥`#767676`.
- **P2.10 Semantics** — meaningless alts (`alt="img"` on the Settings close button, `alt="spot"`), unlabeled search input and commentary `<select>`, `<div>` nested inside `<h2>` (invalid), icon buttons inside the only `<h1>`.
- **P2.11 Misc** — popup-window navigation (`PopupCenter`, `src/App.js:2043` — popup-blocked, unusable on mobile → `target="_blank" rel="noopener"`); Google Fonts `<link>` → `next/font`; module-scope `Element.prototype.matches` polyfill (`src/App.js:2800`) → delete; render-path side effects (`Tags.js:428` `saveFloater` during map; `Audio.js:197-205` `setTimeout` in render with no cleanup); uncontrolled search input with a dep-less effect stealing focus every render (`Search.js:33-43`).

---

## Suggested sequencing

| Phase | Contents | Effort |
|---|---|---|
| **1. Stop the bleeding** (days) | P0.3 fetch/error handling + error boundaries; P0.2 popstate; P0.5 headers + `html-react-parser` + `npm audit fix`; P1.4–P1.6 live bugs; P1.12–P1.15 CSS one-liners; P1.19 testMatch; P1.1 analytics | Small, independent, high impact |
| **2. SEO & SSoT** (days) | P0.4 404s/robots/sitemap/308; P0.6 single metadata source + kill Helmet; P1.22 rewrite AGENTS.md | Contained |
| **3. Responsive layout** (1–2 wks) | P0.1 breakpoints, grid columns, P1.16/P1.17 loading skeleton & CLS, P2.9 touch targets | The big UX lift |
| **4. Platform** (1 wk) | Next 15/16 upgrade; dep replacement (`react-sortable-hoc` → dnd-kit, drop `--legacy-peer-deps`); caching/ISR (P1.3); CI (P1.2); repo slimming (P1.18, P1.21) | Mostly mechanical |
| **5. Architecture** (ongoing) | P2.1–P2.5 state/actions layer, App.js decomposition; P2.6–P2.11 a11y overhaul | Incremental, unblocks everything else |
