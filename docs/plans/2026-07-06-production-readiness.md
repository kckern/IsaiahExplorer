# Production Readiness (P0+P1+P2) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Take Isaiah Explorer from "works on my 1820px monitor" to 2026-standards production: resilient, responsive, accessible, secure, observable, and architecturally sound — every P0/P1/P2 finding in `docs/audits/2026-07-06-production-readiness-audit.md`.

**Architecture:** Five sequential phases. Phase 1 hardens the existing code in place (error handling, security, live bugs). Phase 2 makes the server the single source of truth for SEO/routing defaults. Phase 3 converts the fixed 1820px float layout to responsive CSS grid with a mobile tab bar. Phase 4 upgrades the platform (Next 15/16, dependency replacement, CI, caching). Phase 5 dismantles the god-component pattern incrementally (actions layer → data layer → DOM-free navigation → a11y).

**Tech Stack:** Next.js 14→15/16 (App Router, Amplify WEB_COMPUTE), React 18 (legacy class SPA in `src/`), Jest + @swc/jest, Playwright, CSS grid/custom properties, @dnd-kit (replacing react-sortable-hoc), ESLint (`eslint-config-next`).

**Conventions for every task:**
- Run unit tests with `npx jest` (fast, ~2s). Run typecheck with `npx tsc --noEmit`.
- Dev server: `npm run dev` → **http://localhost:3001** (NEVER port 3000 — reserved by another project).
- Commit after every task with the message given. All commits end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- The legacy SPA convention is class components + `app` prop. Phase 1–4 tasks conform to it; Phase 5 deliberately replaces parts of it. Do not "modernize" beyond what a task asks.
- Audit finding IDs (P0.x/P1.x/P2.x) refer to `docs/audits/2026-07-06-production-readiness-audit.md`.

---

# PHASE 1 — STOP THE BLEEDING

## Task 1: `fetchData` helper — resilient fetch + strict unzip (P0.3)

**Files:**
- Create: `src/data/fetchData.js`
- Test: `src/data/fetchData.test.js` (picked up after Task 14; run directly until then)

**Step 1: Write the failing test**

```js
// src/data/fetchData.test.js
/** @jest-environment jsdom */
import { fetchData, UnzipError } from './fetchData'
import pako from 'pako'

function gzipBase64(obj) {
  const bytes = pako.gzip(JSON.stringify(obj))
  let bin = ''
  bytes.forEach(b => { bin += String.fromCharCode(b) })
  return btoa(bin)
}

describe('fetchData', () => {
  afterEach(() => { global.fetch = undefined })

  it('resolves parsed JSON for a gzip+base64 payload', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(gzipBase64({ a: 1 })) })
    await expect(fetchData('/core/core.txt')).resolves.toEqual({ a: 1 })
  })

  it('rejects on non-ok response instead of parsing the error body', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404, text: () => Promise.resolve('<html>404</html>') })
    await expect(fetchData('/core/core.txt')).rejects.toThrow(/404/)
  })

  it('retries once on network failure, then succeeds', async () => {
    global.fetch = jest.fn()
      .mockRejectedValueOnce(new TypeError('network'))
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(gzipBase64([1, 2])) })
    await expect(fetchData('/text/verses_KJV.txt')).resolves.toEqual([1, 2])
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  it('rejects with UnzipError on corrupt payload (never returns the ["Unzip Failure"] tuple)', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('not-base64-gzip!!') })
    await expect(fetchData('/core/core.txt')).rejects.toBeInstanceOf(UnzipError)
  })
})
```

**Step 2: Run it — expect FAIL (module not found)**

Run: `npx jest src/data/fetchData.test.js`
Expected: FAIL — `Cannot find module './fetchData'`

**Step 3: Implement**

```js
// src/data/fetchData.js
// Single fetch path for every compressed dataset (core.txt, verses_*.txt,
// words_HEB.txt, tags_hl.txt). Checks response.ok, retries a network error
// once, and throws on corrupt payloads instead of returning an error tuple
// (the old unzipJSON returned ["Unzip Failure", err], which callers merged
// into globalData as keys "0"/"1" — audit P0.3/unzipJSON).
import pako from 'pako'

export class UnzipError extends Error {}

export function unzipJSON(base64) {
  try {
    const bytes = pako.ungzip(Uint8Array.from(atob(base64), c => c.charCodeAt(0)))
    return JSON.parse(new TextDecoder().decode(bytes))
  } catch (err) {
    throw new UnzipError('Failed to decode dataset: ' + err.message)
  }
}

export function fetchData(url, { retried = false } = {}) {
  return fetch(url)
    .then(response => {
      if (!response.ok) throw new Error('HTTP ' + response.status + ' loading ' + url)
      return response.text()
    })
    .then(unzipJSON)
    .catch(err => {
      if (!retried && !(err instanceof UnzipError)) return fetchData(url, { retried: true })
      throw err
    })
}
```

**Step 4: Run test — expect PASS.** `npx jest src/data/fetchData.test.js`
(Note: `TextDecoder`/`atob`/`btoa` exist in jsdom ≥ 20 and all browsers; this also replaces the hand-rolled `atos()` UTF-8 decoder, audit P1.20.)

**Step 5: Commit** — `feat(data): add fetchData helper with ok-check, retry, and strict unzip`

## Task 2: Visible load-error state with Retry (P0.3)

**Files:**
- Modify: `src/App.js` (state block ~line 95, `loadCore` at 1219–1509, `loadTopVersions` 1511–1535, `loadVersionText` 1576–1590, `loadVersion` 1592+, tags_hl fetch 1470, words_HEB fetch 1488, `unzipJSON` 2723–2743)
- Modify: `src/App.css` (append)

**Step 1: Add error state + handler to App**

In the state block add `load_error: null,` (after `ui_core_loading: true,` ~line 97). Add a method:

```js
handleLoadError(what) {
  return function (err) {
    console.error("Data load failed (" + what + "):", err)
    this.setState({ load_error: what })
  }.bind(this)
}
```

**Step 2: Route ALL data fetches through `fetchData`**

Import at top of App.js: `import { fetchData } from "./data/fetchData"`.
Replace each `fetch(...).then(response => response.text()).then(data => { var unzipped = this.unzipJSON(data); ...` chain:

- `loadCore` core.txt (line 1238): `fetchData(this.state.rootURL + "./core/core.txt").then(unzipped => { for (var k in unzipped) globalData[k] = unzipped[k]; ... }).catch(this.handleLoadError("core"))` — keep the whole existing body inside the `.then`, delete the inner `this.unzipJSON` call.
- tags_hl.txt (line 1470): same pattern, `.catch(err => console.warn("tags_hl failed", err))` (highlights are cosmetic — non-fatal).
- words_HEB.txt (line 1488): `.catch(this.handleLoadError("hebrew"))` **only when** `parseRoute(window.location.pathname).hebrew !== undefined` (it blocks `checkLoaded` only then); otherwise `console.warn`.
- verses (line 1500): `.catch(this.handleLoadError("version"))`.
- `loadTopVersions` (1519): `.catch(err => console.warn(...))` — non-fatal.
- `loadVersionText` (1582) and `loadVersion` (1597): use `fetchData`; `loadVersion`'s catch must also `this.setState({ui_version_loading: false})`.

Delete the old `unzipJSON`/`atos` methods (App.js:2723–2743) once no caller remains (`grep -n "this.unzipJSON" src/App.js` → 0 hits).

**Step 3: Render the error banner**

In `render()` (after the `videoPanel` block, ~line 162):

```js
var errorPanel = null
if (this.state.load_error !== null)
  errorPanel = (
    <div key="loaderror" className="load-error" role="alert">
      <p>Something went wrong loading the {this.state.load_error} data.</p>
      <button type="button" onClick={() => window.location.reload()}>Reload</button>
    </div>
  )
```

Render `{errorPanel}` just inside `<div id="approot">`. Append CSS:

```css
.load-error { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,.85);
  color: #fff; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 1rem; font-size: 16px; }
.load-error button { font-size: 16px; padding: 12px 32px; cursor: pointer; }
```

**Step 4: Verify.** `npx jest` (all green), then `npm run dev`, open http://localhost:3001 — app loads normally. Then simulate failure: DevTools → Network → block `core.txt` → reload → error banner with Reload button appears (no infinite spinner).

**Step 5: Commit** — `fix(data): surface load errors with retry; stop piping error bodies into globalData`

## Task 3: Fix the broken Back/Forward button — popstate (P0.2)

**Files:**
- Modify: `src/routing/withRouter.js`
- Modify: `src/App.js` (add `handlePopState` near `checkLoaded`, ~line 513)
- Test: `src/routing/__tests__/withRouter.test.js` (already in jest testMatch)

**Step 1: Write the failing test** (append to the existing withRouter test file):

```js
it('invokes onPopState with the new pathname when the user presses Back', () => {
  const spy = jest.fn()
  function Probe() { return null }
  const Wrapped = withRouter(Probe)
  render(<Wrapped onPopState={spy} />)
  window.history.pushState({}, '', '/whole/chapters/kjv/2/1')
  window.dispatchEvent(new PopStateEvent('popstate'))
  expect(spy).toHaveBeenCalledWith('/whole/chapters/kjv/2/1')
})
```

