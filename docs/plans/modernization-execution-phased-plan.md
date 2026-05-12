# Isaiah Explorer Modernization - Phased Execution Plan
Status: Proposed  
Last updated: 2026-05-11  
Primary inputs: docs/specs/modernization.md, docs/specs/globaldata-to-context.md

---

## Objective

Execute modernization in safe, incremental phases while keeping the app fully functional in both web and Electron builds. No feature changes are introduced; this is architecture, tooling, and performance hardening.

---

## Execution Rules

1. Every phase must be mergeable and deployable on its own.
2. No big-bang rewrite of `App.js`.
3. Preserve URL behavior and keyboard behavior exactly.
4. Keep Electron and web parity in every phase.
5. Prefer small PRs by component or concern, not monolithic branches.

---

## Phase Map

| Phase | Name | Outcome | Depends On |
|---|---|---|---|
| 0 | Baseline and Safety Rails | Reproducible baseline metrics + smoke checklist + branch strategy | None |
| 1 | Data Pipeline Modernization | `.txt` + client unzip replaced with JSON fetch pipeline | 0 |
| 2 | Platform and Dependency Upgrades | React 18, Vite, Electron current, stale UI libs replaced | 1 |
| 3A | Typed Data Context | `globalData` access moved to typed `DataContext` | 2 |
| 3B | App Context Migration | `app={this}` prop drilling removed via `AppContext` | 3A |
| 4 | Hooks Migration | Components converted to function components and hooks | 3B |
| 5 | Lazy Loading and Perf | Non-critical UI and heavy data loaded on demand | 4 |
| 6 | Hardening and Cleanup | Final validation, dead code cleanup, docs sync | 5 |

Note: Specs describe Context as modernization Phase 3 and hooks as Phase 4. This plan splits Context into 3A and 3B so typed data migration is isolated from app-instance migration.

---

## Phase 0 - Baseline and Safety Rails

### Scope

- Capture baseline before architectural changes.
- Define smoke test matrix used after every phase.
- Set branch and PR conventions.

### Tasks

- Record baseline startup and build data.
  - `npm start` cold start time.
  - `npm run build` duration.
  - Baseline build size and top bundles.
- Record baseline runtime requests on first load.
  - Confirm current requests for `core/core.txt`, `text/verses_*.txt`, `text/words_HEB.txt`.
- Define manual smoke checklist:
  - Structure/Section/Verse/Passage navigation.
  - Search (text and Hebrew strong lookups).
  - Commentary open/close and commentary navigation.
  - Audio playback and commentary audio.
  - Settings open, reorder favorites, persistence in `localStorage`.
  - Keyboard shortcuts.
  - Tag mode + floating tag navigation.
  - Electron launch (`npm run e-dev`) and package smoke (`npm run e-pack`).
- Branch policy:
  - `modernize/phase-1-data`
  - `modernize/phase-2-react18`
  - `modernize/phase-2-vite`
  - `modernize/phase-2-electron`
  - `modernize/phase-2-ui-libs`
  - `modernize/phase-3a-data-context`
  - `modernize/phase-3b-app-context`
  - `modernize/phase-4-hooks`
  - `modernize/phase-5-lazy`
  - `modernize/phase-6-hardening`

### Exit Gate

- Baseline metrics captured in docs.
- Smoke checklist documented and used as release gate for all following phases.

---

## Phase 1 - Data Pipeline Modernization

### Scope

Implement modernization spec Phase 1.

### Tasks

1. Regenerate static data files to JSON shape:
   - `public/core/core.json`
   - `public/core/tags_hl.json`
   - `public/text/index.json`
   - `public/text/verses_<SHORTCODE>.json`
   - `public/text/words_HEB.json`
2. Replace unzip code path in `App.js`:
   - Remove `pako` and npm `atob` imports.
   - Remove `unzipJSON` usage and method.
   - Introduce robust JSON fetch helper with HTTP error handling.
3. Update all fetch URLs from `.txt` to `.json`.
4. Remove packages:
   - `npm uninstall pako atob`
5. Validate load queue behavior and failure handling (no silent array fallback).

### PR Slices

- PR 1: Data fetch helper and App.js loader refactor (keeping old files in place).
- PR 2: File extension and data artifact swap.
- PR 3: Package removal and cleanup.

### Exit Gate

- App fully loads using `.json` files only.
- No references to `pako`, `atob`, or `unzipJSON` remain.
- Smoke checklist passes on web and Electron.

---

## Phase 2 - Platform and Dependency Upgrades

### Scope

Implement modernization spec Phase 2 in four isolated sub-phases.

### 2A - React 18 Upgrade

Tasks:
- Upgrade `react` and `react-dom` to 18.
- Migrate `src/index.js` from `ReactDOM.render` to `createRoot`.
- Move or rename `componentWillMount` lifecycle usage.

Exit gate:
- App renders with React 18 and no blocking console errors.

### 2B - CRA to Vite

Tasks:
- Add Vite config and scripts.
- Remove CRA/rescripts dependencies.
- Verify root `index.html` and script entry.
- Resolve asset imports and environment variable differences.

Exit gate:
- `npm start` uses Vite.
- `npm run build` emits working build.
- Smoke checklist passes.

### 2C - Electron Upgrade

Tasks:
- Upgrade Electron and `electron-builder`.
- Validate secure `webPreferences` defaults.
- Verify preload bridge behavior.
- Validate packaging on macOS and Windows targets.

Exit gate:
- `npm run e-dev` and `npm run e-pack` succeed.

### 2D - UI Library Refresh

Tasks:
- Replace `react-tipsy`.
- Replace `react-sortable-hoc`.
- Upgrade `react-player`.

