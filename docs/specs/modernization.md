# Modernization Spec — Isaiah Explorer
**Status:** Draft  
**Priority:** High  
**Scope:** Incremental — the app must remain fully functional throughout. No feature changes.

---

## Goals

1. Fix the double-compression data pipeline (remove base64 layer + pako + atob npm package)
2. Upgrade all stale/EOL dependencies
3. Replace the `app={this}` prop-drilling pattern with React Context
4. Convert components to function components with hooks
5. Add lazy loading for non-critical components

Each phase is independent and can be merged separately. Later phases assume earlier ones are done.

---

## Phase 1 — Data Pipeline Fix (no React changes)

### Background
All data files (`core.txt`, `verses_*.txt`, `words_HEB.txt`, `tags_hl.txt`) are currently stored as `base64(gzip(JSON))` and decompressed client-side with `pako.ungzip` + the `atob` npm package. This was a reasonable 2017 workaround but today:
- HTTP already transfers gzip transparently via `Content-Encoding: gzip` — the base64 layer adds ~33% size overhead for zero benefit
- `atob` is a native browser function — the npm polyfill is unnecessary
- `pako` is ~45 KB in the bundle for a job the browser already does

### What to change

#### 1.1 — Regenerate data files as plain `.json` (or `.json.gz` for CDN)

The data generation pipeline (wherever it lives, outside this repo) should output plain JSON files:

```
public/core/core.json        # was core.txt
public/core/tags_hl.json     # was tags_hl.txt
public/text/verses_KJV.json  # was verses_KJV.txt
public/text/words_HEB.json   # was words_HEB.txt
# etc.
```

The server (`nginx` / Apache / static host) must serve these with:
```
Content-Type: application/json
Content-Encoding: gzip   # if pre-compressed .gz files are served
```

If the host doesn't support pre-compressed files, plain `.json` files work fine — the server will gzip them on the fly if `mod_deflate` / gzip middleware is enabled (it should be for any modern host).

#### 1.2 — Replace `unzipJSON` in `App.js`

**Current:**
```js
import pako from "pako"
import atob from "atob"

unzipJSON(base64) {
  function atos(arr) { ... }
  try {
    return JSON.parse(atos(pako.ungzip(atob(base64))))
  } catch (err) {
    return ["Unzip Failure", err]
  }
}
```

**Replace with:**
```js
// No imports needed — fetch().json() handles everything

async fetchJSON(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`)
  return response.json()
}
```

All call sites that do:
```js
fetch(url)
  .then(r => r.text())
  .then(data => this.unzipJSON(data))
```

Become:
```js
fetch(url)
  .then(r => r.json())
```

#### 1.3 — Update file references

In `App.js`, change all fetch URLs from `.txt` → `.json`:

| Old | New |
|---|---|
| `./core/core.txt` | `./core/core.json` |
| `./core/tags_hl.txt` | `./core/tags_hl.json` |
| `./text/verses_${shortcode}.txt` | `./text/verses_${shortcode}.json` |
| `./text/words_HEB.txt` | `./text/words_HEB.json` |

Also update `public/text/index.txt` → `index.json` if it uses the same format.

#### 1.4 — Remove npm packages

```bash
npm uninstall pako atob
```

Remove imports from `App.js`:
```js
// DELETE these lines:
import pako from "pako"
import atob from "atob"
```

#### 1.5 — Fix error return in data loading

The old `unzipJSON` returns `["Unzip Failure", err]` on failure — an array that silently corrupts `globalData`. Replace with proper error boundaries:

```js
async fetchJSON(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()  // browser throws on parse failure
}
```

Callers should add `.catch(err => console.error('Data load failed:', url, err))`.

#### Acceptance criteria
- [ ] App loads and all features work with `.json` files
- [ ] Network tab shows `Content-Type: application/json` responses (not `.txt`)
- [ ] `pako` and `atob` are no longer in `package.json` or imported anywhere
- [ ] `unzipJSON` method is deleted from `App.js`
- [ ] Bundle size decreases by ~45 KB (pako removal)

---

## Phase 2 — Dependency Upgrades

Do these in order — each is independently mergeable.

### 2.1 — Remove `--openssl-legacy-provider` flag

This flag in `package.json`'s `start` script is a symptom, not a fix. It will be resolved by the CRA → Vite migration in 2.3. Skip for now.

### 2.2 — React 16 → React 18

React 18 is backward compatible with class components. This should be a drop-in upgrade.

```bash
npm install react@18 react-dom@18
```

**One breaking change:** The `ReactDOM.render` API is deprecated in React 18.

In `src/index.js`, change:
```js
// OLD:
import ReactDOM from 'react-dom'
ReactDOM.render(<App />, document.getElementById('root'))