**Step 2: Run — FAIL** (`spy` not called). `npx jest src/routing/__tests__/withRouter.test.js`

**Step 3: Implement in withRouter** — inside `Wrapper`, after the `navigate` callback:

```js
React.useEffect(function () {
  function onPop() {
    if (typeof props.onPopState === 'function') props.onPopState(window.location.pathname)
  }
  window.addEventListener('popstate', onPop)
  return function () { window.removeEventListener('popstate', onPop) }
}, [props.onPopState])
```

**Step 4: Wire App to it.** In `app/[[...slug]]/AppClient.tsx` nothing changes (withRouter passes props through). In `src/App.js`:

```js
// near checkLoaded():
handlePopState(pathname) {
  var settings = this.getSettingsFromUrl({}, pathname)
  this.setState(this.validateSettings(settings), function () {
    this.setActiveVerse(this.state.active_verse_id, undefined, undefined, true, "init")
  })
}
```

Check `getSettingsFromUrl` (App.js ~223): it reads `this.props.location.pathname`; add an optional second arg `pathname` that overrides it. Then in the AppClient boundary the wrapped component needs the prop — modify `AppClient.tsx`'s render: `return <AppWithRouter />` stays, but App must self-wire: in App's `componentDidMount`, if `this.props.onPopState` is undefined, that's fine — instead pass the handler from inside: simplest correct wiring is in `withRouter` itself — call `props.onPopState` **or** a `popStateHandler` the class registers:

```js
// App.js componentDidMount() — after initApp():
window.__isaiahPopState = this.handlePopState.bind(this)
```
is a hack — do NOT do that. Instead have `AppClient.tsx` own the glue:

```tsx
export default function AppClient() {
  const ref = React.useRef<any>(null);
  return <AppWithRouter appRef={ref} onPopState={(p: string) => ref.current?.handlePopState(p)} />;
}
```
and in `withRouter`, forward `props.appRef` as `ref` to the class component (`React.createElement(Component, Object.assign({ ref: props.appRef }, ...))`).

**Step 5: Verify.** Tests pass; then in the dev server: click through 3 verses, press browser Back — the app returns to the previous verse (URL AND content). Forward works too.

**Step 6: Commit** — `fix(routing): handle popstate so browser Back/Forward drives app state`

## Task 4: Error boundaries and 404 page (P0.3)

**Files:**
- Create: `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`

**Step 1: Create the three files**

```tsx
// app/error.tsx
'use client';
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: 'Roboto Condensed, sans-serif' }}>
      <h1>Something went wrong</h1>
      <p>Isaiah Explorer hit an unexpected error.</p>
      <button type="button" onClick={() => reset()} style={{ fontSize: 16, padding: '12px 32px' }}>Try again</button>
    </main>
  );
}
```

```tsx
// app/global-error.tsx
'use client';
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en"><body>
      <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <h1>Something went wrong</h1>
        <button type="button" onClick={() => reset()}>Try again</button>
      </main>
    </body></html>
  );
}
```

```tsx
// app/not-found.tsx
import Link from 'next/link';
export default function NotFound() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: 'Roboto Condensed, sans-serif' }}>
      <h1>Page not found</h1>
      <p>That reference doesn&rsquo;t exist in Isaiah.</p>
      <Link href="/">Go to Isaiah 1:1</Link>
    </main>
  );
}
```

**Step 2: Verify** — `npx tsc --noEmit` clean; `npm run dev` still renders the app.
**Step 3: Commit** — `feat(app): add error, global-error, and not-found boundaries`

## Task 5: Commentary render-crash guard (P0.3 / audit prod #18)

**Files:** Modify: `src/Components/Commentary.js:291` (the `JSON.parse(atob(domNode.attribs.verses))` inside the Parser replace callback)

**Step 1:** Wrap it:

```js
var verses = []
try { verses = JSON.parse(atob(domNode.attribs.verses)) }
catch (e) { console.warn("Bad verses attribute in commentary HTML", e); return undefined }
```
(`return undefined` lets html-react-parser render the anchor as plain text instead of crashing the tree.)

**Step 2:** `npx jest` green; open a commentary in dev to confirm links still work.
**Step 3: Commit** — `fix(commentary): guard cross-reference attribute parse against malformed HTML`

## Task 6: Security headers + poweredByHeader (P0.5)

**Files:** Modify: `next.config.js`, `amplify.yml`

**Step 1: next.config.js** — add inside `nextConfig`:

```js
poweredByHeader: false,
async headers() {
  return [{
    source: '/:path*',
    headers: [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' static.getclicky.com in.getclicky.com; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; img-src 'self' data:; media-src 'self'; connect-src 'self' in.getclicky.com; frame-ancestors 'none'" },
    ],
  }];
},
```
(`'unsafe-inline'` script-src is required until the legacy SPA sheds inline handlers; Clicky origins pre-added for Task 13. Revisit when Phase 5 lands.)

**Step 2:** `amplify.yml` — under the `'**/*'` pattern add the same X-Frame-Options / nosniff / Referrer-Policy / HSTS keys (Amplify serves static assets without invoking Next's `headers()`).

**Step 3: Verify** — `npm run build` succeeds; `npm run start` (port 3001) then `curl -sI http://localhost:3001/ | grep -iE 'x-frame|nosniff|referrer|security-policy|powered'` → shows the four headers, no `X-Powered-By`.
**Step 4: Commit** — `feat(security): CSP + security headers, disable X-Powered-By`

## Task 7: Dependency purge and vulnerability fixes (P0.5, P1.20)

**Files:** Modify: `package.json`, `src/App.js:3` (atob import), `src/Components/Commentary.js:4`

**Step 1:** Remove unused deps: `npm rm ajv jsoncomp react-device-detect core-js atob` — then delete `import atob from "atob"` (or equivalent) at `src/App.js:3` (browser global takes over; verify: `grep -rn "from ['\"]atob\|require(['\"]atob" src/` → 0).
**Step 2:** `npm i html-react-parser@^5` — in `Commentary.js` update the import (v5 default export is still `parse`; if the file imports `{ Parser }` or `Parser` default, rename usages to `parse(html, options)` — same options shape with `replace`). Run the app, open a Barnes commentary, confirm cross-reference links render and are clickable.
**Step 3:** `npm audit fix` (no `--force`). Then `npm audit` — expect the react-16-alpha/isomorphic-fetch/node-fetch chain GONE; remaining highs should be `next` (Phase 4) and dev-only `xlsx`.
**Step 4:** `npm i pako@^2` — API used (`pako.gzip`, `pako.ungzip`) is unchanged; run `npx jest` + load the app (core data decodes).
**Step 5:** `npx jest && npx tsc --noEmit && npm run build` all green.
**Step 6: Commit** — `chore(deps): remove 5 dead deps, html-react-parser 0.4→5, pako 2, audit fix`

## Task 8: Fix the always-throwing scripture-reference popup (P1.4)

**Files:** Modify: `src/App.js` — `sgshow` (2069–2079) and `SGLink` (~2816–2828)

**Step 1:** `SGLink` currently renders `onClick={(e) => app.sgshow(e)}` while `sgshow` reads `this.props.reference` — which doesn't exist on App → TypeError on every click. Move the logic into `SGLink` (it's a function component receiving `reference`): replace the popup with a normal link:

```js
const href = "https://scripture.guide/" + reference.replace(/\s+/g, ".")
return <a className="sglink" href={href} target="_blank" rel="noopener noreferrer">{children}</a>
```
Match the exact URL shape `sgshow` was building (read its `.replace()` chain and reproduce it verbatim). Delete `sgshow` and `PopupCenter` (App.js:2043–2067) if no other caller remains (`grep -n "PopupCenter\|sgshow" src/`).

**Step 2:** Dev-verify: open a commentary containing an external scripture ref, click it — opens scripture.guide in a new tab (also fixes audit P2.11 popup-blocker/mobile issue).
**Step 3: Commit** — `fix(links): scripture references open in new tab instead of throwing`

## Task 9: Remove debugger statements + radix bug (P1.5, P1.6)

**Files:** Modify: `src/App.js:2274, 2476, 2559`, `src/Components/Structure.js:163-171`

**Step 1:** Delete the three `debugger` statements (`grep -n "debugger" src/ -r` → only commented ones remain, delete those too).
**Step 2:** `src/Components/Structure.js:163-171` — change `parseInt(x, 16)` → `Number(x)` (outline stripe index is decimal; radix 16 turned "10" into 16).
**Step 3:** `npx jest` green; dev-check outline striping alternates correctly past index 9 (pick an outline with >10 sections).
**Step 4: Commit** — `fix: remove live debugger statements; decimal radix in outline striping`

## Task 10: Keydown listener lifecycle (P1.7)

**Files:** Modify: `src/App.js:113-124`

**Step 1:** Replace the deprecated `componentWillMount` block:

```js
componentDidMount() {
  this.boundKeyDown = this.keyDown.bind(this)
  document.addEventListener("keydown", this.boundKeyDown)
  var img = new Image()
  img.src = require("./img/interface/book.gif")
  this.initApp()   // note: was `img.onload = this.initApp()` — invoked immediately anyway
}
componentWillUnmount() {
  document.removeEventListener("keydown", this.boundKeyDown)
}
```
Delete `componentWillMount` entirely.

