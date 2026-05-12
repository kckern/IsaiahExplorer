# Spec: Replace `globalData` with Typed DataContext
**Status:** Draft  
**Depends on:** None (can be done before or alongside the `app` prop Context migration)  
**Risk:** Low — the data shape doesn't change, only how components access it

---

## Problem

`globalData` in `src/globals.js` is a mutable module-level singleton:

```js
var globalData = {};
globalData["index"] = {};
globalData["structures"] = {};
// ...
export { globalData };
```

Every file that needs data imports it directly:
```js
import { globalData } from "../globals.js";
```

This creates three problems:

1. **No type information.** `globalData` is typed as `{}`. VS Code, the compiler, and any linter are blind to what's inside it. Typos (`globalData.comentary` instead of `globalData.commentary`) fail silently at runtime.

2. **Hidden coupling.** Components are tightly coupled to a module import. There's no way to know what shape of data a component requires without reading every line of it.

3. **Untestable.** You can't provide mock data to a component in isolation because it reaches past its props/context into a module-level global.

---

## Solution

Replace direct `globalData` imports with a **`DataContext`** that:
- Holds the same mutable reference (no behavioral change)
- Is typed via JSDoc `@typedef` definitions
- Lets components declare their data dependency through `useContext` instead of a module import
- Keeps `globals.js` as an internal implementation detail of `App.js` only

---

## Step 1 — Write the type definitions

Create `src/types.js`. This file contains only JSDoc `@typedef` comments — no runtime code. It serves as the living schema for the entire data model.

```js
// @ts-check
// src/types.js — JSDoc type definitions for Isaiah Explorer data model

/**
 * A single verse's position in Isaiah.
 * @typedef {{ chapter: number, verse: number, string: string }} VerseEntry
 */

/**
 * Maps verse_id (number, as string key) to its chapter/verse.
 * @typedef {Object.<string, VerseEntry>} VerseIndex
 */

/**
 * A single translated verse's text.
 * @typedef {{ text: string }} VerseText
 */

/**
 * All loaded translation text, keyed by shortcode then verse_id.
 * @typedef {Object.<string, Object.<string, VerseText>>} TextStore
 */

/**
 * A structural section (e.g., one block in the "Hero Journey" structure).
 * @typedef {{ title: string, heading: string, tag: string, verses: number[][] }} StructureSection
 */

/**
 * @typedef {Object.<string, StructureSection[]>} StructureStore
 */

/**
 * An outline heading entry.
 * @typedef {{ heading: string, verses: number[] }} OutlineHeading
 */

/**
 * @typedef {Object.<string, OutlineHeading[]>} OutlineStore
 */

/**
 * Lookup: verse_id → structure_shortcode → section index
 * @typedef {Object.<string, Object.<string, number>>} StructureIndex
 */

/**
 * Lookup: verse_id → outline_shortcode → heading index
 * @typedef {Object.<string, Object.<string, number>>} OutlineIndex
 */

/**
 * @typedef {{
 *   slug: string,
 *   type: string,
 *   meta: string,
 *   parents: string[],
 *   verses?: number[],
 *   prev?: string,
 *   next?: string,
 * }} TagEntry
 */

/**
 * @typedef {{
 *   tagIndex: Object.<string, TagEntry>,
 *   tagChildren: Object.<string, string[]>,
 *   tagSiblings: Object.<string, string[]>,
 *   tagBranches: string[],
 *   parentTagIndex: Object.<string, string[]>,
 *   verseTagIndex: Object.<string, string[]>,
 *   tagStructure: Object.<string, Object.<string, { verses: number[], highlight?: any }>>,
 *   superRefs: Object.<string, number[]>,
 * }} TagStore
 */

/**
 * @typedef {{
 *   comIndex: Object.<string, Object.<string, number[]>>,
 *   comOrder: string[],
 *   comSources: Object.<string, { shortcode: string, name: string, title: string }>,
 *   idIndex: Object.<string, { source: string, verse_ids: number[] }>,
 *   comData: Object.<string, any>,
 * }} CommentaryStore
 */

/**
 * @typedef {{
 *   files: Object.<string, Object.<string, number[]>>,
 *   index: Object.<string, Object.<string, string[]>>,
 * }} CommentaryAudioStore
 */

/**
 * @typedef {{
 *   shortcode: string,
 *   title: string,
 *   description: string,
 *   audio?: number,
 *   image?: string,
 * }} MetaEntry
 */

/**
 * @typedef {{
 *   structure: Object.<string, MetaEntry>,
 *   outline: Object.<string, MetaEntry>,
 *   version: Object.<string, MetaEntry>,
 *   commentary: Object.<string, MetaEntry>,
 *   audiocom: Object.<string, MetaEntry>,
 * }} MetaStore
 */

/**
 * @typedef {{
 *   verses: Object.<string, Object.<string, { strong: number, orig: string, phon: string, eng: string, word: number }>>,
 *   fax: Object.<string, any>,
 *   high: Object.<string, any>,
 * }} HebrewStore
 */

/**
 * The full in-memory data store. Populated by App.loadCore() and never reassigned.
 * Individual sub-keys are mutated in place (text cache, commentary cache, recently viewed tags).
 *
 * @typedef {{
 *   index: VerseIndex,
 *   structures: StructureStore,
 *   structureIndex: StructureIndex,
 *   outlines: OutlineStore,
 *   outlineIndex: OutlineIndex,
 *   meta: MetaStore,
 *   text: TextStore,
 *   tags: TagStore,
 *   commentary: CommentaryStore,
 *   commentary_audio: CommentaryAudioStore,
 *   hebrew?: HebrewStore,
 *   custom: any,
 *   timeouts: Object.<string, ReturnType<typeof setTimeout>[]>,
 * }} IsaiahData
 */
```

