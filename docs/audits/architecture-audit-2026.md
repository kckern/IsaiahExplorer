# Architecture & Practices Audit — Isaiah Explorer
**Date:** May 2026  
**Codebase age:** ~8 years (React 16, CRA 3, Electron 6)  
**Auditor note:** This was the author's first React project. The audit is constructive, not critical — the app *works*, ships, and serves real users. The goal is to identify what has aged poorly and propose a realistic modernization path.

---

## Executive Summary

Isaiah Explorer is a thoughtfully designed study tool with genuinely clever ideas — especially the flat-file "API" and client-side decompression approach. For a first React project it is impressively complete. The main issues today are not architectural missteps but the natural cost of 8 years of drift: the React ecosystem moved, browsers improved, and patterns that were reasonable in 2017–2018 now have better alternatives.

**Overall grades:**

| Area | Grade | Notes |
|---|---|---|
| Data loading / compression strategy | B+ | Smart for its era; still reasonable |
| State management | C | Works, but monolith App.js is a maintenance burden |
| Routing | C | Hash routing is fine; the regex parsing is fragile |
| Component architecture | C+ | Correct class-component usage; prop-drilling is too deep |
| Dependency freshness | D | React 16 / CRA 3 / Electron 6 are all EOL |
| Security | B | No user auth, no dynamic SQL — limited surface area |
| Performance | C+ | Eager loading of all top-5 translations on startup is wasteful |
| Accessibility | D | Keyboard-first but screen-reader semantics are missing |
| Code style / maintainability | C | `debugger` statements in production, dead code, magic strings |

---

## 1. Data Loading & Compression Strategy

### What was done
All large datasets (`core/core.txt`, `text/verses_*.txt`, `words_HEB.txt`, `core/tags_hl.txt`) are stored as **gzip + base64** encoded `.txt` files, fetched via `fetch()`, and decompressed client-side with `pako.ungzip` + `atob`.

### Evaluation: Still Reasonable, But Not Optimal

**Why it was smart:**
- In 2017–2018, static hosting was cheap and simple. Flat files meant zero backend, zero database, zero API surface to break.
- Gzipping data is the right instinct: `core.txt` is 544 KB compressed. Uncompressed it would be several MB.
- Client-side decompression with pako works reliably.

**Where it falls short today:**
- **Double-encoding waste:** The files are `base64(gzip(JSON))`. HTTP/HTTPS servers already apply `Content-Encoding: gzip` automatically when the client sends `Accept-Encoding: gzip`. The base64 wrapper adds ~33% overhead on top of a file that will then be *re-gzipped* in transit. Net effect: you're gzipping twice and base64-expanding by a third.
- **`atob` is a browser built-in** — the `atob` npm package (which this project imports) is a polyfill for Node.js that is completely unnecessary in a browser context. In 2026 `atob` is universally available natively.
- **`tags_hl.txt` (212 KB) is a secondary fetch** that fires after the core data loads. It runs inside the `loadCore()` `.then()` chain after `checkLoaded()` has already been called. This means the app shows as "ready" before tag highlight data arrives, requiring a separate `tagsHLReady` state flag. A cleaner design would include `tags_hl` data in `core.txt` or fetch it in parallel.
- **All five top-version text files are eagerly preloaded** after a hard-coded 3-second `setTimeout` in `loadTopVersions()`. This adds 5 × ~100 KB = ~500 KB of network traffic every page load, regardless of whether the user ever switches translations.

### Recommendations

| Issue | Recommendation |
|---|---|
| Double-encoding | Store files as raw `.json.gz` and rely on HTTP `Content-Encoding: gzip`. Remove the base64 layer and the `atob` npm dependency. |
| pako on the client | With raw `.json.gz` served via HTTP, the browser decompresses transparently — pako is no longer needed. |
| `tags_hl.txt` separate fetch | Merge into `core.txt` or fetch in parallel with it (not nested inside its `.then()`). |
| Eager translation preloading | Replace the 3-second timeout with an `IntersectionObserver` or `requestIdleCallback` that preloads translations only when the user is idle, not immediately on startup. |
| `atob` npm package | Remove. Use the native browser `atob()` directly, or switch to `Uint8Array` + `TextDecoder` which is more modern. |

---

## 2. State Management

### What was done
A single root `App` class component holds ~50 state fields. Every child receives `app={this}` — a live reference to the root — and calls `app.setState()` directly.

### Evaluation: It Works, But Doesn't Scale

**What's good:** This pattern is easy to understand when you're learning. There is a single place to look for all state. No boilerplate.