**Step 2:** Dev-verify keyboard nav (arrow keys change verses) still works; React no longer logs the UNSAFE lifecycle warning for App.
**Step 3: Commit** — `fix(lifecycle): keydown listener added in componentDidMount and removed on unmount`

## Task 11: `setState` immediate-invoke callback bug (P1.10)

**Files:** Modify: `src/Components/Tags.js:304`

**Step 1:** `grep -rnE "setState\([^)]*,\s*app\.[a-zA-Z]+\(" src/` — fix every hit (known: Tags.js:304):
`app.setState({...}, app.setTagBlock(index, verseId))` → `app.setState({...}, () => app.setTagBlock(index, verseId))`
**Step 2:** Dev-verify: click a tag block in the floater — selection applies once, no double-jump.
**Step 3: Commit** — `fix(tags): defer setTagBlock to setState callback instead of invoking during call`

## Task 12: Silent verse drop gets a visible placeholder (P1.11)

**Files:** Modify: `src/Components/Passage.js:382-383`

**Step 1:** Replace `console.log("ERROR"); console.log(lineData); ... return null` with:

```js
console.warn("Unrenderable verse line", lineData)
return <span className="verse-render-error" title="This verse could not be rendered">⚠ verse unavailable</span>
```
**Step 2:** `npx jest` green. **Step 3: Commit** — `fix(passage): render a visible placeholder instead of silently dropping verses`

## Task 13: Restore analytics (P1.1)

**Files:** Modify: `app/layout.tsx`

**Step 1:** Recover the Clicky site ID from git history:
`git show $(git rev-list -1 --all -- public/index.html):public/index.html | grep -iA3 clicky`
**Step 2:** Add to `app/layout.tsx` `<body>` (Next `Script`, `strategy="afterInteractive"`):

```tsx
import Script from 'next/script';
// in <body> after {children}:
<Script src="https://static.getclicky.com/js" strategy="afterInteractive" data-id="SITE_ID_FROM_HISTORY" />
```
(If history has no ID, STOP and ask the user which analytics provider/ID to use.)
**Step 3:** Dev-verify: `window.clicky` is defined in the console; navigation fires `clicky.log` (App.js:421 guard now passes). CSP from Task 6 already allows the origins.
**Step 4: Commit** — `feat(analytics): restore Clicky script lost in the Next.js migration`

## Task 14: Un-orphan the five dead test files (P1.19)

**Files:** Modify: `jest.config.js`

**Step 1:** Add to `testMatch`: `'<rootDir>/src/**/*.test.{js,jsx}'` and `'<rootDir>/src/**/__tests__/**/*.test.{js,jsx}'`. Delete the stale header comment about react-scripts/Phase 11.
**Step 2:** `npx jest --listTests` → now ≥14 files (was 8; includes `src/state/audioState.test.js`, `tagPanel.test.js`, `tagSelectors.test.js`, `src/state/__tests__/bridge-invariants.test.js`, `src/routing/routeCodec.test.js`, `src/data/fetchData.test.js` from Task 1).
**Step 3:** `npx jest` — fix any tests that rotted while orphaned (they must pass, not be skipped). If a test asserts behavior that Task 1–11 changed, update the test to the new behavior.
**Step 4: Commit** — `test: include src/ test files in jest testMatch (5 suites were never running)`

## Task 15: CSS quick wins (P1.12–P1.15)

**Files:** Modify: `src/App.css`

**Step 1:** Line 46: `html,body { ... cursor: pointer; }` → delete the `cursor: pointer` declaration only.
**Step 2:** Lines 382–392: remove `#approot.commentaryMode #commentary_text p` (and any other prose selectors) from the `user-select: none` rule — keep it only on genuine controls (`.taglink`, `#user_prefs`, headings that act as buttons). Same for the `-webkit-touch-callout: none` rule at 199–204.
**Step 3:** Lines 1065–1069: `.verse.audio_playing { color: red; font-size: 40px; }` → `{ color: red; background: rgba(255,0,0,.08); font-weight: bold; }` (no reflow).
**Step 4:** Lines 1057–1062: delete the debug rule (`div#text .textcontent { border: 1px solid red; position: fixed; ... }`).
**Step 5:** Dev-verify: text cursor over commentary, selectable/copyable commentary text, audio playback highlights without the column jumping, no red-bordered box anywhere.
**Step 6: Commit** — `fix(css): selectable commentary, sane cursors, no audio reflow, remove debug rule`

---

# PHASE 2 — SEO & SINGLE SOURCE OF TRUTH

## Task 16: Route validation → real 404s (P0.4)

**Files:**
- Modify: `lib/server/routeFromParams.ts`, `app/[[...slug]]/page.tsx`
- Test: `lib/server/__tests__/routeFromParams.test.ts`

**Step 1: Failing tests** (append):

```ts
import { routeFromParams, isRecognizedRoute } from '../routeFromParams';

describe('isRecognizedRoute', () => {
  it('accepts the bare root', () => expect(isRecognizedRoute(undefined)).toBe(true));
  it('accepts a canonical path', () => expect(isRecognizedRoute(['whole','chapters','kjv','5','4'])).toBe(true));
  it('accepts legacy short forms', () => expect(isRecognizedRoute(['5','4'])).toBe(true));
  it('rejects garbage', () => expect(isRecognizedRoute(['wp-admin','setup.php'])).toBe(false));
  it('rejects out-of-range chapters', () => expect(isRecognizedRoute(['whole','chapters','kjv','99','1'])).toBe(false));
});
```

**Step 2: Run — FAIL** (`isRecognizedRoute` not exported). `npx jest lib/server/__tests__/routeFromParams.test.ts`

**Step 3: Implement.** In `routeFromParams.ts` export:

```ts
const MAX_CHAPTER = 66;
export function isRecognizedRoute(slug: string[] | undefined): boolean {
  if (!slug || slug.length === 0) return true;
  const decoded = slug.map((s) => decodeURIComponent(s));
  const parsed = parseRoute('/' + decoded.join('/'));
  // parseRoute is permissive; a path is "recognized" only if every segment
  // was consumed into a known field. Count consumed fields vs segments.
  const recognized = parsed.recognizedSegments ?? 0;   // see step 4
  if (recognized !== decoded.length) return false;
  if (parsed.chapter !== undefined && (parsed.chapter < 1 || parsed.chapter > MAX_CHAPTER)) return false;
  if (parsed.verse !== undefined && parsed.verse < 1) return false;
  return true;
}
```

**Step 4:** `src/routing/routeCodec.js` `parseRoute` must report how many path segments it consumed: add `result.recognizedSegments = <count of segments matched>` (increment wherever a segment is matched into structure/outline/version/chapter/verse/tag/search/hebrew/commentary). Add codec tests in `src/routing/routeCodec.test.js` for `recognizedSegments` on: canonical path (5), garbage (`/wp-admin/setup.php` → 0), mixed (`/whole/garbage` → 1).

**Step 5:** In `page.tsx`:

```ts
import { notFound } from 'next/navigation';
// first line of generateMetadata AND Page:
if (!isRecognizedRoute(params.slug)) notFound();
```
(`Page` needs `{ params }: Props` added.)

**Step 6:** All jest suites green. Dev-verify: `curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/wp-admin/setup.php` → **404**; `/whole/chapters/kjv/5/4` → 200; `/` → 200.
**Step 7: Commit** — `feat(routing): 404 unrecognized and out-of-range routes instead of soft-200`

## Task 17: One source of truth for route defaults (P0.6)

**Files:**
- Create: `src/routing/defaults.js`
- Modify: `lib/server/routeFromParams.ts`, `src/App.js:439-457`, `lib/server/__tests__/buildMetadata.test.ts` + `routeFromParams.test.ts`

**Step 1:** Create the shared module (plain JS so both sides import it):

```js
// src/routing/defaults.js — THE single source for route/session defaults.
// The client has always rendered KJV for a bare URL (top_versions[0]);
// the server previously said IINST (audit P0.6). KJV wins.
export const DEFAULT_STRUCTURE = "whole"
export const DEFAULT_OUTLINE = "chapters"
export const DEFAULT_VERSION = "KJV"
export const DEFAULT_VERSE_ID = 17656 // Isaiah 1:1
export const DEFAULT_TOP_VERSIONS = ["KJV", "IINST", "NRSV", "NIV", "NASB"]
export const DEFAULT_TOP_OUTLINES = ["chapters", "mev", "nrsv", "niv", "nasb"]
export const DEFAULT_TOP_STRUCTURES = ["whole", "bibleproject", "7part", "authorship", "wikipedia"]
```

**Step 2:** `routeFromParams.ts`: delete its local `DEFAULT_*` consts, import from `../../src/routing/defaults`. Update the test that expected `IINST` → `KJV`. Run `npx jest lib/server` — buildMetadata tests will show the new default title; update expectations.
**Step 3:** `src/App.js` `initApp` (439–457): replace the three hardcoded arrays with the `DEFAULT_TOP_*` imports; replace magic `17656` at App.js:224 and :307 with `DEFAULT_VERSE_ID`.
**Step 4:** `npx jest` green; dev-verify: view-source of `http://localhost:3001/` shows `KJV` in the meta description/OG URL AND the rendered page shows KJV — server and client finally agree.
**Step 5: Commit** — `fix(ssot): shared route defaults module; server KJV default matches client`