// NEW:
import { createRoot } from 'react-dom/client'
const root = createRoot(document.getElementById('root'))
root.render(<App />)
```

`componentWillMount` (used in `App.js`) is also deprecated — rename it to `UNSAFE_componentWillMount` to silence the warning, or move the IPC listener setup to `componentDidMount`.

#### Acceptance criteria
- [ ] App runs on React 18 without errors or warnings
- [ ] `ReactDOM.render` is replaced with `createRoot`
- [ ] `componentWillMount` is renamed or migrated

### 2.3 — CRA 3 → Vite

CRA is archived and unmaintained. Vite is the standard replacement. This is the largest upgrade but pays the most dividends (cold start: 30s → <1s).

```bash
npm install --save-dev vite @vitejs/plugin-react
npm uninstall react-scripts @rescripts/cli @rescripts/rescript-env
```

**Steps:**

1. Create `vite.config.js` at repo root:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'build',
  },
  server: {
    port: 3000,
  },
})
```

2. Move `public/index.html` to repo root `index.html`. Update the script tag:
```html
<!-- Add to index.html <body>: -->
<script type="module" src="/src/index.js"></script>
```

3. Update `package.json` scripts:
```json
"scripts": {
  "start": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "e-dev": "concurrently \"BROWSER=none vite\" \"wait-on http://localhost:3000 && electron .\"",
  "e-build": "vite build",
  "e-pack": "electron-builder -mw"
}
```

4. Replace `require()` image imports with Vite's `new URL()` pattern or direct imports:
```js
// OLD (CRA):
require("./img/interface/book.gif")

// NEW (Vite):
import bookGif from "./img/interface/book.gif"
// or dynamically:
new URL('./img/interface/book.gif', import.meta.url).href
```

5. Env vars: replace `process.env.REACT_APP_*` with `import.meta.env.VITE_*` if any exist.

#### Acceptance criteria
- [ ] `npm start` starts Vite dev server in <2s
- [ ] `npm run build` produces equivalent `build/` output
- [ ] All image imports work
- [ ] Electron `e-dev` and `e-build` still work

### 2.4 — Electron 6 → current (security-critical)

```bash
npm install --save-dev electron@latest electron-builder@latest
```

Electron 6 ships with Chromium 76 (2019) and has multiple disclosed CVEs. This is a security obligation for a distributed desktop app.

**Breaking changes to address:**

1. `contextIsolation` is now `true` by default in modern Electron. Update `BrowserWindow` in `electron.js`:
```js
mainWindow = new BrowserWindow({
  ...
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,   // already true by default, make explicit
    nodeIntegration: false,   // already false by default
  }
})
```

2. `preload.js` already uses `contextBridge` — verify it still exposes `ipcRenderer` correctly:
```js
// preload.js — confirm this pattern works
const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('ipcRenderer', {
  on: (channel, fn) => ipcRenderer.on(channel, fn),
  send: (channel, data) => ipcRenderer.send(channel, data),
})
```

3. `app.dock.setIcon` — verify this still works on macOS (it does in modern Electron).

4. Remove `devTools: true` from `webPreferences` — DevTools are always available in dev mode; enabling them in production is a minor security/UX issue.

#### Acceptance criteria
- [ ] Electron app launches and all features work
- [ ] `e-pack` produces a signable macOS `.app` and Windows installer
- [ ] No Chromium CVE warnings from `npm audit`

### 2.5 — Replace unmaintained UI libraries

| Library | Replacement | Notes |
|---|---|---|
| `react-tipsy` | `@floating-ui/react` or Radix UI `Tooltip` | Drop-in for tooltip behavior |
| `react-sortable-hoc` | `@dnd-kit/sortable` | Used only in Settings drag-to-reorder |
| `react-player` | `react-player@latest` (v2.x) | API is compatible |

Do these one at a time, testing the Settings panel and tooltips after each.

---

## Phase 3 — React Context (replace `app={this}` prop drilling)

### Background
Every component receives `app={this}` — the entire root `App` instance — and re-passes it as `app={this.props.app}` to children. There are 200+ occurrences of `this.props.app` across all component files. Components call `this.props.app.setState()` directly, which means any component can mutate any state field at any time.

### Design

Create `src/AppContext.js`:

```js
import React from 'react'
export const AppContext = React.createContext(null)
```

In `App.render()`, wrap the output in the provider:

```js
render() {
  return (
    <AppContext.Provider value={this}>
      <div id="approot" className={classes.join(" ")}>
        <h1>...</h1>
        <div className="wrapper">
          <StructureColumn />     {/* no more app={this} */}
          <SectionColumn />
          <VerseColumn />
          <PassageColumn />
        </div>
        ...
      </div>
    </AppContext.Provider>
  )
}
```

### Migration strategy: incremental, one component at a time