**What hurts:**
- `App.js` is **~2,945 lines** — the largest single file in the project by 5×. It contains data loading, URL routing, keyboard handling, scroll logic, audio control, tag navigation, and commentary management all in one class.
- **Every state change re-renders the entire tree.** When the user presses an arrow key, all four columns re-render. React does reconcile efficiently, but the component tree has no `shouldComponentUpdate` guards or `React.PureComponent` usage.
- `globalData` in `globals.js` is a **mutable singleton** that is shared by reference everywhere and mutated directly (e.g., `delete globalData.tags.tagIndex[tagName]`). Mutations are invisible to React's diffing — the app only works because `setState` is called separately after mutations. A mutation without a subsequent `setState` would silently fail.
- The `floater` object on `App` (`this.floater = {}`) is mutated in place outside of `setState`, bypassing React entirely.

### Recommendations

A complete rewrite is not necessary. Pragmatic improvements in order of impact:

1. **Extract `App.js` into domain modules.** The class methods can be grouped into logical files (`navigation.js`, `dataLoader.js`, `urlRouter.js`, etc.) and imported as helpers. The class stays but becomes a thin coordinator. This alone makes the file navigable.
2. **Replace `globalData` mutations with a proper cache object.** Instead of `delete globalData.foo`, use immutable updates or a Map. At minimum, add a comment to every direct mutation explaining why it's safe.
3. **Add `PureComponent` or `shouldComponentUpdate`** to `VerseBox` and other leaf components that receive stable props.
4. **Longer term:** React Context (or Zustand, Jotai — tiny libraries) would let you remove the `app={this}` prop drill without a full Redux migration.

---

## 3. Routing

### What was done
All routing is manual: `getSettingsFromUrl()` parses `window.location.hash` with a large regex on load; `setUrl()` writes back to the hash on every navigation.

### Evaluation: Functional But Fragile

**What's good:** Hash-based routing works without a server rewrite rule. The URL encodes the full app state, which is actually quite good for shareability.

**The problems:**
- The main URL regex in `getSettingsFromUrl` is a single 180-character pattern. It has been patched with multiple `if` branches and a `checkForSpecialUrl()` fallback — clear signs it has been extended beyond its original design.
- The same URL structure is duplicated in three places: `App.js` (JavaScript), `server.php` (PHP), and implicitly in the AGENTS.md documentation. If the URL shape changes, all three must be updated manually.
- URL segments are **positional** (structure / outline / version / chapter / verse). Adding a new optional segment in the middle would break all existing shared URLs.
- `window.location.hash = path.toLowerCase()` fires on *every* `setActiveVerse()` call, including programmatic arrow-key navigation. This floods the browser history — pressing down 10 times creates 10 history entries.

### Recommendations

1. **Use `history.replaceState` instead of `window.location.hash =`** for in-session navigation (arrow keys, audio playback). Only `pushState` on explicit user navigations (clicking a verse, switching translation).
2. **Centralize the URL schema** into a single `url.js` module with `parse()` and `serialize()` functions. Both `App.js` and `server.php` could document/validate against it.
3. **Switch optional segments to query params** (`?tag=…&search=…`) rather than positional path segments. This is more extensible and easier to parse robustly.

---

## 4. Component Architecture

### What was done
Eleven components plus a Settings subfolder. All are class components. All receive `app={this}` and reach directly into `app.state`.

### Evaluation: Reasonable for First React Project

The four-column layout maps cleanly to four top-level components. The components are appropriately sized (200–850 lines each). The `app` prop pattern is a well-known anti-pattern, but it is *consistently* applied — there are no mixed patterns, which is actually better than many real-world codebases.

**Issues:**
- `app.setState()` is called from inside child components. This means child components are not reusable outside `App` — they are tightly coupled to the root instance.
- `Verse.js` renders `Passage` and `Hebrew` inline (`import {Passage}`, `import {Hebrew}`), coupling the verse column to those panels.
- Inline `setTimeout` inside `componentDidMount` in `VerseColumn` (hardcoded 450ms delay to expand a loading spinner) is fragile. It races with actual data load completion.
- **`SGLink` is exported from `App.js`** — a presentational component living in the root app file. It belongs in `Components/`.

### Recommendations
1. Move `SGLink` to `Components/SGLink.js`.
2. Replace the 450ms `setTimeout` in `VerseColumn` with a callback from `App` when loading is complete.
3. No need to convert to function components right now — but **new features should be written as function components with hooks**. CRA can support both in the same project.

---

## 5. Dependency Freshness