## Task 18: Single metadata implementation — kill Helmet & getSeoData (P0.6, audit prod #8)

**Files:**
- Create: `src/routing/seo.js`
- Modify: `src/App.js` (remove Helmet import/usage 175–179, remove `getSeoData` 318–364, simplify `setUrl` title block 391–412), `lib/server/buildMetadata.ts`, `package.json` (drop react-helmet)
- Test: `src/routing/seo.test.js`

**Step 1: Failing test:**

```js
// src/routing/seo.test.js
import { buildTitle } from './seo'

describe('buildTitle', () => {
  const base = { chapter: 1, verse: 1, version: 'KJV' }
  it('verse page', () => expect(buildTitle(base)).toBe('Isaiah 1:1 · KJV | Isaiah Explorer'))
  it('tag page', () => expect(buildTitle({ ...base, tagName: 'Messiah' })).toBe('Messiah | Isaiah 1:1 · KJV | Isaiah Explorer'))
  it('search page', () => expect(buildTitle({ ...base, searchQuery: 'zion' })).toBe('“zion” | Isaiah Explorer'))
  it('hebrew beats search (matches server precedence)', () =>
    expect(buildTitle({ ...base, searchQuery: 'zion', hebrewStrongIndex: 430 })).toBe('Hebrew H430 | Isaiah Explorer'))
  it('commentary page', () =>
    expect(buildTitle({ ...base, commentarySourceName: 'Barnes' })).toBe('Isaiah 1:1 · Barnes | Isaiah Explorer'))
})
```

**Step 2: FAIL**, then implement `src/routing/seo.js` with exactly the **server's** current precedence (hebrew > search — read `lib/server/buildMetadata.ts:66-71` and transcribe; the server is authoritative). Export `buildTitle(opts)` and `buildDescription(opts)`.
**Step 3:** Refactor `buildMetadata.ts` to call `buildTitle`/`buildDescription` (import from `../../src/routing/seo`). Its existing tests must still pass unchanged — if a string differs, fix `seo.js`, not the tests.
**Step 4:** In `src/App.js`: delete `getSeoData` and the `<Helmet>` block + import; in `setUrl` replace lines 391–412 with:

```js
document.title = buildTitle({
  chapter: chapter, verse: verse, version: this.state.version,
  tagName: getFocalTag(this.state).tag || undefined,
  searchQuery: this.state.searchQuery || undefined,
  hebrewStrongIndex: this.state.hebrewStrongIndex || undefined,
  commentarySourceName: (this.state.commentaryMode && this.state.commentarySource && globalData.commentary.comSources[this.state.commentarySource]) ? globalData.commentary.comSources[this.state.commentarySource].name : undefined,
})
```
**Step 5:** `npm rm react-helmet`. `grep -rn "Helmet" src/` → 0.
**Step 6:** `npx jest` green. Dev-verify: view-source title === rendered `document.title` after hydration (no rewrite); exactly ONE `<link rel="canonical">` in the DOM (Elements panel).
**Step 7: Commit** — `refactor(seo): one isomorphic title/description builder; remove react-helmet`

## Task 19: robots.ts + generated sitemap (P0.4)

**Files:**
- Create: `app/robots.ts`, `app/sitemap.ts`
- Delete: `public/sitemap.xml`
- Test: `lib/server/__tests__/sitemap.test.ts` (extract the URL-list builder into `lib/server/sitemapEntries.ts` so it's testable)

**Step 1:**

```ts
// app/robots.ts
import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: 'https://isaiah.scripture.guide/sitemap.xml',
  };
}
```

**Step 2: Failing test** for `sitemapEntries(data)`: returns one entry per chapter (66) + one per verse (1,292) using `buildRoute` canonical forms (`/whole/chapters/kjv/5/4`), all URLs absolute on `https://isaiah.scripture.guide`, no legacy short forms. Implement `lib/server/sitemapEntries.ts` iterating `data.index` (verse_id → {chapter, verse}), calling the shared defaults from Task 17.

**Step 3:**

```ts
// app/sitemap.ts
import type { MetadataRoute } from 'next';
import { loadGlobalData } from '../lib/server/dataCache';
import { sitemapEntries } from '../lib/server/sitemapEntries';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await loadGlobalData();
  return sitemapEntries(data);
}
```

**Step 4:** `git rm public/sitemap.xml`. Verify: `curl -s http://localhost:3001/robots.txt` → text/plain rules (no HTML!); `curl -s http://localhost:3001/sitemap.xml | head` → XML with canonical URL forms.
**Step 5: Commit** — `feat(seo): app-router robots.txt and generated sitemap with canonical URLs`

## Task 20: Permanent redirects + JSON-LD (P0.4, audit prod #14/#17)

**Files:** Modify: `middleware.ts:24,31`, `app/[[...slug]]/page.tsx`, `__tests__/middleware.test.ts`

**Step 1:** middleware tests: update expected status 307→308; run — FAIL; change both `NextResponse.redirect(url, 307)` → `308`; run — PASS.
**Step 2:** JSON-LD in `Page` (page.tsx) — build from the same route data:

```tsx
const jsonLd = {
  '@context': 'https://schema.org', '@type': 'Article',
  headline: `Isaiah ${route.chapter}:${route.verse}`,
  isPartOf: { '@type': 'Book', name: 'Book of Isaiah' },
  inLanguage: 'en',
};
return (<>
  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
  <AppClient />
</>);
```
(`Page` must accept `{ params }` and compute `route = routeFromParams(params.slug)` — it already imports it for Task 16.)
**Step 3:** `npx jest` green; view-source shows the ld+json script.
**Step 4: Commit** — `feat(seo): 308 permanent legacy redirects; Article JSON-LD per verse page`

## Task 21: Rewrite AGENTS.md to match reality (P1.22)

**Files:** Modify: `AGENTS.md`

**Step 1:** Rewrite it. Must state: Next.js 14+ App Router (`app/`, `lib/server/`, `middleware.ts`) with SSR metadata + client-only legacy SPA (`src/`, class components, `app` prop pattern — still true); routing via `src/routing/routeCodec.js` + `withRouter` shim (History API, popstate); data formats section (unchanged — still accurate); jest + playwright test commands (`npx jest`, `npm run test:e2e`); dev on **port 3001**; deploy via Amplify WEB_COMPUTE (`amplify.yml`). DELETE: Electron sections, CRA build commands, "React 16 only", "No React Router" constraint, "No test suite exists", PHP references. Keep the keyboard-shortcut table and four-column description. Cross-link `docs/audits/2026-07-06-production-readiness-audit.md` and this plan.
**Step 2:** Proofread against the repo (`ls app lib src`, `cat package.json` scripts) — every claim in the new file must be verifiable.
**Step 3: Commit** — `docs: rewrite AGENTS.md to describe the Next.js architecture (was CRA/Electron-era)`

---

# PHASE 3 — RESPONSIVE LAYOUT

*Approach: three stages — (A) make the desktop layout fluid with CSS grid, (B) add a ≤1023px single-column mode with a bottom tab bar, (C) touch/legibility. The four columns are `.col1` (Structure), `.col2b` (Section), `.col3` (Verse/reading), `.col2` (Passage/side panel) inside `.wrapper` (App.css:121-131, 295-312). Playwright guards each stage.*

## Task 22: Playwright responsive harness (write the failing tests first)

**Files:** Create: `tests-e2e/responsive.spec.ts`

**Step 1:**

```ts
import { test, expect } from '@playwright/test';
const BASE = process.env.BASE_URL ?? 'http://localhost:3001';

for (const vp of [{ w: 390, h: 844, name: 'iphone' }, { w: 820, h: 1180, name: 'ipad' }, { w: 1280, h: 800, name: 'laptop' }, { w: 1920, h: 1080, name: 'desktop' }]) {
  test(`no horizontal document scroll at ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.goto(`${BASE}/whole/chapters/kjv/1/1`);
    await page.waitForSelector('#approot');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test('mobile shows the reading pane and a tab bar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/whole/chapters/kjv/1/1`);
  await expect(page.locator('.mobile-tabbar')).toBeVisible();
  await expect(page.locator('.col3')).toBeVisible();
  await expect(page.locator('.col1')).toBeHidden();
});
```

**Step 2:** `npx playwright test tests-e2e/responsive.spec.ts` (dev server running) — expect ALL FAIL (1820px min-width). These stay red until Tasks 23–24. Commit the spec.
**Step 3: Commit** — `test(e2e): responsive viewport guards (red until grid layout lands)`

## Task 23: Fluid desktop — grid columns, kill min-width:1820px (P0.1 stage A)

**Files:** Modify: `src/App.css:113-131, 295-312` (+ any rule referencing the fixed column offsets — `grep -n "820px\|1820px\|570px\|491px\|560px\|310px" src/App.css` first and account for every hit)

**Step 1:** Replace the root sizing:

```css
#approot { width: 100%; }                       /* was: min-width: 1820px */
.wrapper { position: absolute; top: 40px; bottom: 0; left: 0; right: 0;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(260px, 24%) minmax(200px, 16%) minmax(320px, 1fr) minmax(300px, 29%);
  grid-template-areas: "structure section verse passage"; }