---

## Step 2 — Create `DataContext`

Create `src/DataContext.js`:

```js
// @ts-check
import React from 'react'

/**
 * Provides the loaded Isaiah data store to all components.
 * Value is the mutable globalData object reference, set once after loadCore() completes.
 * Components should treat this as read-only except for documented cache fields
 * (commentary.comData, tags.parentTagIndex["Recently Viewed Tags"]).
 *
 * @type {React.Context<import('./types').IsaiahData | null>}
 */
export const DataContext = React.createContext(null)
```

---

## Step 3 — Wire the provider in `App.js`

Add `// @ts-check` to the top of `App.js`.

Import the context and types:
```js
// @ts-check
import { DataContext } from './DataContext'
```

In `App.render()`, wrap the existing return in `DataContext.Provider`:

```jsx
render() {
  // ... existing classes, settingsPanel, videoPanel logic ...

  return (
    <DataContext.Provider value={globalData}>
      <div id="approot" className={classes.join(" ")}>
        {/* unchanged */}
      </div>
    </DataContext.Provider>
  )
}
```

`globalData` is a stable object reference — the provider value never changes identity, so this adds zero re-render overhead. Components subscribed to `DataContext` will not re-render just because `globalData` is mutated (they re-render because `App.setState()` is called separately, which is the existing behavior).

---

## Step 4 — Migrate components off the direct import

For each component, replace:
```js
import { globalData } from "../globals.js"
```
With:
```js
import { useContext } from 'react'
import { DataContext } from '../DataContext'
```

And at the top of each `render()` method (class components) or function body (function components):
```js
// Class component:
render() {
  const data = this.context  // after adding: static contextType = DataContext
  // replace: globalData.foo  →  data.foo
}

// Function component:
function MyComponent() {
  const data = useContext(DataContext)
  // replace: globalData.foo  →  data.foo
}
```

### Files to migrate (in order, lowest risk first)

| File | `globalData` fields accessed | Notes |
|---|---|---|
| `Audio.js` | `meta.version`, `commentary_audio` | Read-only access only |
| `Search.js` | `hebrew.high`, `commentary.comSources`, `outlines`, `outlineIndex` | Read-only |
| `Passage.js` | `meta.version` | Minimal, lowest risk |
| `Structure.js` | `meta.structure`, `structures`, `index`, `outlineIndex` | Read-only |
| `Section.js` | Various meta/outline data | Read-only |
| `Hebrew.js` | `hebrew.verses`, `hebrew.fax`, `hebrew.high` | Read-only |
| `Verse.js` | `index`, `meta`, `hebrew.high`, `text`, `outlineIndex`, `structureIndex`, `outlines`, `structures` | Largest surface area |
| `Tags.js` | Tag data | Read-only |
| `Commentary.js` | `commentary.*` | **Writes** to `commentary.comData` — see note below |

### Special case: `Commentary.js` writes to `globalData`

`Commentary.js` uses `globalData.commentary.comData` as a fetch cache:
```js
globalData.commentary.comData[new_id] = null      // reserve slot
globalData.commentary.comData[data.id] = data     // populate after fetch
```

This is legitimate cache behavior — it should stay mutable. After migration, these writes go through the same `data` reference from context:
```js
const data = useContext(DataContext)
// ...
data.commentary.comData[new_id] = null      // same mutation, now through context ref
data.commentary.comData[data_item.id] = data_item
```

No behavior change — just the access path changes from module import to context.

---

## Step 5 — Restrict `globals.js` to `App.js` only

After all components are migrated off the direct import, `globals.js` should only be imported by `App.js`. Add a comment to enforce this:

```js
// src/globals.js
// INTERNAL — only imported by App.js.
// All other files access this data via DataContext (src/DataContext.js).
var globalData = /** @type {import('./types').IsaiahData} */ ({})
// ...
```

VS Code (and `// @ts-check`) will now type-check all access to `globalData` in `App.js` against the `IsaiahData` typedef.

---

## What this achieves

| Before | After |
|---|---|
| `globalData` typed as `{}` | Fully typed via JSDoc `@typedef` |
| Direct module import in 9 files | Single context subscription |
| Silent runtime errors on typos | VS Code red squiggle + type error |
| Untestable components | Components can receive mock data via `DataContext.Provider` in tests |
| No documentation of data shape | `src/types.js` is the living schema |

---

## What this does NOT change

- The mutable nature of `globalData` — it stays mutable, accessed by reference
- Any rendering behavior — no re-render changes
- `App.js` logic — zero changes to `loadCore()`, `loadVersion()`, etc.
- `globals.js` — still exists, still exports `globalData`, just no longer imported by components

---

## Acceptance criteria

- [ ] `src/types.js` exists with complete JSDoc typedefs for all `IsaiahData` fields
- [ ] `src/DataContext.js` exists and is typed `React.Context<IsaiahData | null>`
- [ ] `App.render()` wraps output in `<DataContext.Provider value={globalData}>`
- [ ] No component in `src/Components/` contains `import { globalData } from "../globals.js"`
- [ ] VS Code shows type completions on `data.` in any component (e.g., `data.commentary.` shows `comIndex`, `comSources`, etc.)
- [ ] `// @ts-check` is present in `App.js` and all migrated components
- [ ] All existing functionality works identically