For **class components**, use `static contextType`:
```js
import { AppContext } from '../AppContext'

class StructureColumn extends Component {
  static contextType = AppContext
  
  render() {
    const app = this.context  // replaces this.props.app
    // everything else unchanged
  }
}
```

For **function components** (Phase 4), use `useContext`:
```js
import { useContext } from 'react'
import { AppContext } from '../AppContext'

function StructureColumn() {
  const app = useContext(AppContext)
  // ...
}
```

Bridge note:
- During Phase 3B only, using `this.context` (or `this.context.app` if a temporary adapter is used) is acceptable to remove prop drilling safely.
- That bridge pattern is transitional and must be removed in Phase 4.

### Migration order (lowest risk first)

1. `VideoBox.js` — smallest, no state mutations
2. `Search.js` — self-contained
3. `Audio.js` — straightforward
4. `Hebrew.js` — moderate complexity
5. `Structure.js` — moderate complexity
6. `Section.js` — moderate complexity
7. `Tags.js` — complex, do last among secondaries
8. `Verse.js` — complex, many sub-components
9. `Passage.js` — complex
10. `Settings/` — touch last; uses drag-and-drop

**Do not change `App.js` logic during this phase.** Only change how children access it.

### Removing the `app` prop

After each component is migrated to context, remove the `app={...}` prop from its call site. Verify the component still works. Merge each file separately.

#### Acceptance criteria
- [ ] `app` prop is removed from all component call sites in `App.render()`
- [ ] No component imports `this.props.app` or receives `app` as a prop
- [ ] All features work identically

---

## Phase 4 — Function Components & Hooks

Only start this phase after Phase 3 (Context) is complete. Convert components one at a time; class and function components coexist fine in React 18.

### Conversion pattern

**Class component:**
```js
class MyComponent extends Component {
  static contextType = AppContext
  
  state = { open: false }
  
  componentDidMount() { ... }
  componentDidUpdate(prevProps) { ... }
  
  render() {
    const app = this.context
    ...
  }
}
```

**Function component equivalent:**
```js
function MyComponent() {
  const app = useContext(AppContext)
  const [open, setOpen] = useState(false)
  
  useEffect(() => {
    // componentDidMount logic
    return () => { /* componentWillUnmount cleanup */ }
  }, [])
  
  useEffect(() => {
    // componentDidUpdate logic (specify dependencies)
  }, [app.state.active_verse_id])
  
  ...
}
```

### Conversion order (same as Phase 3 order)

`VideoBox` → `Search` → `Audio` → `Hebrew` → `Structure` → `Section` → `Tags` → `Verse` → `Passage` → `Settings/`

**Do not convert `App.js` itself.** It is the context provider and owns all state. Rewriting it as a function component with 50 `useState` calls is a large, high-risk change with no immediate user benefit. Leave it as a class component.

### Explicit cleanup target for this phase

- Remove all `this.context.app` usage from `src/Components/`.
- Components should access context with `useContext(AppContext)` and local `const app = ...` where needed.
- `static contextType` in components should be considered temporary scaffolding and removed as each file is converted.

### Key hook mappings

| Class pattern | Hook equivalent |
|---|---|
| `this.state = { x }` | `const [x, setX] = useState(...)` |
| `this.setState({ x })` | `setX(...)` |
| `componentDidMount` | `useEffect(() => {...}, [])` |
| `componentDidUpdate` | `useEffect(() => {...}, [dep])` |
| `componentWillUnmount` | return cleanup from `useEffect` |
| `React.createRef()` | `useRef()` |
| Computed value from props/state | `useMemo(() => ..., [deps])` |
| Stable callback for child | `useCallback(() => ..., [deps])` |

### Memoization opportunities

Once a component is a function component, add `React.memo()` to leaf components that receive stable props. Primary candidates:

- `VerseBox` — renders once per verse, should not re-render when sibling state changes
- `TagLink` — renders a list of tags per verse
- `HebrewWord` — renders a list per verse

```js
export default React.memo(VerseBox)
```

#### Acceptance criteria
- [ ] All components in `src/Components/` are function components
- [ ] No `Component` imports remain in component files
- [ ] No `this.context.app` remains in `src/Components/`
- [ ] `App.js` remains a class component (it is the provider)
- [ ] No regressions in keyboard navigation, tag mode, Hebrew mode, commentary, audio, settings

---

## Phase 5 — Lazy Loading

Do this last — it requires function component infrastructure from Phase 4.

### Components to lazy-load

These are never needed on initial render. They should only be loaded when the user opens them:

| Component | Trigger |
|---|---|
| `Settings/Settings.js` + children | User clicks settings icon |
| `Commentary.js` | User opens commentary panel |
| `Tags.js` (TagFloater) | User enters tag mode |
| `VideoBox.js` | User clicks video tutorial icon |
| `Hebrew.js` | User opens Hebrew mode AND `hebrewReady` is true |