| Dependency | Installed | Current (2026) | Status |
|---|---|---|---|
| `react` / `react-dom` | ^16.0.0 | 19.x | EOL — React 16 loses concurrent features, server components, `useTransition`, etc. |
| `react-scripts` (CRA) | ^3.1.1 | CRA itself is unmaintained (archived) | Should migrate to Vite |
| `electron` | ^6.0.9 | 34.x | 6.x has known security CVEs |
| `electron-builder` | ^21.2.0 | 25.x | Major version behind |
| `pako` | ^1.0.6 | 2.x | Minor — 1.x still works |
| `react-sortable-hoc` | ^0.8.3 | Unmaintained | Replace with `@dnd-kit/sortable` |
| `react-tipsy` | ^0.6.2 | Unmaintained | Replace with Floating UI or Radix Tooltip |
| `react-player` | ^1.12.0 | 2.x | Major version behind |
| `atob` | ^2.1.2 | N/A (native) | Remove entirely |
| `babel-runtime` | ^6.26.0 | Babel 7 | Stale |

**The `--openssl-legacy-provider` flag in the `npm start` script** is a tell-tale sign that the Node.js / Webpack version mismatch has already been patched around rather than fixed.

### Recommendations (prioritized)

1. **Electron 6 → current** is the most urgent security issue. Electron 6 shipped with Chromium 76 which has multiple disclosed CVEs. This is a blocking concern for a desktop app.
2. **CRA 3 → Vite** is the highest-leverage DX improvement. Vite cold starts in under 1 second vs CRA's 20–30s. Migration is typically a few hours for a project this size.
3. **Remove `atob` npm package.** Zero-effort win.
4. **Replace unmaintained UI libraries** (`react-tipsy`, `react-sortable-hoc`) when touching those components.

---

## 6. Security

The attack surface is small: no user authentication, no database, no user-generated content stored server-side. The main concerns are:

**PHP server (`server.php`):**
- `$_SERVER['REQUEST_URI']` is interpolated directly into HTML output (`<meta content="<?=$url?>"`). This is an **XSS vulnerability** — a crafted URL could inject arbitrary HTML/JS into the OG meta tags. In practice the damage is limited since this is a meta-tag-only page, but it should be fixed.
- `$_SERVER['HTTP_HOST']` is also reflected unescaped. An attacker can set `Host:` to arbitrary values.

**JavaScript:**
- The search function does `new RegExp("" + query + "", "igm")` where `query` is taken from the URL hash and/or user input. An invalid regex pattern will throw an unhandled exception. There is no try/catch around this.
- `unzipJSON` wraps pako in a try/catch — good. But it returns `["Unzip Failure", err]` (an array) on failure. Callers assign this to `globalData` fields expecting objects, which will produce silent runtime errors.
- Commentary HTML is rendered with `html-react-parser` which is appropriate. The `<a class="isa" verses="base64(...)">` link data is decoded with `atob` + `JSON.parse` — this is fine since the source data is trusted (bundled flat files).
- `debugger` statements appear in production code (`setActiveTag`, `getHighlightedVerseRange`, `getTagData`). These halt execution in DevTools and should be removed.

### Recommendations

1. **PHP:** Escape all reflected values: `htmlspecialchars($url, ENT_QUOTES, 'UTF-8')`. Apply to `$url`, `$_SERVER['HTTP_HOST']`, `$ref`, `$heading`, `$description`.
2. **JavaScript search:** Wrap the `new RegExp(query)` in a try/catch and show a friendly "invalid search" message.
3. **`unzipJSON` error return:** Change the failure return to `null` or `{}` and add null-guards at call sites.
4. **Remove all `debugger` statements** before any production deployment.

---

## 7. Performance

| Metric | Current Behavior | Issue |
|---|---|---|
| Initial load | Fetches `core.txt` (544 KB), active translation (92–120 KB), `words_HEB.txt` (840 KB), `tags_hl.txt` (212 KB) — ~1.8 MB compressed | Hebrew data always loaded even if the user never opens Hebrew mode |
| Translation preload | 5 translations loaded after 3 s `setTimeout` — ~500 KB | Happens on every page load regardless of usage |
| Re-render on keydown | All four columns re-render on every arrow key press | No `PureComponent` / memoization |
| DOM manipulation | `spreadVerse()` uses a busy-loop adjusting `lineHeight` in 0.1em increments until the text fills its container | This forces multiple synchronous reflows; should use CSS container queries or `ResizeObserver` |
| Scroll animation | `scrollBoxTo()` uses `setTimeout` at 20ms intervals for animation | Use `requestAnimationFrame` or CSS `scroll-behavior: smooth` |