.col1  { grid-area: structure; overflow-y: auto; float: none; width: auto; }
.col2b { grid-area: section;   overflow-y: auto; float: none; width: auto; }
.col3  { grid-area: verse;     overflow-y: auto; margin: 0; min-width: 0; }
.col2  { grid-area: passage;   overflow-y: auto; float: none; width: auto; }
```
Delete the superseded float/width/margin declarations at 295–312. Chase every other selector that hard-codes those offsets (the `grep` from Files above) and convert to `%`/`fr`/`minmax` or delete.

**Step 2:** At 1280×800 and 1920×1080 in Playwright: the two `no horizontal document scroll` desktop tests pass; visually spot-check all four columns render and independently scroll (`npx playwright test tests-e2e/responsive.spec.ts --grep "laptop|desktop"`).
**Step 3:** Run the full existing e2e suite (`npx playwright test tests-e2e/local-render-check.spec.ts`) — no regressions at default viewport.
**Step 4: Commit** — `feat(layout): fluid CSS grid columns replace fixed 1820px float layout`

## Task 24: Mobile single-column mode with tab bar (P0.1 stage B)

**Files:**
- Create: `src/Components/MobileTabBar.js`
- Modify: `src/App.js` (state + render), `src/App.css` (append media queries), `app/layout.tsx` (viewport export)

**Step 1:** `app/layout.tsx` — add:

```ts
import type { Viewport } from 'next';
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };
```

**Step 2:** Add `mobilePane: "read",` to App state (values: `"structure" | "section" | "verses" | "read"`). Create the component (class component, house style):

```js
// src/Components/MobileTabBar.js
import React from "react"

const PANES = [
  { key: "structure", label: "Structure" },
  { key: "section", label: "Outline" },
  { key: "verses", label: "Verses" },
  { key: "read", label: "Read" },
]

class MobileTabBar extends React.Component {
  render() {
    const app = this.props.app
    return (
      <nav className="mobile-tabbar" aria-label="Panels">
        {PANES.map(p => (
          <button key={p.key} type="button"
            className={app.state.mobilePane === p.key ? "active" : ""}
            aria-pressed={app.state.mobilePane === p.key}
            onClick={() => app.setState({ mobilePane: p.key })}>
            {p.label}
          </button>
        ))}
      </nav>
    )
  }
}
export default MobileTabBar
```

**Step 3:** In App `render()`: add `<MobileTabBar app={this} />` after the wrapper, and `data-mobile-pane={this.state.mobilePane}` on `#approot`. CSS:

```css
.mobile-tabbar { display: none; }
@media (max-width: 1023px) {
  html, body, .wrapper { height: 100dvh; }
  .wrapper { display: block; top: 40px; bottom: 56px; }
  .col1, .col2b, .col3, .col2 { display: none; width: 100%; height: 100%; }
  #approot[data-mobile-pane="structure"] .col1,
  #approot[data-mobile-pane="section"] .col2b,
  #approot[data-mobile-pane="verses"] .col3,
  #approot[data-mobile-pane="read"] .col2 { display: block; }
  .mobile-tabbar { display: flex; position: fixed; bottom: 0; left: 0; right: 0;
    height: 56px; z-index: 500; background: #1a1a1a; }
  .mobile-tabbar button { flex: 1; min-height: 44px; font-size: 14px; color: #fff;
    background: none; border: none; }
  .mobile-tabbar button.active { background: #333; font-weight: bold; }
}
@media (min-width: 1024px) and (max-width: 1500px) {
  /* two-column: hide Structure+Section into the verse column flow */
  .wrapper { grid-template-columns: minmax(320px, 1fr) minmax(300px, 36%);
    grid-template-areas: "verse passage"; }
  .col1, .col2b { display: none; }
}
```
**Design note:** in the 1024–1500px band Structure/Section are hidden; verify the app remains navigable there via the verse column's own chapter headings — if not, add the tab bar to that band too (`max-width: 1500px`) rather than inventing a new pattern.

**Step 4:** UX wiring: when the user taps a verse in the `verses` pane on mobile, switch to `read` — in `setActiveVerse` (find via `grep -n "setActiveVerse(" src/App.js`), add at the end: `if (window.matchMedia("(max-width: 1023px)").matches && source !== "init") this.setState({ mobilePane: "read" })`.
**Step 5:** `npx playwright test tests-e2e/responsive.spec.ts` — **all green now**, including iphone/ipad and the tab-bar test.
**Step 6: Commit** — `feat(layout): mobile single-column mode with bottom tab bar; dvh viewport`

## Task 25: Touch targets, hover fallbacks, legibility floor (P0.1 stage C, P2.8, P2.9)

**Files:** Modify: `src/App.css`, `src/Components/Verse.js`, `src/Components/Commentary.js`, `src/Components/VerseBox.js`

**Step 1: Touch sizing.** Append:

```css
@media (pointer: coarse) {
  .vernum, .taglink, .seqcircle, .audio-gear, .mobile-tabbar button,
  #tag_next, #tag_prev, #com_prev, #com_next {
    min-height: 44px; min-width: 44px; display: inline-flex;
    align-items: center; justify-content: center;
  }
}
```
Spot-check each selector in DevTools device mode; adjust per-element padding where the blanket rule breaks alignment.

**Step 2: Hover-only interactions get tap equivalents.** In `Verse.js:88-102` (version swap via `onMouseEnter`/`onMouseLeave`), `Commentary.js:158` (menu on `onMouseEnter`), `VerseBox.js:32`: add `onClick` handlers performing the same action the hover performs (first tap = the hover behavior; existing click behavior preserved by checking whether the hover state is already active). Pattern:

```js
onClick={(e) => { if (!this.state.spotted) { app.spotVerse(e); this.setState({spotted: true}); } else { /* original click action */ } }}
```
Apply per component; the exact original click action differs — read each handler before wiring.

**Step 3: Legibility floor.** `grep -n "font-size: *[0-9]px\|font-size: *1[0-2]px" src/App.css` (~22 hits: 7px @754, 8px @3914, 9px @3967, 10px ×7, 11px ×2, 12px ×12). Raise every hit to ≥13px unless it's decorative (superscripts). Contrast: change `#999` → `#767676` (App.css:656, 664), `div#outline h4` `#999`-on-`#DDD` → `#555` (693–699), `#seefax` `#AAA`-on-`#EEE` → `#666` (3911–3921), audit remaining `#CCC`/`#888`/`#DDD` text colors (752, 865, 643).
**Step 4:** Playwright suite green; manual pass in device mode at 390px: every control tappable, text readable.
**Step 5: Commit** — `feat(a11y): 44px touch targets, tap fallbacks for hover actions, 13px text floor, AA contrast`

## Task 26: Loading skeleton + CLS fixes (P1.16, P1.17)

**Files:** Modify: `app/[[...slug]]/AppClient.tsx`, `src/App.js:1511-1535`, `src/Components/Verse.js:86-92,189`

**Step 1:** AppClient skeleton:

```tsx
const AppWithRouter = dynamic(() => /* unchanged */, {
  ssr: false,
  loading: () => (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#888', fontFamily: 'Roboto Condensed, sans-serif' }}>
      Loading Isaiah Explorer…
    </div>
  ),
});
```
**Step 2:** `loadTopVersions` (App.js:1511): replace `setTimeout(fn, 3000)` with `("requestIdleCallback" in window ? requestIdleCallback : (f) => setTimeout(f, 200))(fn)` — side-by-side translations start loading as soon as the main thread is free instead of a hard 3s pop-in.
**Step 3:** Version images in `Verse.js:86-92, 189`: add explicit `width`/`height` attributes matching their rendered CSS size (measure in DevTools) so they reserve space (CLS).
**Step 4:** Verify: throttled reload (DevTools → Slow 4G) shows the skeleton then the app; side-by-side cells populate promptly; Lighthouse CLS on `/whole/chapters/kjv/1/1` < 0.1.
**Step 5: Commit** — `feat(perf): dynamic-import skeleton, idle-time version prefetch, image dimensions`

---

# PHASE 4 — PLATFORM

## Task 27: ESLint + CI-enforced quality gates (P1.2)

**Files:**
- Create: `.eslintrc.json`, `.github/workflows/ci.yml`
- Modify: `amplify.yml`, `package.json`

**Step 1:** `npm i -D eslint@^8 eslint-config-next@14` and:

```json
// .eslintrc.json
{ "extends": "next/core-web-vitals",
  "rules": { "no-debugger": "error", "radix": "error", "no-console": ["warn", { "allow": ["warn", "error"] }] },
  "ignorePatterns": ["build/", "build-output/", ".next/", "node_modules/"] }
```
**Step 2:** `npm run lint` — fix errors it surfaces (expect `radix` hits from `parseInt(x, 0)`; fix each to `Number(...)` or radix 10 — ~80 sites, mechanical; `parseInt(x, 0)` behaves as radix 10 for plain decimals so behavior is unchanged). `npx jest` after the sweep.
**Step 3:**

```yaml
# .github/workflows/ci.yml
name: CI
on: { push: { branches: [master] }, pull_request: {} }
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npx jest --ci
      - run: npm run build
```
**Step 4:** `amplify.yml` preBuild — after `npm ci` add: `- npx tsc --noEmit` and `- npx jest --ci` (deploys fail on red tests).
**Step 5:** Push to a branch, confirm the workflow runs green on GitHub (`gh run watch`).
**Step 6: Commit** — `ci: GitHub Actions + Amplify test gates; ESLint with no-debugger/radix`