Exit gate:
- Settings drag-reorder, tooltips, and media behaviors match baseline.

---

## Phase 3A - Typed Data Context (`globalData` migration)

### Scope

Implement docs/specs/globaldata-to-context.md.

### Tasks

1. Create `src/types.js` with JSDoc typedefs for `IsaiahData` and nested stores.
2. Create `src/DataContext.js` typed as `React.Context<IsaiahData | null>`.
3. Add `DataContext.Provider` in `App.render()` with `value={globalData}`.
4. Migrate components off `import { globalData } from '../globals.js'`.
   - Migration order:
     - `Audio.js`
     - `Search.js`
     - `Passage.js`
     - `Structure.js`
     - `Section.js`
     - `Hebrew.js`
     - `Verse.js`
     - `Tags.js`
     - `Commentary.js`
5. Keep cache mutation behavior intact in `Commentary.js` (`comData` write-through).
6. Restrict `globals.js` to internal use by `App.js`.

### PR Slices

- PR 1: `types.js`, `DataContext.js`, provider wiring in `App.js`.
- PR 2+: One component per PR (or two small components max).
- Final PR: `globals.js` restriction comments and cleanup grep guard.

### Exit Gate

- No component in `src/Components` imports `globalData` directly.
- Type completions and static checks work for context data paths.
- Runtime behavior unchanged.

---

## Phase 3B - App Context (`app={this}` removal)

### Scope

Implement modernization spec Phase 3 (prop drilling removal) after 3A.

### Tasks

1. Create `src/AppContext.js`.
2. Wrap `App.render()` output with `AppContext.Provider value={this}`.
3. Migrate components from `this.props.app` to context in order:
   - `VideoBox.js`
   - `Search.js`
   - `Audio.js`
   - `Hebrew.js`
   - `Structure.js`
   - `Section.js`
   - `Tags.js`
   - `Verse.js`
   - `Passage.js`
   - `Settings/*`
4. Remove `app` prop at each call site immediately after component migration.

### Exit Gate

- No `app={...}` props remain in render tree.
- No component reads `this.props.app`.
- Feature parity confirmed via smoke checklist.

---

## Phase 4 - Function Components and Hooks

### Scope

Implement modernization spec Phase 4 once context migration is complete.

### Tasks

- Convert components in same low-to-high risk order used in Phase 3B.
- Keep `App.js` as class component.
- Map lifecycle logic to `useEffect` with explicit dependencies.
- Apply `React.memo` to stable leaf components where beneficial.
- Remove transitional bridge access (`this.context.app`) as each component is converted.
- Standardize converted components on `useContext(AppContext)` plus local state hooks.

### Exit Gate

- `src/Components` contains function components only.
- No `this.context.app` remains in `src/Components`.
- No regression in keyboard, Hebrew, commentary, tags, audio, settings.

---

## Phase 5 - Lazy Loading and Performance

### Scope

Implement modernization spec Phase 5 after hooks migration.

### Tasks

- Introduce `React.lazy` + `Suspense` for:
  - `Settings`
  - `Commentary`
  - `Tags` floater
  - `VideoBox`
  - `Hebrew`
- Keep always-visible columns as static imports.
- Replace translation preload timeout with idle scheduling.
- Load Hebrew data only on first Hebrew interaction.

### Exit Gate

- Cold load no longer downloads Hebrew data preemptively.
- Deferred panels load their chunks only when opened.
- No UX regressions.

---

## Phase 6 - Hardening and Cleanup

### Scope

Finalize modernization with consistency and reliability cleanup.

### Tasks

- Remove dead code and stale comments introduced by phased migration.
- Re-run whole-repo search checks:
  - no `globalData` imports in components
  - no `this.props.app`
  - no `.txt` data fetch paths
  - no `unzipJSON` references
- Reconcile docs:
  - Update `AGENTS.md` where architecture conventions changed.
  - Mark old patterns as deprecated.
- Capture post-modernization metrics vs baseline.

### Exit Gate

- All architecture targets achieved.
- Measurable startup and bundle improvements documented.

---

## Cross-Phase Validation Checklist

Run after every merged phase:

1. `npm start` launches and app is interactive.
2. `npm run build` succeeds.
3. `npm run e-dev` launches Electron app.
4. Navigation and URL hash behavior unchanged.
5. Keyboard shortcuts unchanged.
6. Search, tags, commentary, audio, Hebrew all function.
7. Settings favorites reorder and persistence still work.

---

## Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Data format mismatch during Phase 1 | App fails to load | Temporary fallback branch and staged artifact rollout |
| Vite asset path differences | Missing images/audio | Audit all dynamic assets during 2B |
| Electron API behavior differences | Desktop regressions | Keep 2C isolated and heavily smoke-tested |
| Context migration mistakes in complex components | Navigation/UI regressions | One-component PR slices and immediate smoke runs |
| Hook conversion dependency bugs | Subtle state race conditions | Preserve behavior first, optimize second |

---

## Suggested Timeline (single contributor)

| Week | Focus |
|---|---|
| 1 | Phase 0 + Phase 1 |
| 2 | Phase 2A and 2B |
| 3 | Phase 2C and 2D |
| 4 | Phase 3A |
| 5 | Phase 3B |
| 6 | Phase 4 |
| 7 | Phase 5 + Phase 6 |

Parallel contributors can reduce this timeline if each branch remains phase-ordered and merge-safe.

---

## Definition of Done

1. Modernization spec phases are implemented and accepted.
2. `globalData` access is context-based and typed.
3. Prop drilling of app instance is removed.
4. Components are hook-based where planned.
5. Lazy loading and data-loading improvements are in place.
6. Web and Electron builds pass smoke validation.