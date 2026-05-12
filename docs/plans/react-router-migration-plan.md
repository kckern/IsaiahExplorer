# React Router Migration Plan
Status: Proposed
Last updated: 2026-05-11

---

## Goal

Migrate from manual hash routing in App.js to React Router with minimal risk, full URL compatibility, and no behavioral regressions in web and Electron.

---

## Current State

- Routing is manually implemented in App.js via getSettingsFromUrl() and setUrl().
- URL reads and writes use window.location.hash and window.location.pathname directly.
- No react-router or react-router-dom dependency is currently installed.
- Existing docs still state "no React Router" and must be updated as part of this migration.

---

## Router Strategy

### Primary choice

Use react-router-dom v6 with HashRouter (or createHashRouter) as the initial target.

Why:
- Preserves existing hash URL behavior.
- Works reliably on static hosting without server rewrite rules.
- Works with Electron file:// packaging.
- Enables incremental migration without changing user-facing URL shape immediately.

### Optional future target

BrowserRouter can be considered later only if server rewrite rules are guaranteed for all deployment targets.

---

## Best-Practice Principles

1. Centralize URL logic in one module.
2. Keep parse and serialize functions pure and tested.
3. Use replace navigation for high-frequency state changes (keyboard/audio stepping), push only for user-intent checkpoints.
4. Avoid duplicated routing logic across JS and PHP by defining one canonical route schema and mapping adapters.
5. Keep route params for stable resource identity; move transient UI state to query params over time.
6. Add compatibility redirects so old shared links continue to work.
7. Ship in small phases with rollback points.

---

## Target Route Model

### Compatibility phase (no user-visible URL changes)

Continue supporting current shape:

/#/structure/outline/version/chapter/verse[/tag.slug][/search.query][/hebrew.NNNN][/commentary.source/id]

### Standardized phase

Move to canonical params + query model:

/#/:structure/:outline/:version/:chapter/:verse?tag=:slug&search=:query&hebrew=:strong&commentary=:source/:id

This reduces positional brittleness and simplifies parsing.

---

## Phased Execution

## Phase 0 - Baseline and Doc Alignment

### Tasks

1. Update docs that currently declare "no React Router":
   - AGENTS.md
   - docs/specs/modernization.md
2. Record baseline behavior for:
   - deep links
   - back/forward behavior
   - keyboard navigation URL updates
   - Electron launch/deep link behavior
3. Capture baseline URL examples used by users today.

### Exit criteria

- Documentation no longer conflicts with migration intent.
- Baseline smoke checklist exists for route behavior.

---

## Phase 1 - Install Router and Add Shell (No Behavior Change)

### Tasks

1. Install dependency:
   - npm install react-router-dom
2. Wrap app root in HashRouter.
3. Keep the app rendering exactly as today (single app shell route).
4. Do not remove manual parser/serializer yet.

### Exit criteria

- App boots under HashRouter with zero functional changes.
- Existing links still open correctly.

---

## Phase 2 - Create Route Codec Module

### Tasks

1. Add src/routing/routeCodec.js with:
   - parseRoute(path)
   - buildRoute(state)
   - normalizeRoute(path)
2. Move all route regex logic out of App.js into routeCodec.js.
3. Make App.js call codec functions only.
4. Add unit tests for route codec using current URL fixtures.

### Exit criteria

- App.js no longer contains route regex parsing logic.
- Round-trip tests pass: parse(build(state)) is stable.

---

## Phase 3 - Replace Direct window.location Writes

### Tasks

1. Create a small navigation adapter around useNavigate/useLocation.
2. Replace window.location.hash assignment in setUrl() with navigate().
3. Introduce navigation intent types:
   - replace: keyboard stepping, audio stepping, hover-driven updates
   - push: explicit user clicks (verse jump, structure/outline/version change)
4. Ensure document.title updates remain consistent.

### Exit criteria

- No direct window.location.hash writes remain in App routing flow.
- History spam is reduced for high-frequency navigation.

---

## Phase 4 - Declarative Route Ownership

### Tasks

1. Introduce route definitions with <Routes>/<Route> (or data router config).
2. Add compatibility redirect route(s) from legacy path variants.
3. Keep one stable canonical route output from buildRoute().
4. Move optional segments toward query params with backward-compatible parsing.

### Exit criteria

- Route matching is declarative, not manual regex in App.
- Legacy URLs still resolve.

---

## Phase 5 - Integration Cleanup

### Tasks

1. Remove obsolete routing helpers from App.js.
2. Add route-level error handling for malformed URLs.
3. Add guards for invalid structure/outline/version values with safe fallback redirects.
4. Update PHP meta generation mapping to the canonical route schema.

### Exit criteria

- Routing logic is fully owned by router + route codec.
- Malformed URL handling is deterministic.

---

## Validation Matrix

Run after each phase:

1. Open direct deep links to structure/outline/version/chapter/verse.
2. Open links with tag, search, hebrew, and commentary modifiers.
3. Verify back/forward behavior in browser.
4. Verify keyboard navigation does not flood history.
5. Verify commentary and audio navigation keep URL and UI in sync.
6. Verify Electron dev and packaged app behavior.
7. Verify SEO/PHP pages still resolve expected metadata.

---

## Risks and Mitigations

- Risk: History behavior regressions.
  - Mitigation: explicit replace vs push policy and tests.

- Risk: Broken legacy links.
  - Mitigation: compatibility parser plus redirect tests.

- Risk: Divergence between JS and PHP route rules.
  - Mitigation: single canonical route schema document and mapping tests.

- Risk: Over-coupling router to monolithic App state.
  - Mitigation: route codec isolation and incremental extraction.

---

## Branch Plan

- modernize/router-phase-0-docs
- modernize/router-phase-1-shell
- modernize/router-phase-2-codec
- modernize/router-phase-3-navigation
- modernize/router-phase-4-declarative
- modernize/router-phase-5-cleanup

Each branch should be mergeable independently with passing route smoke checks.

---

## Definition of Done

1. React Router is the single routing runtime.
2. App.js no longer manually parses and writes routes directly.
3. Legacy URLs remain functional.
4. URL and navigation behavior are stable in web and Electron.
5. Docs are fully updated to reflect the new routing architecture.