## Task 28: Replace react-sortable-hoc with @dnd-kit; drop --legacy-peer-deps (P1.20)

**Files:** Modify: `src/Components/Settings/SortableList.js`, `Settings/Settings/Version.js`, `VersionSettings.js`, `StructureSettings.js`, `OutlineSettings.js`, `amplify.yml`, `package.json`

**Step 1:** `grep -rn "react-sortable-hoc" src/` — inventory. Three files import only `arrayMove`: replace with a local helper in `src/Components/Settings/arrayMove.js`:

```js
export function arrayMove(arr, from, to) {
  const copy = arr.slice()
  copy.splice(to, 0, copy.splice(from, 1)[0])
  return copy
}
```
**Step 2:** `npm i @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`. Rewrite `SortableList.js` on `DndContext` + `SortableContext` + `useSortable` (this one file may be a function component — it's a leaf wrapper, the class convention applies to app components; note the exception in a comment). Preserve the existing callback contract with its parents (`onSortEnd({oldIndex, newIndex})` — check callers first).
**Step 3:** **Keyboard support** (fixes half of P2.7): `@dnd-kit` ships `KeyboardSensor` — enable it plus add explicit ↑/↓ buttons per row:

```js
<button type="button" aria-label={"Move " + item.title + " up"} onClick={() => this.props.onSortEnd({oldIndex: i, newIndex: i - 1})}>▲</button>
```
**Step 4:** `npm rm react-sortable-hoc`; `amplify.yml`: `npm ci --legacy-peer-deps` → `npm ci`; delete `node_modules` + `npm ci` locally — MUST succeed with no peer errors.
**Step 5:** `npx playwright test tests-e2e/settings.spec.ts` green; manual: open Settings, drag AND keyboard-reorder a version list, top-5 persists after reload (localStorage).
**Step 6: Commit** — `refactor(settings): @dnd-kit sortable with keyboard support; drop --legacy-peer-deps`

## Task 29: Replace react-tipsy and react-player (P1.20)

**Files:** Modify: `src/App.js`, `src/Components/Verse.js`, `src/Components/Hebrew.js` (tipsy); `src/Components/Audio.js` (player); `package.json`

**Step 1:** `grep -rn "react-tipsy\|Tipsy" src/` — inventory usages (App.js:182 Settings tooltip, Verse.js:202/271, Hebrew.js). Replace each `<Tipsy content="X" placement="Y"><el/></Tipsy>` with the element itself plus `title="X"` and `aria-label="X"` (native tooltips; the styled-tooltip nicety is not worth a dependency). `npm rm react-tipsy`.
**Step 2:** `src/Components/Audio.js`: replace `ReactPlayer` with a native `<audio ref={...}>` element. Map the props in use (`grep -n "ReactPlayer\|playing\|onEnded\|onProgress\|playbackRate" src/Components/Audio.js`): `playing` → `ref.current.play()/pause()` in `componentDidUpdate`; `onEnded` → `onEnded`; `onProgress` → `onTimeUpdate`; `playbackRate` → `ref.current.playbackRate = x`. Keep the existing `audioState` enum flow intact (`src/state/audioState.js` tests already cover it).
**Step 3:** `npm rm react-player`. `npx jest` green (audioState suite especially). Manual: play a chapter, pause, speed change, auto-advance to next verse, commentary audio — all work.
**Step 4: Commit** — `refactor(deps): native audio element and title-attr tooltips; drop react-player, react-tipsy`

## Task 30: Next.js 15/16 upgrade (P0.5 remainder)

**Files:** Modify: `package.json`, `app/[[...slug]]/page.tsx`, `middleware.ts` (if API changed), any file the codemod touches

**Step 1:** `git checkout -b next-upgrade` (isolate; this is the riskiest task). `npx @next/codemod@latest upgrade latest` — accept the codemods (async `headers()`/`params` are the big ones: `page.tsx` becomes `const h = await headers()`, `params` becomes `Promise<{slug?: string[]}>` and must be awaited).
**Step 2:** `npx tsc --noEmit` → fix type fallout. `npx jest` → fix test fallout (buildMetadata/routeFromParams signatures unchanged; only the page glue changes).
**Step 3:** `npm audit` → the Next advisories are gone. `npm run build && npm run start` → smoke-test /, a verse page, /robots.txt, /sitemap.xml, a 404, the OG route (`curl -sI 'http://localhost:3001/og?v=KJV&c=1&x=1'`).
**Step 4:** `npx playwright test` — full suite green against the production build.
**Step 5:** Merge to master. **Deploy note:** Amplify WEB_COMPUTE supports Next 15; confirm the Amplify build image runs Node 20 (amplify.yml already does `nvm install 20`). Per project memory: manage Amplify via `aws amplify` CLI, not console instructions.
**Step 6: Commit** — `chore(next): upgrade Next.js 14→latest; async headers/params`

## Task 31: Caching strategy for HTML + data corpus (P1.3)

**Files:** Modify: `amplify.yml`, `app/[[...slug]]/page.tsx`, `lib/server/*` (origin derivation)

**Step 1:** Data corpus headers in `amplify.yml` (immutable-by-deploy; a rebuild changes content → bust with a `?v=` param later if ever needed):

```yaml
- pattern: 'com/**/*'
  headers: [{ key: Cache-Control, value: 'public, max-age=86400, stale-while-revalidate=604800' }]
- pattern: 'text/**/*'
  headers: [{ key: Cache-Control, value: 'public, max-age=86400, stale-while-revalidate=604800' }]
- pattern: 'core/**/*'
  headers: [{ key: Cache-Control, value: 'public, max-age=3600, stale-while-revalidate=86400' }]
```
**Step 2:** HTML: `generateMetadata`'s `headers()` call forces full-dynamic. The Host header is needed only for subsites + origin. Derive the default origin from `process.env.SITE_ORIGIN ?? 'https://isaiah.scripture.guide'` and read Host only when present... **Decision:** subsites (`*.isaiah.*` hosts) make per-host rendering genuinely necessary, so keep dynamic rendering BUT let the CDN cache: add to `amplify.yml`:

```yaml
- pattern: '/*'
  headers: [{ key: Cache-Control, value: 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' }]
```
(Amplify's CDN honors `s-maxage` and Vary; verify post-deploy with `curl -sI https://isaiah.scripture.guide/ | grep -i cache` twice — second response should be a hit.)
**Step 3:** Set `SITE_ORIGIN` in Amplify env vars via CLI: `aws amplify update-app --app-id <id> --environment-variables SITE_ORIGIN=https://isaiah.scripture.guide` (find app id: `aws amplify list-apps`).
**Step 4: Commit** — `perf(cache): CDN caching for HTML (s-maxage) and long-lived data corpus headers`

## Task 32: Repo slimming (P1.18, P1.21, P0.5 PHP)

**Files:** Delete: `public/index.php`, `public/server.php`, `public/image.php`, `public/.htaccess`, `.rescriptsrc.js`, `.webpack.config.js`, `src/react-app-env.d.ts`, `build/` (local), `test-results/` (local), orphan images
**Modify:** `.gitignore`, `package.json` (browserslist)

**Step 1:** `git rm public/index.php public/server.php public/image.php public/.htaccess .rescriptsrc.js .webpack.config.js` (check `.htaccess` exists first: `git ls-files public/.htaccess`).
**Step 2:** `rm -rf build/ test-results/ tsconfig.tsbuildinfo src/react-app-env.d.ts && rm -f .DS_Store public/.DS_Store` — all gitignored local cruft. Remove the react-app-env entry from `.gitignore`.
**Step 3:** Orphan images (verify each has 0 refs before deleting — `grep -rn "pause.png\|gear.png\|sprocket.png\|loading.svg\|equalizer.gif\|tipsy.gif\|gears.gif" src/ app/`): `git rm` the confirmed-orphaned ones from `src/img/interface/`.
**Step 4:** Delete the `browserslist` block from package.json.
**Step 5:** `npm run build` green; app renders in dev.
**Step 6: Commit** — `chore: remove PHP-era files, CRA/Electron configs, orphan images`

**Optional follow-up (requires user sign-off — rewrites git history):** `git filter-repo` to purge historic `public/com` churn (~597 MiB pack → tens of MB). Present the option; do NOT run it unprompted. Keeping `public/com/` tracked going forward is fine — it changes only on data rebuilds.

## Task 33: Health endpoint + error tracking (P1.1)

**Files:** Create: `app/api/health/route.ts`; Modify: `app/layout.tsx` or instrumentation

**Step 1:**

```ts
// app/api/health/route.ts
import { loadGlobalData } from '../../../lib/server/dataCache';
export async function GET() {
  try {
    const data = await loadGlobalData();
    const ok = Boolean(data?.index && Object.keys(data.index).length > 0);
    return Response.json({ ok }, { status: ok ? 200 : 503 });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
```
**Step 2:** `curl -s http://localhost:3001/api/health` → `{"ok":true}`.
**Step 3: Error tracking decision point:** Sentry adds a dependency + DSN secret the user must provision. ASK THE USER whether to add Sentry (needs a DSN) or defer. If yes: `npx @sentry/wizard@latest -i nextjs`, commit its output, add the DSN to Amplify env via `aws amplify update-app`. If deferred, note it in the audit doc as accepted risk.
**Step 4: Commit** — `feat(ops): health endpoint backed by data-cache readiness`

---

# PHASE 5 — ARCHITECTURE (incremental, each task independently shippable)

## Task 34: Bounded actions API — stop handing components the App instance (P2.1 step 1)

**Files:**
- Create: `src/state/actions.js`
- Modify: `src/App.js` render (137–138, 174) and `src/DataContext.js`
- Test: `src/state/actions.test.js`

**Step 1: Failing test:**

```js
import { buildActions } from './actions'

it('exposes only the whitelisted action surface', () => {
  const fakeApp = { setActiveVerse: jest.fn(), setActiveTag: jest.fn(), setState: jest.fn(), loadVersion: jest.fn(), search: jest.fn(), setTagPanel: jest.fn(), setAudioMode: jest.fn(), closeSettings: jest.fn(), saveSettings: jest.fn() }
  const actions = buildActions(fakeApp)
  actions.setActiveVerse(17656)
  expect(fakeApp.setActiveVerse).toHaveBeenCalledWith(17656)
  expect(actions.setState).toBeUndefined()   // raw setState is NOT exposed
  expect(Object.isFrozen(actions)).toBe(true)
})
```

**Step 2: Implement** `buildActions(app)` — a frozen object binding the ~10 legitimate operations components perform (derive the real list: `grep -rhoE "app\.[a-zA-Z_]+\(" src/Components/ | sort | uniq -c | sort -rn` — every method with >0 hits gets an action; `app.setState` hits get case-by-case named actions like `openSettings`, `setMobilePane`).

**Step 3: Provider snapshot.** In App `render()` replace lines 137–138 + provider value:

```js
const snapshot = { data: globalData, state: this.state, actions: this.actions }
// this.actions = buildActions(this) created ONCE in the constructor
return <DataContext.Provider value={snapshot}> ...
```
Delete `globalData.app = this; globalData.state = this.state`. **Then fix the fallout:** `grep -rn "globalData.app\|context.app\|\.app\.state\|props.app" src/Components/ | wc -l` — migrate component-by-component (one commit each if >200 lines): read state from `context.state`, call `context.actions.*`. Components receiving `app={this}` as a prop keep working during the migration (App still passes it); remove the prop last.

**Step 4:** `npx jest` + full Playwright suite green after EACH component migration — this is the highest-regression-risk task in the plan; small commits.
**Step 5: Final commit** — `refactor(state): frozen actions API + provider snapshot; components no longer hold the App instance`

## Task 35: Extract data loading into `loadIsaiahData` (P2.1/P2.2 step 2, P2.5 load_queue)

**Files:**
- Create: `src/data/loadIsaiahData.js`
- Modify: `src/App.js` (`loadCore` 1219–1509, `load_queue`/`pull` 103–110, `checkLoaded` 486–513)
- Test: `src/data/loadIsaiahData.test.js`

**Step 1: Failing test** — `loadIsaiahData({ rootURL, version, wantHebrew })` returns a Promise resolving `{ core, verses, hebrew? }` using `Promise.all` over `fetchData` calls (mock `fetchData`); rejects if core or verses reject; hebrew rejection only rejects when `wantHebrew`.
**Step 2: Implement** — move the fetch orchestration OUT of App.js; keep the data *normalization* (verseDatatoArray, index building, subsite blacklist — App.js:1249–1468) in a second pure function `normalizeCoreData(core, subsite)` in the same module (move code verbatim, then de-`this` it). Unit-test `normalizeCoreData` with a tiny fixture: blacklist removes a commentary source; structures get verse arrays.
**Step 3:** App.js `loadCore` becomes ~15 lines: call `loadIsaiahData`, assign into `globalData`, `setState({ready: true, ...this.getSettingsFromUrl({})})`, `.catch(this.handleLoadError("core"))`. Delete `load_queue`, `pull`, `checkLoaded` (fold checkLoaded's callback-selection logic into the `.then`).
**Step 4:** **Remove the load-time shuffle** (P1.9): delete the `shuffle()` of `verseTagIndex` (App.js:1441–1444); components that want varied tag order shuffle a copy at render with a per-session seed (grep who reads `verseTagIndex` — likely `Tags.js`/`tagSelectors.js`; add the render-time shuffle there).
**Step 5:** `npx jest` + Playwright green; cold-load the app with DevTools Network on: same three requests, one ready-transition, deterministic tag order per URL.
**Step 6: Commit** — `refactor(data): Promise.all loader module; deterministic data (no load-time shuffle)`

## Task 36: Declarative keyboard map (P2.2 keyboard)

**Files:**
- Create: `src/state/keymap.js`
- Modify: `src/App.js:515-655`
- Test: `src/state/keymap.test.js`

**Step 1: Failing test** — `resolveKey(event, contextFlags)` maps `e.key` (+ modifiers + context like `searchMode`) to an action name: `{key:'ArrowLeft'} → 'prevVerse'`, `{key:' '} → 'toggleAudio'`, `{key:'PageDown'} → 'nextVersion'`, typing context returns `null`, etc. Transcribe EVERY branch of the current keyCode wall (App.js:515–655) into table entries first — the test enumerates the full table.
**Step 2: Implement** the table + resolver. App's `keyDown` becomes: `const action = resolveKey(e, {searchMode: this.state.searchMode, ...}); if (action) { e.preventDefault(); this.keyboardActions[action](); }` where `keyboardActions` maps names to the existing methods (`left`, `right`, `up`, `down`, `cycleTag`, …).
**Step 3:** Manual regression: every shortcut in AGENTS.md's keyboard table (arrows, PgUp/PgDn, Home/End, Ins/Del, Tab, Space, `~`, `+`/`-`) still works.
**Step 4: Commit** — `refactor(keyboard): declarative e.key keymap replaces 140-line keyCode wall`

## Task 37: Kill DOM-driven navigation (P2.3)

**Files:** Modify: `src/App.js` (`clickElementID` 657–661 and callers at 593, 618–619, 629, 637, 684–689, 697–717, 723, 760, 802, 825; `tagUp`/`tagDown` 779–799; `checkFloater` 2091–2143), `src/Components/Commentary.js`, `src/Components/Tags.js`, `src/Components/Structure.js`, `src/state/tagSelectors.js`

**Step 1:** For each `clickElementID` call, identify the state transition the clicked button performs (read the button's onClick in the owning component) and expose it as a method/action; the keyboard action calls it directly. Work one caller at a time, Playwright + manual check after each: commentary prev/next (`#com_prev`/`#com_next`), tag next/prev (`#tag_next`/`#tag_prev`), tag cycling (`.tag_highlighted+.taglink`), hebrew word walk (`previousElementSibling` chain → index math over the hebrew word array in state).
**Step 2:** `tagUp`/`tagDown` (779–799): derive the parent-tag order from `globalData.tags` via a selector in `src/state/tagSelectors.js` (unit-test: given tagIndex fixture, ordered list matches what the DOM would have shown) instead of `querySelectorAll(".parentTag").innerText`.
**Step 3:** `checkFloater` (2091–2143): replace geometry/classList sniffing with derived state — `floaterVisible` computed from `selected_tag` + `selected_tag_block_index` + the meta-drawer open flag, which `Structure.js:12` must lift into App state (`metaDrawerOpen`) instead of local `useState`. Also fixes the render-phase `saveFloater` side effect (P2.11): delete `saveFloater`/`this.floater`; `Tags.js:428` renders from the selector.
**Step 4:** `grep -n "clickElementID\|querySelectorAll\|getElementById" src/App.js` → only legitimate hits remain (scrolling helpers, if any — judge each). Full test suites green.
**Step 5: Commit** — `refactor(nav): keyboard and cycling act on state, not DOM clicks; floater is derived state`

## Task 38: getTagData → pure memoized selector (P1.8)

**Files:** Modify: `src/App.js:2532-2566`, `src/state/tagSelectors.js`; Test: `src/state/tagSelectors.test.js`

**Step 1: Failing test** — `getTagVerses(tags, tagName)`: returns the verse list; calling it twice returns the SAME array (memoized); does NOT mutate the input (`Object.isFrozen`-guarded fixture or deep-equal before/after).
**Step 2:** Implement in `tagSelectors.js` (a `Map` cache keyed by tagName; the recursion over `tagChildren` moves here). Delete the `delete g.verses` block in App.js `getTagData` and delegate to the selector.
**Step 3:** `npx jest` green; manual: open a parent tag with children — verse counts identical to before (spot-check 2–3 tags against production).
**Step 4: Commit** — `refactor(tags): pure memoized tag-verse selector; stop mutating the shared tag index`

## Task 39: Settings/init consolidation — `resolveInitialState` (P2.5)

**Files:**
- Create: `src/state/resolveInitialState.js`
- Modify: `src/App.js` (`initApp` 426–484, `getSettingsFromUrl` ~223–316, `validateSettings`)
- Test: `src/state/resolveInitialState.test.js`

**Step 1: Failing tests** — one pure function, one precedence order: `resolveInitialState({ urlPath, storedSettings, meta })` → complete initial state. Cases: empty storage + bare URL → defaults (KJV/whole/chapters, verse 17656); URL version overrides stored version; stored top-lists survive; invalid stored version falls back to top_versions[0]; URL search/hebrew set their modes; malformed JSON storage → defaults.
**Step 2:** Implement by MOVING the logic from `initApp`+`validateSettings` (not rewriting) — the tests pin current behavior except where audit P0.6 already changed defaults. `initApp` becomes: read localStorage → `resolveInitialState` → `setState(result, () => { this.saveSettings(); this.loadCore() })`. `loadCore`'s duplicate `parseRoute(window.location.pathname)` calls (1229) collapse — the resolved state already carries `wantHebrew`.
**Step 3:** Dedup the legacy/enum state fields (P2.5 remainder): `showcaseTag` (App.js:2192–2194) and any other writer that hand-sets `audioMode`/`audioState`/`commentaryAudioMode`/`tagMode`/`infoOpen` literals must go through `setAudioMode`/`setTagPanel` (`grep -n "audioState:" src/App.js` — every hit outside the setter is a bug; the bridge-invariants test suite from Task 14 guards this).
**Step 4:** `npx jest` green; manual: fresh-profile load, load with settings, load deep URL with tag/search/hebrew — all correct.
**Step 5: Commit** — `refactor(init): single pure resolveInitialState; enum state has one writer`

## Task 40: Search codec + subsite transform consolidation (P2.5)

**Files:**
- Create: `src/routing/searchCodec.js`, `lib/shared/subsiteFilter.js`
- Modify: `src/routing/routeCodec.js:174-187`, `src/App.js:396-400,950-951,1249-1330`, `src/Components/Search.js:68,178-181`, `lib/server/applySubsite.ts`
- Tests: `src/routing/searchCodec.test.js`, existing `applySubsite.test.ts`

**Step 1: searchCodec failing tests** — `encode(q)`, `decode(s)`, `display(q)`: round-trip property (`decode(encode(q)) === q` for queries with `/`, `\b`, `;`, `-`), plus fixtures matching current URL output (paste 3 real URLs from the running app first so behavior is pinned, e.g. encode `"zion \bcity"` and assert today's exact output).
**Step 2:** Implement; replace all five inline copies (routeCodec 174–187, App.js 396–400 + 950–951, Search.js 68 + 178–181). `npx jest` — routeCodec round-trip tests must stay green.
**Step 3: subsiteFilter** — extract the blacklist transform (App.js:1249–1330) into a pure `applyBlacklist(data, custom)` returning a NEW object (no mutation), in plain JS under `lib/shared/`; `applySubsite.ts` and the client loader (Task 35's `normalizeCoreData`) both call it. Port the existing `applySubsite.test.ts` cases + add: version blacklist removes from meta AND top_versions; outline blacklist removes outlines.
**Step 4:** Green suites; manual: main site unchanged; if a subsite exists (`spu.isaiah.*`), verify its filtering (or simulate: hardcode `subsite="spu"` temporarily in dev).
**Step 5: Commit** — `refactor(ssot): one search codec, one subsite filter shared client/server`

## Task 41: Accessibility — real buttons everywhere (P2.6)

**Files:** Modify: `src/Components/Commentary.js:269-272`, `Tags.js:118-120,559,725`, `Search.js:78`, `Settings/Settings.js:63`, `Passage.js:201`, `Section.js:51`, `Structure.js:54`, `Verse.js:203`, `Hebrew.js:114`, + full inventory; `src/App.css`

**Step 1:** Inventory: `grep -rnE "<(div|span|img|h[1-6])[^>]*onClick" src/Components/ src/App.js | wc -l` (expect ~26+). For EACH: convert to `<button type="button" className="linklike ...">` (keep existing classes) with `aria-label` where the content is an icon/glyph (e.g. Settings close `<img alt="img">` → `<button aria-label="Close settings"><img alt="" …/></button>`).
**Step 2:** CSS reset so visuals don't change:

```css
button.linklike { background: none; border: none; padding: 0; font: inherit;
  color: inherit; text-align: inherit; cursor: pointer; }
button.linklike:focus-visible { outline: 2px solid var(--ui-focus); outline-offset: 2px; }
```
**Step 3:** Fix the alt-text and label set while in each file (P2.10): `alt="img"` → real labels; `Verse.js:189` per-version images get the version name; `Search.js:73` input gets `aria-label="Search Isaiah"`; `Commentary.js:143` select gets `aria-label="Commentary source"`; Settings.js:65-69 `<div>` inside `<h2>` → move the div after the h2.
**Step 4:** Keyboard-only pass (unplug the mouse): Tab reaches chapter nav, version cycling, tag open/close, Settings close; Enter activates each. Playwright suites green.
**Step 5: Commit** — `feat(a11y): real buttons with labels for all interactive elements; visible focus`

## Task 42: Dialog semantics — Settings modal + audio popover (P2.7)

**Files:** Modify: `src/Components/Settings/Settings.js`, `src/App.js:141-150` (settings panel render), `src/Components/AudioMenuPopover.js`

**Step 1: Settings:** wrap in `role="dialog" aria-modal="true" aria-label="Settings"`; on open, focus the close button; trap Tab (on keydown, if Tab would leave the panel, wrap); Escape closes (add to the panel's onKeyDown — App.js:141-150's shader stays as click-outside). On close, return focus to the gear button that opened it (store `document.activeElement` on open).
**Step 2: AudioMenuPopover:** it already closes on Escape (:24-26). Remove `role="menu"` (children are plain buttons — a disclosure, not a menu), move focus to the first button on open, restore focus to the gear (`.audio-gear`) on close.
**Step 3:** `npx playwright test tests-e2e/settings.spec.ts` green + keyboard-only manual pass (open with Enter, Tab stays inside, Esc closes, focus returns).
**Step 4: Commit** — `feat(a11y): dialog semantics, focus trap, and Escape for Settings; popover focus management`

## Task 43: Controlled search input + spread layout to CSS (P2.4, P2.11)

**Files:** Modify: `src/Components/Search.js:33-43,73`, `src/App.js:1121-1177` (`spreadVerse`/`spreadHebrew`/`spreadOutline` + callers), `src/App.css`

**Step 1: Search:** delete the dep-less effect (Search.js:33–43); make the input controlled (`value` from a local state initialized from `props`/context `searchQuery`, `onChange` sets it); focus once via `autoFocus` or a mount-only effect (`useEffect(..., [])`).
**Step 2: spread\*:** find what the loops equalize (verse list heights / outline distribution). Replace with CSS on the containers: `display: flex; flex-direction: column; justify-content: space-between; height: 100%` and `line-height: clamp(1.2em, 2.2vh, 1.8em)` on rows. Delete `spreadVerse`/`spreadHebrew`/`spreadOutline` and their callers (`grep -n "spread" src/App.js`). Visually compare a chapter with few verses and one with many (Isa 12 vs Isa 5) against production — spacing intent preserved, no reflow loops (Performance panel: no long forced-reflow tasks on navigation).
**Step 3:** Also delete the module-scope `Element.prototype.matches` polyfill (App.js:2800–2813) and Audio.js's render-path `setTimeout` (Audio.js:197–205 — move the no-file fallback decision into `componentDidUpdate` with a cleanup in `componentWillUnmount`).
**Step 4:** Suites green; manual audio-fallback check (pick a verse with no commentary audio → falls back to gileadi without loops).
**Step 5: Commit** — `refactor: controlled search input, CSS-driven column spacing, no render-phase timers`

## Task 44: Final sweep — verification and audit closure

**Step 1:** Full gates: `npm run lint && npx tsc --noEmit && npx jest --ci && npm run build && npx playwright test` — ALL green.
**Step 2:** Lighthouse (mobile, `http://localhost:3001/whole/chapters/kjv/1/1` on the production build): Performance ≥ 80, Accessibility ≥ 95, SEO ≥ 95, CLS < 0.1. Record scores in the audit doc.
**Step 3:** Walk `docs/audits/2026-07-06-production-readiness-audit.md` top to bottom; annotate every finding `✅ fixed (Task N)` / `⏸ deferred (reason)`. Anything unintentionally unaddressed becomes a new task before this one completes.
**Step 4:** Manual smoke on a real phone (or DevTools device mode end-to-end): load, navigate 5 verses, switch translation, open a tag, play audio, open commentary, use Back button, go offline mid-session (error banner), restore.
**Step 5: Commit** — `docs: close out production-readiness audit with per-finding disposition`

---

## Task dependency notes

- Phase 1 tasks are independent of each other except Task 2 (needs Task 1) and Task 14 (run after 1–13 so new tests are included).
- Task 16 depends on nothing in Phase 1; Tasks 17–18 must precede 19–20 (shared defaults/seo modules).
- Phase 3 depends on Phase 1 Task 15 (CSS file churn overlaps); do not parallelize edits to App.css.
- Task 30 (Next upgrade) after Tasks 27–29 (CI green + peer-deps clean makes the upgrade diff reviewable).
- Phase 5 order matters: 34 → 35 → 36/37 → 38–43 (the actions layer unblocks everything).
- Playwright note: `tests-e2e/prod-*.spec.ts` target production — exclude them locally (`npx playwright test --grep-invert prod-`).