### Recommendations
1. **Lazy-load `words_HEB.txt`** only when the user first opens Hebrew mode (it's already conditionally loaded via `load_queue` — verify this gate is working and extend it).
2. **Remove the 3-second `setTimeout` preload.** Replace with `requestIdleCallback` so it only runs when the browser is idle.
3. **Replace `spreadVerse()` busy-loop** with a CSS approach: set the container to `display: flex; align-items: stretch` and let the browser do it, or use a `ResizeObserver`.
4. **Replace `scrollBoxTo` `setTimeout` loop** with `element.scrollTo({ top: to, behavior: 'smooth' })`.

---

## 8. Accessibility

The app is keyboard-first, which is a genuine accessibility strength. But:
- The four-column layout uses `<div>` elements with no ARIA roles (`role="main"`, `role="navigation"`, `role="complementary"` etc.).
- Column headings are `<h4>`/`<h5>` inside `<div>` wrappers — the heading hierarchy may be invalid.
- The active verse, highlighted heading, and selected tag have no `aria-selected` or `aria-current` attributes — screen readers cannot determine what is active.
- `onClick` handlers on non-interactive elements (`<div>`, `<span>`) have no corresponding `role="button"` + `tabIndex="0"` + `onKeyDown` handler.
- Color is used as the sole indicator for verse highlighting — no pattern or icon for color-blind users.

### Recommendations
These are improvements for a future pass; none are quick fixes. Priority order:
1. Add `aria-current="true"` to the active verse element.
2. Add `role` attributes to the four main columns.
3. Replace `onClick` on `<div>` verse rows with actual `<button>` elements.

---

## 9. Code Style & Maintainability

- **`var` throughout** — `let`/`const` were well-supported when this was written (2017+). `var` has function scope, not block scope, which is a source of bugs (see the loop variable leaks in `loadCore()`'s nested `for` loops).
- **`for...in` on arrays** — used extensively (`for (var x in array)`). This iterates enumerable properties, not array indices. It works when arrays are clean but is technically incorrect and can break with extended Array prototypes.
- **Magic strings everywhere** — `"versebox"`, `"arrow"`, `"audio"`, `"init"`, `"tag"`, `"newversion"`, `"comaudio"`, `"closeSearch"` are source identifiers passed through `setActiveVerse()`. There is no enum or constant file. A typo is a silent bug.
- **Commented-out code** — `checkZoom()` contains a fully commented-out zoom implementation. `setUrl()` has commented-out audio path logic. Dead code makes it hard to tell what's intentional.
- **`parseInt(x, 0)` instead of `parseInt(x, 10)`** — radix `0` is implementation-defined. Use `10` explicitly to avoid octal surprises.
- **`console.log` statements** are scattered throughout (some commented out).
- **`this.filtering()` returns nothing** — the method calls `Object.keys(tagStructure).filter(...)` but has no `return` statement. This appears to be a bug that happens to be harmless because its return value is unused.

### Quick wins (can be done in an afternoon)
1. Search and replace `parseInt(x, 0)` → `parseInt(x, 10)` throughout.
2. Remove all `debugger` statements.
3. Extract source-name magic strings into a constants file: `const SRC = { ARROW: 'arrow', AUDIO: 'audio', ... }`.
4. Add a `return` to `filtering()`.

---

## Summary: Recommended Modernization Roadmap

### Phase 1 — Low-effort, high-value (1–2 days)
- [ ] Remove `debugger` statements
- [ ] Remove `atob` npm package, use native `atob()`
- [ ] Fix `parseInt(x, 0)` → `parseInt(x, 10)`
- [ ] Fix PHP XSS: `htmlspecialchars()` all reflected server values
- [ ] Wrap `new RegExp(query)` in search in try/catch
- [ ] Fix `filtering()` missing `return`
- [ ] Replace `scrollBoxTo` `setTimeout` loop with `scrollTo({ behavior: 'smooth' })`

### Phase 2 — Meaningful improvements (1–2 weeks)
- [ ] Migrate CRA → Vite (major DX improvement, no React version change required)
- [ ] Replace `tags_hl.txt` separate fetch — merge into `core.txt` or parallel-fetch
- [ ] Remove base64 encoding from data files, serve as `.json.gz` with HTTP compression
- [ ] Replace 3-second preload setTimeout with `requestIdleCallback`
- [ ] Extract `App.js` into domain helper modules (routing, navigation, data)
- [ ] Add `aria-current` to active verse element

### Phase 3 — Longer-term modernization (ongoing)
- [ ] Upgrade Electron to current version (security)
- [ ] Upgrade React 16 → 18/19 (enables concurrent features)
- [ ] Replace `react-sortable-hoc` with `@dnd-kit/sortable`
- [ ] Replace `react-tipsy` with Radix UI Tooltip or Floating UI
- [ ] Introduce React Context to remove the `app={this}` prop drill
- [ ] Replace `spreadVerse()` DOM busy-loop with CSS/ResizeObserver

---

*This audit was written against the codebase state as of May 2026. Many of the issues described are normal artifacts of a project built over time by a single developer learning React. The fact that the app ships, works, and handles a genuinely complex data model is the more important story.*