### Implementation

In `App.js`, replace static imports with `React.lazy`:

```js
// DELETE these static imports:
import Settings from './Components/Settings/Settings'
import Commentary from './Components/Commentary'
import VideoBox from './Components/VideoBox'

// REPLACE WITH:
const Settings = React.lazy(() => import('./Components/Settings/Settings'))
const Commentary = React.lazy(() => import('./Components/Commentary'))
const VideoBox = React.lazy(() => import('./Components/VideoBox'))
```

Wrap conditional renders in `<Suspense>`:

```jsx
import { Suspense } from 'react'

// In render():
{this.state.settings && (
  <Suspense fallback={null}>
    <Settings />
  </Suspense>
)}

{this.state.commentaryMode && (
  <Suspense fallback={null}>
    <Commentary />
  </Suspense>
)}
```

### Components to keep as static imports

These are always visible on first render and must not be lazy-loaded:
- `Structure.js`
- `Section.js`
- `Verse.js`
- `Passage.js`
- `Audio.js` (audio state is managed from first render)
- `Search.js` (rendered inside Verse column always)

### Translation preloading

Replace the 3-second `setTimeout` in `loadTopVersions()`:

```js
// OLD:
loadTopVersions() {
  setTimeout(function() {
    for (var x in this.state.top_versions) { ... }
  }.bind(this), 3000)
}

// NEW:
loadTopVersions() {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => this._prefetchTopVersions(), { timeout: 10000 })
  } else {
    setTimeout(() => this._prefetchTopVersions(), 5000)
  }
}

_prefetchTopVersions() {
  for (const ver of this.state.top_versions) {
    if (ver === this.state.version) continue
    if (globalData.text[ver]) continue  // already loaded
    fetch(`${this.state.rootURL}./text/verses_${ver}.json`)
      .then(r => r.json())
      .then(data => { globalData.text[ver] = data })
  }
}
```

### Hebrew data lazy loading

`words_HEB.json` (840 KB) is currently fetched unconditionally on every page load. It should only load when the user first opens Hebrew mode.

In `loadCore()`, remove the unconditional Hebrew fetch:
```js
// DELETE this block from loadCore():
fetch(this.state.rootURL+"./text/words_HEB.txt")
  .then(response => response.text())
  .then(data => {
    globalData["hebrew"] = this.unzipJSON(data)
    ...
  })
```

Add a dedicated `loadHebrew()` method:
```js
loadHebrew() {
  if (globalData.hebrew) return Promise.resolve()  // already loaded
  return fetch(`${this.state.rootURL}./text/words_HEB.json`)
    .then(r => r.json())
    .then(data => {
      globalData.hebrew = data
      this.setState({ hebrewReady: true })
    })
}
```

Call `loadHebrew()` in the Hebrew icon's `onClick` handler (already in `Verse.js`) and in `searchHebrewWord()` before proceeding:
```js
// In searchHebrewWord():
searchHebrewWord(strong) {
  this.loadHebrew().then(() => {
    // existing logic
  })
}
```

Update `load_queue`: remove `"hebrew"` from the queue since it is no longer blocking app init. The `hebrewReady` state flag already gates the Hebrew UI correctly.

#### Acceptance criteria
- [ ] Network tab on cold load does NOT fetch `words_HEB.json` unless Hebrew mode is opened
- [ ] Settings, Commentary, VideoBox, Tags chunks appear in Network tab only when opened
- [ ] Translation prefetch uses `requestIdleCallback` (verify with Network throttling in DevTools)
- [ ] No regressions in Hebrew mode, commentary, settings, tags

---

## Non-Goals (out of scope for this spec)

- Rewriting `App.js` as a function component — the risk/reward ratio is low
- Changing any URL structure or data formats visible to users
- Adding new features
- Redux, Zustand, or any other state library — Context is sufficient
- Server-side rendering
- TypeScript migration
- Test suite (no tests currently exist; adding them is a separate effort)

---

## Suggested branch strategy

```
main
├── modernize/phase-1-gzip        ← data pipeline, no React changes
├── modernize/phase-2a-react18    ← React upgrade
├── modernize/phase-2b-vite       ← build tool swap
├── modernize/phase-2c-electron   ← Electron upgrade
├── modernize/phase-3-context     ← one sub-branch per component
├── modernize/phase-4-hooks       ← one sub-branch per component
└── modernize/phase-5-lazy        ← lazy loading
```

Each branch should be fully functional and deployable before merging. The phases can proceed in parallel by different contributors as long as Phase 3 precedes Phase 4, and Phase 4 precedes Phase 5.
