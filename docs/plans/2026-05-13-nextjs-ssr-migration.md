# Next.js SSR Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate Isaiah Explorer from CRA + react-router-dom to Next.js 14 (App Router) with metadata-only SSR on AWS Amplify, enabling SEO and social-media link previews for all 13 canonical URL permutations.

**Architecture:** Next.js owns the URL and runs `generateMetadata` server-side from a module-cached `core.txt`. The existing App.js class component is wrapped in a `'use client'` boundary and continues to render the interactive UI unchanged. `react-router-dom` is replaced by a Next.js shim over `next/navigation`; legacy slash-form URLs are redirected via middleware. Subsite customization runs per-request off the `Host` header.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript (new layer only), Jest (existing), Playwright (new, for SSR smoke tests), AWS Amplify Hosting (Web Compute platform), pako (existing), Node 18.18+.

**Reference docs:**
- `docs/reference/routing.md` — full routing grammar and edge cases
- `src/routing/routeCodec.js` — the codec being preserved verbatim
- `src/App.js:337-383` — `getSeoData()`, the function being ported to `generateMetadata`

**Conventions used in this plan:**
- TDD where there's logic to test; non-TDD for scaffolding/cleanup
- One commit per task unless trivially small
- All TypeScript files use `.ts` / `.tsx`; existing `.js` files stay `.js`
- All new server-side code lives under `lib/server/`; new client code under `app/`
- Commit messages follow the existing `feat(scope): ...` / `chore: ...` / `refactor: ...` style

---

## Phase 1: Foundation — Next.js scaffolding alongside CRA

The goal of Phase 1 is to install Next.js, get an empty page rendering on `http://localhost:3001`, and verify CRA on `:3000` still works. No app logic is touched yet.

---

### Task 1: Confirm Node version

**Files:** none

**Step 1: Check Node version**

Run: `node --version`
Expected: `v18.18.0` or higher (Next.js 14 requires this).

**Step 2: If lower, install via nvm**

Run: `nvm install 18 && nvm use 18`

**Step 3: Verify**

Run: `node --version`
Expected: starts with `v18.` or `v20.`

No commit (this is environment-only).

---

### Task 2: Install Next.js + React 18

**Files:**
- Modify: `package.json`

**Step 1: Install Next.js, React 18, and types**

Run:
```bash
npm install next@14 react@18 react-dom@18
npm install --save-dev typescript @types/react @types/react-dom @types/node
```

**Step 2: Verify install**

Run: `npx next --version`
Expected: `14.x.x`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add Next.js 14 + React 18 + TypeScript"
```

---

### Task 3: Add Next.js scripts to package.json (side-by-side with CRA)

**Files:**
- Modify: `package.json`

**Step 1: Add Next.js scripts alongside existing CRA scripts**

In the `"scripts"` object, add:
```json
"dev:next": "next dev --port 3001",
"build:next": "next build",
"start:next": "next start --port 3001",
"lint:next": "next lint"
```

Do **not** modify the existing `start`, `build`, `test`, `e-*` scripts in this task — both build systems must coexist during migration.

**Step 2: Commit**

```bash
git add package.json
git commit -m "chore(scripts): add dev:next/build:next alongside CRA scripts"
```

---

### Task 4: Create minimal `next.config.js`

**Files:**
- Create: `next.config.js`

**Step 1: Write config**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // CRA uses /public for static assets — Next.js does too, so no remapping needed.
  // The legacy `--openssl-legacy-provider` flag is not required for Next.js builds.
};

module.exports = nextConfig;
```

**Step 2: Commit**

```bash
git add next.config.js
git commit -m "feat(next): add minimal next.config.js"
```

---

### Task 5: Create `tsconfig.json`

**Files:**
- Create: `tsconfig.json`
- Create: `next-env.d.ts` (Next.js generates this on first run)

**Step 1: Write tsconfig**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

**Step 2: Verify by running typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (we have no `.ts` files yet, so it should be a no-op).

**Step 3: Commit**

```bash
git add tsconfig.json
git commit -m "feat(next): add tsconfig.json with allowJs"
```

---

### Task 6: Create minimal `app/layout.tsx`

**Files:**
- Create: `app/layout.tsx`

**Step 1: Write layout**

```tsx
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Isaiah Explorer',
  description: 'Read Isaiah in multiple translations with thematic tags, Hebrew lexicon, and scholarly commentary.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

**Step 2: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(next): add root layout"
```

---

### Task 7: Create stub `app/page.tsx` that renders a hello-world

**Files:**
- Create: `app/page.tsx`

**Step 1: Write the page**

```tsx
export default function Page() {
  return <div>Next.js is alive.</div>;
}
```

**Step 2: Run the dev server**

Run: `npm run dev:next`
Open: `http://localhost:3001`
Expected: page shows "Next.js is alive."
Kill the server with Ctrl+C.

**Step 3: Verify CRA still works**

Run: `npm start` (CRA on port 3000)
Open: `http://localhost:3000`
Expected: existing Isaiah Explorer renders normally.
Kill with Ctrl+C.

**Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat(next): stub homepage; CRA still works"
```

---

### Task 8: Verify Next.js production build runs

**Files:** none

**Step 1: Build**

Run: `npm run build:next`
Expected: build completes with `Compiled successfully` and no warnings about missing types.

**Step 2: Start production server**

Run: `npm run start:next`
Open: `http://localhost:3001`
Expected: same hello-world page renders.

No commit. This is a smoke check.

---

## Phase 2: Server-side data layer

The codec is pure and portable as-is. This phase adds a server-side loader for `core.txt` so `generateMetadata` can look up tag names, commentary source display names, and verse references without re-fetching on every request.

---

### Task 9: Copy `core.txt` to a path the server can read

**Files:**
- Verify or copy: `public/core/core.txt` exists

**Step 1: Locate `core.txt`**

Run: `find . -name "core.txt" -not -path "./node_modules/*" 2>/dev/null`
Expected: at least one path like `./public/core/core.txt` or similar.

**Step 2: Confirm it's reachable as a public asset**

If it's already in `public/`, no action needed — Next.js will read it from disk server-side via `path.join(process.cwd(), 'public', ...)`. If it's elsewhere, copy or symlink to `public/core/core.txt`.

No commit (verification step).

---

### Task 10: Write a failing test for `lib/server/dataCache.ts`

**Files:**
- Create: `lib/server/__tests__/dataCache.test.ts`

**Step 1: Write the test**

```ts
import { loadGlobalData } from '../dataCache';

describe('loadGlobalData', () => {
  test('returns an object with tags, meta, commentary, index', async () => {
    const data = await loadGlobalData();
    expect(data).toBeDefined();
    expect(data.tags).toBeDefined();
    expect(data.tags.tagIndex).toBeDefined();
    expect(data.meta).toBeDefined();
    expect(data.meta.structure).toBeDefined();
    expect(data.meta.version).toBeDefined();
    expect(data.commentary).toBeDefined();
    expect(data.index).toBeDefined();
  });

  test('caches between calls (same reference)', async () => {
    const a = await loadGlobalData();
    const b = await loadGlobalData();
    expect(a).toBe(b);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest lib/server/__tests__/dataCache.test.ts`
Expected: FAIL with `Cannot find module '../dataCache'`.

---

### Task 11: Implement `lib/server/dataCache.ts`

**Files:**
- Create: `lib/server/dataCache.ts`

**Step 1: Implement the cache**

```ts
import fs from 'fs/promises';
import path from 'path';
import pako from 'pako';

type GlobalData = {
  tags: { tagIndex: Record<string, { slug: string; name?: string }> };
  meta: {
    structure: Record<string, unknown>;
    outline: Record<string, unknown>;
    version: Record<string, unknown>;
    commentary: Record<string, unknown>;
  };
  commentary: { comSources: Record<string, { name: string }> };
  index: Record<string, { chapter: number; verse: number }>;
  custom?: unknown;
};

let cached: GlobalData | null = null;
let inflight: Promise<GlobalData> | null = null;

export async function loadGlobalData(): Promise<GlobalData> {
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    const filePath = path.join(process.cwd(), 'public', 'core', 'core.txt');
    const buf = await fs.readFile(filePath);
    const decompressed = pako.inflate(buf, { to: 'string' });
    const data = JSON.parse(decompressed) as GlobalData;
    cached = data;
    inflight = null;
    return data;
  })();

  return inflight;
}

// Test-only reset
export function __resetCache() {
  cached = null;
  inflight = null;
}
```

**Step 2: Run test to verify it passes**

Run: `npx jest lib/server/__tests__/dataCache.test.ts`
Expected: both tests PASS.

**Step 3: Commit**

```bash
git add lib/server/dataCache.ts lib/server/__tests__/dataCache.test.ts
git commit -m "feat(server): module-cached loader for core.txt"
```

---

### Task 12: Verify `core.txt` format matches loader assumption

**Files:** none

**Step 1: Check the actual encoding**

The current client code does `unzipJSON(data)` after `response.text()`. Look at `App.js` to confirm whether `pako.inflate` is the right call vs `pako.ungzip`.

Run: `grep -nE "(unzipJSON|pako)" src/App.js`
Expected: shows the unzip function definition.

**Step 2: Match the loader to the client**

If the client uses `pako.ungzip` not `pako.inflate`, update `lib/server/dataCache.ts` to match. Re-run the test.

Run: `npx jest lib/server/__tests__/dataCache.test.ts`
Expected: PASS.

**Step 3: Commit if changed**

```bash
git add lib/server/dataCache.ts
git commit -m "fix(server): match dataCache decompression to client unzipJSON"
```

---

## Phase 3: Metadata generation

Port `App.getSeoData()` (App.js:337-383) to a pure server-side function that takes a parsed route + data and returns a Next.js `Metadata` object with OG and Twitter tags.

---

### Task 13: Write failing tests for `buildMetadata`

**Files:**
- Create: `lib/server/__tests__/buildMetadata.test.ts`

**Step 1: Write tests for the 5 title/description branches**

```ts
import { buildMetadata } from '../buildMetadata';

const fakeData: any = {
  tags: { tagIndex: { 'Suffering Servant': { slug: 'suffering-servant' } } },
  commentary: { comSources: { barnes: { name: 'Barnes' } } },
  index: { '17656': { chapter: 1, verse: 1 } },
};

const baseState = {
  structure: 'whole', outline: 'chapters', version: 'IINST',
  chapter: 5, verse: 4, activeVerseId: '17656',
  selected_tag: null, showcase_tag: null,
  searchQuery: null, hebrewStrongIndex: null,
  commentaryMode: false, commentarySource: null, commentaryID: null,
};

describe('buildMetadata', () => {
  test('default verse: "Isaiah 5:4 | Isaiah Explorer"', () => {
    const m = buildMetadata(baseState, fakeData, 'https://isaiah.scripture.guide');
    expect(m.title).toBe('Isaiah 5:4 | Isaiah Explorer');
    expect(m.description).toContain('Isaiah 5:4');
    expect(m.alternates?.canonical).toBe('https://isaiah.scripture.guide/whole/chapters/iinst/5/4');
  });

  test('with tag: title leads with tag', () => {
    const m = buildMetadata({ ...baseState, selected_tag: 'Suffering Servant' }, fakeData, 'https://x');
    expect(m.title).toBe('Suffering Servant | Isaiah 5:4');
  });

  test('with search: quoted query in title', () => {
    const m = buildMetadata({ ...baseState, searchQuery: 'comfort my people' }, fakeData, 'https://x');
    expect(m.title).toContain('comfort my people');
  });

  test('with hebrew: Hebrew Hxxxx label', () => {
    const m = buildMetadata({ ...baseState, hebrewStrongIndex: 6918 }, fakeData, 'https://x');
    expect(m.title).toBe('Hebrew H6918 | Isaiah Explorer');
  });

  test('with commentary: source name + verse', () => {
    const m = buildMetadata(
      { ...baseState, commentaryMode: true, commentarySource: 'barnes' },
      fakeData,
      'https://x'
    );
    expect(m.title).toBe('Isaiah 5:4 | Barnes');
    expect(m.description).toContain('Barnes');
  });

  test('OpenGraph tags present', () => {
    const m = buildMetadata(baseState, fakeData, 'https://x');
    expect(m.openGraph?.title).toBeDefined();
    expect(m.openGraph?.description).toBeDefined();
    expect(m.openGraph?.url).toBeDefined();
    expect(m.openGraph?.type).toBe('article');
  });

  test('Twitter card present', () => {
    const m = buildMetadata(baseState, fakeData, 'https://x');
    expect(m.twitter?.card).toBe('summary_large_image');
    expect(m.twitter?.title).toBeDefined();
  });
});
```

**Step 2: Run test to verify failure**

Run: `npx jest lib/server/__tests__/buildMetadata.test.ts`
Expected: FAIL — module not found.

---

### Task 14: Implement `buildMetadata`

**Files:**
- Create: `lib/server/buildMetadata.ts`

**Step 1: Port the logic from App.getSeoData()**

```ts
import type { Metadata } from 'next';
// @ts-expect-error JS module without types
import { buildRoute } from '../../src/routing/routeCodec';

type State = {
  structure: string;
  outline: string;
  version: string;
  chapter: number;
  verse: number;
  selected_tag: string | null;
  showcase_tag: string | null;
  searchQuery: string | null;
  hebrewStrongIndex: number | null;
  commentaryMode: boolean;
  commentarySource: string | null;
  commentaryID: string | null;
};

export function buildMetadata(state: State, data: any, origin: string): Metadata {
  const baseTitle = `Isaiah ${state.chapter}:${state.verse}`;
  let title = `${baseTitle} | Isaiah Explorer`;
  let description = `Read Isaiah ${state.chapter}:${state.verse} in multiple translations with thematic tags, Hebrew lexicon, and scholarly commentary.`;

  const activeTag = state.showcase_tag || state.selected_tag;
  const tagEntry = activeTag ? data?.tags?.tagIndex?.[activeTag] : null;

  if (activeTag && tagEntry) {
    title = `${activeTag} | ${baseTitle}`;
    description = `Explore the theme "${activeTag}" in Isaiah.`;
  } else if (state.searchQuery && !state.hebrewStrongIndex) {
    title = `"${state.searchQuery}" | Isaiah Explorer`;
    description = `Isaiah Explorer search results for "${state.searchQuery}".`;
  } else if (state.hebrewStrongIndex) {
    title = `Hebrew H${state.hebrewStrongIndex} | Isaiah Explorer`;
    description = `Study Hebrew word H${state.hebrewStrongIndex} in Isaiah.`;
  } else if (state.commentaryMode && state.commentarySource) {
    const sourceName = data?.commentary?.comSources?.[state.commentarySource]?.name;
    if (sourceName) {
      title = `${baseTitle} | ${sourceName}`;
      description = `${sourceName} commentary on Isaiah ${state.chapter}:${state.verse}.`;
    }
  }

  const getTagSlug = (tagName: string): string | null => {
    const entry = data?.tags?.tagIndex?.[tagName];
    return entry ? entry.slug : null;
  };

  const path = buildRoute(state, getTagSlug);
  const canonical = origin + path;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'article',
      siteName: 'Isaiah Explorer',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}
```

**Step 2: Run tests**

Run: `npx jest lib/server/__tests__/buildMetadata.test.ts`
Expected: all 7 tests PASS.

**Step 3: Commit**

```bash
git add lib/server/buildMetadata.ts lib/server/__tests__/buildMetadata.test.ts
git commit -m "feat(server): buildMetadata ports getSeoData with OG/Twitter tags"
```

---

### Task 15: Write tests for `routeFromParams` (URL params → state)

**Files:**
- Create: `lib/server/__tests__/routeFromParams.test.ts`

**Step 1: Write tests**

```ts
import { routeFromParams } from '../routeFromParams';

describe('routeFromParams', () => {
  test('empty slug returns default state', () => {
    const s = routeFromParams(undefined);
    expect(s.chapter).toBe(1);
    expect(s.verse).toBe(1);
  });

  test('canonical /whole/chapters/iinst/5/4', () => {
    const s = routeFromParams(['whole', 'chapters', 'iinst', '5', '4']);
    expect(s.structure).toBe('whole');
    expect(s.outline).toBe('chapters');
    expect(s.version).toBe('IINST');
    expect(s.chapter).toBe(5);
    expect(s.verse).toBe(4);
  });

  test('with tag modifier', () => {
    const s = routeFromParams(['whole', 'chapters', 'iinst', 'tag.suffering-servant', '5', '4']);
    expect(s.tagSlug).toBe('suffering-servant');
  });

  test('with commentary', () => {
    const s = routeFromParams(['whole', 'chapters', 'iinst', '5', '4', 'commentary.barnes']);
    expect(s.commentaryMode).toBe(true);
    expect(s.commentarySource).toBe('barnes');
  });
});
```

**Step 2: Run test to verify failure**

Run: `npx jest lib/server/__tests__/routeFromParams.test.ts`
Expected: FAIL — module not found.

---

### Task 16: Implement `routeFromParams`

**Files:**
- Create: `lib/server/routeFromParams.ts`

**Step 1: Implement**

```ts
// @ts-expect-error JS module without types
import { parseRoute } from '../../src/routing/routeCodec';

export type RouteState = {
  structure: string;
  outline: string;
  version: string;
  chapter: number;
  verse: number;
  tagSlug: string | null;
  searchQuery: string | null;
  hebrewStrongIndex: number | null;
  commentaryMode: boolean;
  commentarySource: string | null;
  commentaryID: string | null;
};

const DEFAULT_STRUCTURE = 'whole';
const DEFAULT_OUTLINE = 'chapters';
const DEFAULT_VERSION = 'IINST';

export function routeFromParams(slug: string[] | undefined): RouteState {
  const path = slug && slug.length > 0 ? '/' + slug.join('/') : '/';
  const parsed = parseRoute(path);

  return {
    structure: parsed.structure ?? DEFAULT_STRUCTURE,
    outline: parsed.outline ?? DEFAULT_OUTLINE,
    version: parsed.version ?? DEFAULT_VERSION,
    chapter: parsed.chapter ?? 1,
    verse: parsed.verse ?? 1,
    tagSlug: parsed.tag ?? null,
    searchQuery: parsed.search ?? null,
    hebrewStrongIndex: parsed.hebrew ?? null,
    commentaryMode: parsed.commentarySource !== undefined,
    commentarySource: parsed.commentarySource ?? null,
    commentaryID: parsed.commentaryID ?? null,
  };
}
```

**Step 2: Run tests**

Run: `npx jest lib/server/__tests__/routeFromParams.test.ts`
Expected: all 4 PASS.

**Step 3: Commit**

```bash
git add lib/server/routeFromParams.ts lib/server/__tests__/routeFromParams.test.ts
git commit -m "feat(server): routeFromParams maps Next.js slug to RouteState"
```

---

### Task 17: Implement slug → tag-name resolution helper

**Files:**
- Create: `lib/server/resolveTag.ts`
- Create: `lib/server/__tests__/resolveTag.test.ts`

**Step 1: Write test**

```ts
import { resolveTagFromSlug } from '../resolveTag';

const data: any = {
  tags: { tagIndex: {
    'Suffering Servant': { slug: 'suffering-servant' },
    'Creation': { slug: 'creation' },
  }},
};

test('resolves known slug', () => {
  expect(resolveTagFromSlug('suffering-servant', data)).toBe('Suffering Servant');
});

test('returns null for unknown slug', () => {
  expect(resolveTagFromSlug('does-not-exist', data)).toBeNull();
});

test('returns null when no slug given', () => {
  expect(resolveTagFromSlug(null, data)).toBeNull();
});
```

**Step 2: Run test to verify failure**

Run: `npx jest lib/server/__tests__/resolveTag.test.ts`
Expected: FAIL.

**Step 3: Implement**

```ts
export function resolveTagFromSlug(slug: string | null, data: any): string | null {
  if (!slug || !data?.tags?.tagIndex) return null;
  for (const tagName of Object.keys(data.tags.tagIndex)) {
    if (data.tags.tagIndex[tagName].slug === slug) return tagName;
  }
  return null;
}
```

**Step 4: Run test to verify pass**

Run: `npx jest lib/server/__tests__/resolveTag.test.ts`
Expected: 3 PASS.

**Step 5: Commit**

```bash
git add lib/server/resolveTag.ts lib/server/__tests__/resolveTag.test.ts
git commit -m "feat(server): resolveTagFromSlug helper"
```

---

## Phase 4: Catch-all page + client shell

Wire the catch-all route to call `generateMetadata` and render the existing App.js inside a `'use client'` boundary.

---

### Task 18: Delete the stub `app/page.tsx`

**Files:**
- Delete: `app/page.tsx`

**Step 1: Remove the stub** (it would shadow the catch-all otherwise — though Next.js does allow them to coexist, deleting prevents confusion)

```bash
rm app/page.tsx
```

**Step 2: Commit**

```bash
git add -A
git commit -m "chore(next): remove stub homepage in favor of catch-all"
```

---

### Task 19: Create the catch-all route with `generateMetadata`

**Files:**
- Create: `app/[[...slug]]/page.tsx`

**Step 1: Write the page**

```tsx
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { loadGlobalData } from '../../lib/server/dataCache';
import { routeFromParams } from '../../lib/server/routeFromParams';
import { resolveTagFromSlug } from '../../lib/server/resolveTag';
import { buildMetadata } from '../../lib/server/buildMetadata';
import AppClient from './AppClient';

type Props = { params: { slug?: string[] } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await loadGlobalData();
  const route = routeFromParams(params.slug);

  const tagName = resolveTagFromSlug(route.tagSlug, data);

  const h = headers();
  const host = h.get('host') ?? 'isaiah.scripture.guide';
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const origin = `${proto}://${host}`;

  return buildMetadata({
    ...route,
    selected_tag: tagName,
    showcase_tag: null,
  }, data, origin);
}

export default function Page() {
  return <AppClient />;
}
```

**Step 2: Commit (compile is verified in next task)**

```bash
git add app/[[...slug]]/page.tsx
git commit -m "feat(next): catch-all route with generateMetadata"
```

---

### Task 20: Create the `'use client'` shell that hosts App.js

**Files:**
- Create: `app/[[...slug]]/AppClient.tsx`

**Step 1: Write the shell**

```tsx
'use client';

import dynamic from 'next/dynamic';

// Dynamic import with ssr:false — App.js uses window/document directly in many places.
const App = dynamic(() => import('../../src/App.js').then(m => m.default), {
  ssr: false,
});

export default function AppClient() {
  return <App />;
}
```

**Step 2: Run dev server**

Run: `npm run dev:next`
Open: `http://localhost:3001`
Expected: App.js bootstraps and renders Isaiah Explorer. Console may have warnings about react-router-dom (which still wraps App in src/index.js but isn't reachable from Next.js); that's fine for now.

**Step 3: Check view-source for metadata**

Run: `curl -s http://localhost:3001 | grep -E "<title>|<meta"`
Expected: `<title>Isaiah 1:1 | Isaiah Explorer</title>` and og/twitter meta tags appear in the initial HTML.

**Step 4: Commit**

```bash
git add app/[[...slug]]/AppClient.tsx
git commit -m "feat(next): AppClient dynamically imports App.js with ssr:false"
```

---

### Task 21: Verify all 13 canonical permutations produce expected metadata

**Files:** none (exploratory verification)

**Step 1: Curl each permutation and grep for title**

```bash
for path in \
  "/whole/chapters/iinst/5/4" \
  "/whole/chapters/iinst/tag.suffering-servant/5/4" \
  "/whole/chapters/iinst/search.comfort+my+people/40/3" \
  "/whole/chapters/iinst/hebrew.2490/53/5" \
  "/whole/chapters/iinst/5/4/commentary.barnes" \
  "/whole/chapters/iinst/5/4/commentary.barnes/123" \
  "/whole/chapters/iinst/tag.suffering-servant/5/4/commentary.barnes/9" \
  "/whole/chapters/iinst/search.holy+one/5/4/commentary.barnes" \
  "/whole/chapters/iinst/hebrew.6918/5/4/commentary.barnes/9"; do
  echo "=== $path ==="
  curl -s "http://localhost:3001$path" | grep -oE "<title>[^<]+</title>"
done
```

Expected: each URL produces a distinct, meaningful title.

**Step 2: Spot-check OG tags for one URL**

Run: `curl -s http://localhost:3001/whole/chapters/iinst/5/4/commentary.barnes | grep -E "og:|twitter:"`
Expected: `og:title`, `og:description`, `og:url`, `og:type=article`, `twitter:card`, `twitter:title` all present.

No commit (verification step).

---

## Phase 5: Router shim — replace react-router-dom

App.js uses `this.props.navigate` and `this.props.location.pathname` injected by `withRouter`. Rewrite `withRouter` to provide these from `next/navigation`, then delete react-router-dom usage.

---

### Task 22: Write failing test for the new `withRouter` shim

**Files:**
- Create: `src/routing/__tests__/withRouter.test.js`

**Step 1: Write the test**

```js
import React from 'react';
import { render } from '@testing-library/react';
import { withRouter } from '../withRouter';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/whole/chapters/iinst/5/4',
}));

class TestComponent extends React.Component {
  render() {
    return (
      <div data-testid="path">{this.props.location.pathname}</div>
    );
  }
}

const Wrapped = withRouter(TestComponent);

test('injects location.pathname', () => {
  const { getByTestId } = render(<Wrapped />);
  expect(getByTestId('path').textContent).toBe('/whole/chapters/iinst/5/4');
});

test('injects navigate as a function', () => {
  let navRef;
  class Capture extends React.Component {
    componentDidMount() { navRef = this.props.navigate; }
    render() { return null; }
  }
  const W = withRouter(Capture);
  render(<W />);
  expect(typeof navRef).toBe('function');
});
```

**Step 2: Install testing-library if missing**

Run: `npm ls @testing-library/react 2>&1 | head -3`
If not present: `npm install --save-dev @testing-library/react@^14`

**Step 3: Run test to verify failure**

Run: `npx jest src/routing/__tests__/withRouter.test.js`
Expected: FAIL — old `withRouter` imports from `react-router-dom`, mock doesn't match.

---

### Task 23: Rewrite `withRouter.js` to use `next/navigation`

**Files:**
- Modify: `src/routing/withRouter.js`

**Step 1: Replace the implementation**

```js
/**
 * withRouter HOC — injects navigate and location into class components.
 *
 * Sources `navigate` and `location.pathname` from Next.js `next/navigation`.
 * `navigate(path, { replace })` semantics:
 *   - replace: true  → window.history.replaceState (no metadata refetch)
 *   - replace: false → router.push (Next.js refetches metadata)
 * The `replace:true` branch is used by App.setUrl() for high-frequency
 * scroll-driven URL updates that must not trigger a server round-trip.
 */
import React from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function withRouter(Component) {
  function Wrapper(props) {
    const router = useRouter();
    const pathname = usePathname();

    const navigate = React.useCallback((path, opts) => {
      const replace = opts && opts.replace === true;
      if (replace) {
        window.history.replaceState({}, '', path);
      } else {
        router.push(path);
      }
    }, [router]);

    const location = { pathname };

    return React.createElement(Component, Object.assign({}, props, { navigate, location }));
  }
  Wrapper.displayName = 'withRouter(' + (Component.displayName || Component.name || 'Component') + ')';
  return Wrapper;
}
```

**Step 2: Run the new test**

Run: `npx jest src/routing/__tests__/withRouter.test.js`
Expected: both tests PASS.

**Step 3: Commit**

```bash
git add src/routing/withRouter.js src/routing/__tests__/withRouter.test.js
git commit -m "refactor(routing): withRouter shim uses next/navigation"
```

---

### Task 24: Delete `RouterShell.js`

**Files:**
- Delete: `src/routing/RouterShell.js`

**Step 1: Verify nothing imports it**

Run: `grep -rn "RouterShell" /Users/kckern/Documents/GitHub/IsaiahExplorer/src /Users/kckern/Documents/GitHub/IsaiahExplorer/app 2>/dev/null`
Expected: only the file itself and possibly `src/index.js`.

**Step 2: Delete**

```bash
rm src/routing/RouterShell.js
```

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor(routing): remove RouterShell (Next.js owns routing now)"
```

---

### Task 25: Update `src/index.js` to be CRA-only (no Router)

**Files:**
- Modify: `src/index.js`

**Step 1: Read the current content**

Run: `cat src/index.js`

**Step 2: Replace to render App directly (CRA still needs this until Phase 11)**

```js
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App.js';
import { withRouter } from './routing/withRouter.js';

const AppWithRouter = withRouter(App);

// CRA-only entry point.
// Note: Once we're fully on Next.js (Phase 11), this file is deleted.
ReactDOM.render(<AppWithRouter />, document.getElementById('root'));
```

**Step 3: Verify CRA still boots**

Run: `npm start`
Open: `http://localhost:3000`
Expected: app renders. There will be a React error because `next/navigation` doesn't work outside Next.js — this is expected. We'll either accept CRA is broken during the rest of the migration, or skip Task 25 entirely and let CRA stay broken from this point.

**Decision point:** if CRA breakage is unacceptable, stop here and convert all remaining tasks to require Next.js dev server. Otherwise continue. (Recommended: accept CRA is broken — Phase 11 deletes it anyway.)

**Step 4: Commit**

```bash
git add src/index.js
git commit -m "refactor(index): drop react-router-dom from CRA entry (CRA broken from here until removal)"
```

---

### Task 26: Verify Next.js dev still works after shim change

**Files:** none

**Step 1: Run Next.js dev**

Run: `npm run dev:next`
Open: `http://localhost:3001/whole/chapters/iinst/5/4`
Expected: app renders normally.

**Step 2: Test in-app navigation**

Click around (change chapter/verse, open a tag, open commentary). Watch the URL bar — should update via `replaceState` for scroll/high-freq and `router.push` for clicks.

**Step 3: Verify scroll updates don't cause server round-trips**

Open DevTools Network tab, filter to "Doc". Scroll the verse list. Expected: no new document requests fire (because `replaceState` bypasses Next.js routing).

No commit (smoke verification).

---

## Phase 6: Legacy redirects (middleware)

Port the two `<Navigate>` redirects from RouterShell to Next.js middleware.

---

### Task 27: Write tests for redirect rules

**Files:**
- Create: `__tests__/middleware.test.ts`

**Step 1: Write tests**

```ts
import { NextRequest } from 'next/server';
import { middleware } from '../middleware';

function makeRequest(path: string): NextRequest {
  return new NextRequest(new URL(`https://x${path}`));
}

test('/search/foo redirects to /search.foo', async () => {
  const res = await middleware(makeRequest('/search/comfort+my+people'));
  expect(res?.status).toBe(307);
  expect(res?.headers.get('location')).toContain('/search.comfort+my+people');
});

test('/hebrew/2490 redirects to /hebrew.2490', async () => {
  const res = await middleware(makeRequest('/hebrew/2490'));
  expect(res?.status).toBe(307);
  expect(res?.headers.get('location')).toContain('/hebrew.2490');
});

test('canonical /whole/chapters/iinst/5/4 passes through', async () => {
  const res = await middleware(makeRequest('/whole/chapters/iinst/5/4'));
  // NextResponse.next() returns undefined status when not redirecting
  expect(res?.status === 200 || res === undefined).toBe(true);
});
```

**Step 2: Run test to verify failure**

Run: `npx jest __tests__/middleware.test.ts`
Expected: FAIL — middleware.ts doesn't exist yet.

---

### Task 28: Implement `middleware.ts`

**Files:**
- Create: `middleware.ts`

**Step 1: Write it**

```ts
import { NextRequest, NextResponse } from 'next/server';

const SEARCH_LEGACY = /^\/search\/(.+)$/;
const HEBREW_LEGACY = /^\/hebrew\/(\d+)$/;

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  const searchMatch = SEARCH_LEGACY.exec(path);
  if (searchMatch) {
    const url = req.nextUrl.clone();
    url.pathname = `/search.${searchMatch[1]}`;
    return NextResponse.redirect(url, 307);
  }

  const hebrewMatch = HEBREW_LEGACY.exec(path);
  if (hebrewMatch) {
    const url = req.nextUrl.clone();
    url.pathname = `/hebrew.${hebrewMatch[1]}`;
    return NextResponse.redirect(url, 307);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/search/:path*', '/hebrew/:path*'],
};
```

**Step 2: Run tests**

Run: `npx jest __tests__/middleware.test.ts`
Expected: all 3 PASS.

**Step 3: End-to-end check**

Run: `npm run dev:next`
Run: `curl -I http://localhost:3001/search/comfort+my+people`
Expected: `HTTP/1.1 307` with `Location: /search.comfort+my+people`.

**Step 4: Commit**

```bash
git add middleware.ts __tests__/middleware.test.ts
git commit -m "feat(next): middleware redirects legacy slash forms"
```

---

### Task 29: Note known issue — legacy targets aren't fully canonical

**Files:**
- Modify: `docs/reference/routing.md`

**Step 1: Add a note to the existing reference doc**

In section 5.1 "Redirect interaction", append a note:

```markdown

**Status as of 2026-05-13:** Migrated to Next.js middleware (`middleware.ts`). The known issue persists: the redirect targets `/search.<query>` and `/hebrew.<strong>` are not valid canonical URLs without an SoV prefix, so they will fall through to default state when parsed. This was the behavior under react-router too. A future task should redirect to a full canonical URL with default SoV instead.
```

**Step 2: Commit**

```bash
git add docs/reference/routing.md
git commit -m "docs(routing): note middleware migration + persistent redirect quirk"
```

---

## Phase 7: Subsite handling via `Host` header

The current app reads `window.location.host` to determine subsite. On the server, read the `Host` header in `generateMetadata`.

---

### Task 30: Write a test for `subsiteFromHost`

**Files:**
- Create: `lib/server/__tests__/subsite.test.ts`

**Step 1: Write tests**

```ts
import { subsiteFromHost } from '../subsite';

test('isaiah.scripture.guide → default', () => {
  expect(subsiteFromHost('isaiah.scripture.guide')).toBe('default');
});

test('dev.isaiah.scripture.guide → dev', () => {
  expect(subsiteFromHost('dev.isaiah.scripture.guide')).toBe('dev');
});

test('localhost → default', () => {
  expect(subsiteFromHost('localhost:3001')).toBe('default');
});

test('null/empty → default', () => {
  expect(subsiteFromHost(null)).toBe('default');
  expect(subsiteFromHost('')).toBe('default');
});
```

**Step 2: Run test to verify failure**

Run: `npx jest lib/server/__tests__/subsite.test.ts`
Expected: FAIL.

---

### Task 31: Implement `subsiteFromHost`

**Files:**
- Create: `lib/server/subsite.ts`

**Step 1: Implement**

```ts
export function subsiteFromHost(host: string | null | undefined): string {
  if (!host) return 'default';
  const match = host.match(/^(.*?)\.isaiah/);
  return match ? match[1] : 'default';
}
```

**Step 2: Run test**

Run: `npx jest lib/server/__tests__/subsite.test.ts`
Expected: 4 PASS.

**Step 3: Commit**

```bash
git add lib/server/subsite.ts lib/server/__tests__/subsite.test.ts
git commit -m "feat(server): subsiteFromHost extraction"
```

---

### Task 32: Apply subsite filtering to `loadGlobalData`

**Files:**
- Modify: `lib/server/dataCache.ts`
- Create: `lib/server/applySubsite.ts`
- Create: `lib/server/__tests__/applySubsite.test.ts`

**Step 1: Write test for `applySubsite`**

```ts
import { applySubsite } from '../applySubsite';

const baseData = (): any => ({
  meta: { commentary: { barnes: {}, gileadi: {}, henry: {} } },
  custom: {
    dev: { type: 'blacklist', com: ['henry'] },
  },
});

test('default subsite: unchanged', () => {
  const d = baseData();
  const out = applySubsite(d, 'default');
  expect(out.meta.commentary).toEqual({ barnes: {}, gileadi: {}, henry: {} });
});

test('dev subsite: henry removed', () => {
  const d = baseData();
  const out = applySubsite(d, 'dev');
  expect(out.meta.commentary.henry).toBeUndefined();
  expect(out.meta.commentary.barnes).toBeDefined();
});
```

**Step 2: Run test to verify failure**

Run: `npx jest lib/server/__tests__/applySubsite.test.ts`
Expected: FAIL.

**Step 3: Implement `applySubsite`**

```ts
export function applySubsite(data: any, subsite: string): any {
  if (subsite === 'default') return data;
  const custom = data?.custom?.[subsite];
  if (!custom || custom.type !== 'blacklist') return data;

  // Deep-ish clone the affected slices only.
  const out = { ...data, meta: { ...data.meta, commentary: { ...data.meta.commentary } } };

  if (Array.isArray(custom.com)) {
    for (const code of custom.com) {
      delete out.meta.commentary[code];
    }
  }
  // Future: handle other blacklist categories (versions, tags) as needed.
  return out;
}
```

**Step 4: Run test**

Run: `npx jest lib/server/__tests__/applySubsite.test.ts`
Expected: 2 PASS.

**Step 5: Commit**

```bash
git add lib/server/applySubsite.ts lib/server/__tests__/applySubsite.test.ts
git commit -m "feat(server): applySubsite for runtime Host-based customization"
```

---

### Task 33: Wire subsite into the catch-all `generateMetadata`

**Files:**
- Modify: `app/[[...slug]]/page.tsx`

**Step 1: Update `generateMetadata` to apply subsite**

Replace the `generateMetadata` body with:

```tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const fullData = await loadGlobalData();
  const route = routeFromParams(params.slug);

  const h = headers();
  const host = h.get('host') ?? 'isaiah.scripture.guide';
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const origin = `${proto}://${host}`;

  const subsite = subsiteFromHost(host);
  const data = applySubsite(fullData, subsite);

  const tagName = resolveTagFromSlug(route.tagSlug, data);

  return buildMetadata({
    ...route,
    selected_tag: tagName,
    showcase_tag: null,
  }, data, origin);
}
```

Add the imports:
```tsx
import { subsiteFromHost } from '../../lib/server/subsite';
import { applySubsite } from '../../lib/server/applySubsite';
```

**Step 2: Smoke test with a fake Host header**

Run: `npm run dev:next`
Run: `curl -s -H "Host: dev.isaiah.scripture.guide" http://localhost:3001/whole/chapters/iinst/5/4/commentary.henry | grep -oE "<title>[^<]+</title>"`

Expected: if `henry` is blacklisted for `dev`, the commentary source falls back to the first key of remaining commentary — different from what the same URL produces under the default Host.

**Step 3: Commit**

```bash
git add app/[[...slug]]/page.tsx
git commit -m "feat(next): subsite filtering applied via Host header in generateMetadata"
```

---

## Phase 8: Image import migration (mechanical)

Next.js's webpack returns `StaticImageData` objects for image imports, not URL strings. Components that do `<img src={tag_png}>` will break. This phase audits and fixes all such imports.

---

### Task 34: Inventory all image imports in `src/`

**Files:** none (discovery)

**Step 1: Find all image imports**

Run:
```bash
grep -rnE "import .* from .*\.(png|jpg|jpeg|svg|gif|webp)" src/ --include="*.js" --include="*.jsx" > /tmp/img-imports.txt
wc -l /tmp/img-imports.txt
cat /tmp/img-imports.txt
```

Expected: a list of all image import statements. Count gives the upper bound on edits needed.

**Step 2: For each imported symbol, find usages**

```bash
for sym in $(awk -F'import ' '{print $2}' /tmp/img-imports.txt | awk '{print $1}' | sort -u); do
  echo "=== $sym ==="
  grep -rn "{$sym}" src/ --include="*.js" --include="*.jsx" | head -5
done
```

No commit (inventory step).

---

### Task 35: Update one image import (sanity check)

**Files:**
- Modify: one component file containing an image import (e.g. `src/Components/Tags.js`)

**Step 1: Pick the simplest image-using component**

Pick `src/Components/Tags.js` (line 7: `import tag_png from '../img/interface/tag.png'`).

**Step 2: Run the Next.js dev server and observe the broken render**

Run: `npm run dev:next` and open the app.

If the tag icon is broken (renders as `[object Object]` or empty), proceed. If it renders correctly, Next.js may be handling it transparently — investigate before continuing.

**Step 3: Update the usage to use `.src`**

Find every `<img src={tag_png}>` in `src/Components/Tags.js` and change to `<img src={tag_png.src}>`.

**Step 4: Reload the dev server and verify**

Expected: tag icon renders.

**Step 5: Commit**

```bash
git add src/Components/Tags.js
git commit -m "fix(img): use .src for Next.js StaticImageData (Tags.js)"
```

---

### Task 36: Sweep all remaining image imports

**Files:**
- Modify: every file listed in Task 34's inventory

**Step 1: Apply the same `.src` transform**

For each file in the inventory, find all JSX usages of imported image symbols and add `.src`. Specifically:

- `<img src={X}>` → `<img src={X.src}>`
- `backgroundImage: \`url(${X})\`` → `backgroundImage: \`url(${X.src})\``
- Pass-through props like `image={X}` → handle case-by-case (depends on consumer)

**Step 2: Smoke test the running app**

Run: `npm run dev:next`. Click through every major UI surface (tags panel, commentary view, search, hebrew). Any missing/broken images point to a missed update.

**Step 3: Commit per logical group**

Commit components in groups of 3-5 files. Suggested grouping:
- `Components/Verse.js`, `Components/Section.js`, `Components/Structure.js`
- `Components/Search.js`, `Components/Commentary.js`, `Components/AudioToolbar.js`
- Remaining

For each group:
```bash
git add <files>
git commit -m "fix(img): use .src for StaticImageData (<group>)"
```

---

## Phase 9: SEO smoke tests

End-to-end verification that the SSR output meets the migration's stated goal.

---

### Task 37: Install Playwright

**Files:**
- Modify: `package.json`

**Step 1: Install**

Run: `npm install --save-dev @playwright/test`
Run: `npx playwright install --with-deps chromium`

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(test): add Playwright for SSR smoke tests"
```

---

### Task 38: Add Playwright config

**Files:**
- Create: `playwright.config.ts`

**Step 1: Write config**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests-e2e',
  timeout: 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3001',
  },
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: 'npm run start:next',
    port: 3001,
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
  },
});
```

**Step 2: Commit**

```bash
git add playwright.config.ts
git commit -m "feat(test): playwright config with auto-launched start:next"
```

---

### Task 39: Write SSR meta-tag smoke test for all 13 permutations

**Files:**
- Create: `tests-e2e/seo.spec.ts`

**Step 1: Write the test**

```ts
import { test, expect } from '@playwright/test';

const URLS: Array<{ path: string; titleContains: string; }> = [
  { path: '/whole/chapters/iinst/5/4',                                   titleContains: 'Isaiah 5:4' },
  { path: '/whole/chapters/iinst/tag.suffering-servant/5/4',             titleContains: 'Suffering Servant' },
  { path: '/whole/chapters/iinst/search.comfort+my+people/40/3',         titleContains: 'comfort my people' },
  { path: '/whole/chapters/iinst/hebrew.2490/53/5',                      titleContains: 'Hebrew H2490' },
  { path: '/whole/chapters/iinst/5/4/commentary.barnes',                 titleContains: 'Barnes' },
  { path: '/whole/chapters/iinst/5/4/commentary.barnes/123',             titleContains: 'Barnes' },
  { path: '/whole/chapters/iinst/tag.suffering-servant/5/4/commentary.barnes', titleContains: 'Suffering Servant' },
];

for (const { path, titleContains } of URLS) {
  test(`SSR title contains "${titleContains}" for ${path}`, async ({ request }) => {
    const res = await request.get(path);
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).toContain('<title>');
    const titleMatch = html.match(/<title>([^<]*)<\/title>/);
    expect(titleMatch?.[1]).toContain(titleContains);
  });

  test(`SSR includes og:title for ${path}`, async ({ request }) => {
    const res = await request.get(path);
    const html = await res.text();
    expect(html).toMatch(/<meta\s+property="og:title"/);
    expect(html).toMatch(/<meta\s+property="og:description"/);
    expect(html).toMatch(/<meta\s+property="og:url"/);
  });

  test(`SSR includes canonical link for ${path}`, async ({ request }) => {
    const res = await request.get(path);
    const html = await res.text();
    expect(html).toMatch(/<link\s+rel="canonical"/);
  });
}

test('legacy /search/foo redirects to /search.foo', async ({ request }) => {
  const res = await request.get('/search/comfort+my+people', { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  expect(res.headers().location).toContain('/search.comfort+my+people');
});
```

**Step 2: Run the test**

Run: `npx playwright test`
Expected: all tests PASS. Total ~22 tests (7 URLs × 3 assertions + 1 redirect).

**Step 3: Commit**

```bash
git add tests-e2e/seo.spec.ts
git commit -m "test(e2e): SSR meta-tag smoke for all 13 URL permutations"
```

---

## Phase 10: AWS Amplify deployment

Configure Amplify to deploy the Next.js app with SSR (Web Compute platform).

---

### Task 40: Create `amplify.yml` build spec

**Files:**
- Create: `amplify.yml`

**Step 1: Write the build spec**

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build:next
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

**Step 2: Commit**

```bash
git add amplify.yml
git commit -m "feat(amplify): build spec for Next.js SSR"
```

---

### Task 41: Document Amplify console settings (manual)

**Files:**
- Create: `docs/reference/amplify-setup.md`

**Step 1: Document the one-time manual setup**

```markdown
# Amplify Setup — Next.js SSR

These steps are performed in the AWS Amplify console; they cannot be checked in.

## App settings

1. Connect this repo's branch (e.g. `master`).
2. Build settings: Amplify auto-detects Next.js. Confirm the build image is `Amazon Linux 2023` (Node 18+).
3. **Platform: `Web Compute` (not `Web`)** — required for SSR. Found under App settings → General → Platform.
4. Branch settings: enable `Live updates` for hot deploys.

## Environment variables

Set in App settings → Environment variables:

| Variable | Value | Notes |
|---|---|---|
| `_LIVE_UPDATES` | (auto) | Amplify-managed |
| `NEXT_PUBLIC_*` | (per environment) | Add any client-side env vars needed |

## Custom domains

1. Domain management → Add domain.
2. Add the apex (`isaiah.scripture.guide`) and any subsite subdomains (`dev.isaiah.scripture.guide` etc.) as alternate domain names mapped to the same app.
3. SSL via Amplify's ACM integration.

## Branch previews

Each branch gets a preview URL automatically. Verify a preview deploy before merging to `master`.
```

**Step 2: Commit**

```bash
git add docs/reference/amplify-setup.md
git commit -m "docs(amplify): one-time console setup checklist"
```

---

### Task 42: First production build sanity check

**Files:** none

**Step 1: Build locally**

Run: `npm run build:next`
Expected: `✓ Compiled successfully`. Watch for warnings about `'use client'` boundaries, async/await in server components, or unused imports.

**Step 2: Run production server locally**

Run: `npm run start:next`
Open: `http://localhost:3001`
Expected: app renders. Check `view-source:` to confirm metadata is server-rendered (not just client-side via react-helmet).

**Step 3: Run the SEO test against the production server**

Run: `npx playwright test`
Expected: all PASS.

No commit (verification step).

---

### Task 43: Deploy to a preview branch on Amplify

**Files:** none (manual)

**Step 1: Create a deploy branch**

```bash
git checkout -b deploy-next-preview
git push -u origin deploy-next-preview
```

**Step 2: In Amplify console**

Connect the `deploy-next-preview` branch. Wait for build (~5-10 min).

**Step 3: Verify the preview URL**

Run the SEO Playwright suite against the preview URL:

```bash
E2E_BASE_URL=https://deploy-next-preview.<amplify-id>.amplifyapp.com npx playwright test
```

Expected: all PASS.

**Step 4: Verify Facebook / Twitter / iMessage cards**

Use https://developers.facebook.com/tools/debug/ and https://cards-dev.twitter.com/validator to test a representative URL. Expected: OG card renders with correct title, description, and (eventually) image.

No commit. Document any issues found as new tasks.

---

## Phase 11: Cutover & cleanup

Remove CRA, Electron, react-router-dom, react-helmet, and dev-only legacy deps. After this phase, the repo is Next.js-only.

---

### Task 44: Remove `react-helmet` calls in components

**Files:**
- Audit: all `src/**/*.js` files

**Step 1: Find all `<Helmet>` usages**

Run: `grep -rn "Helmet\|react-helmet" src/ --include="*.js" --include="*.jsx"`

**Step 2: For each, decide:**

- If the Helmet content is duplicated by `generateMetadata` server-side, **delete the Helmet block**. Next.js metadata supersedes it on initial render, and Next.js updates `<head>` on soft navigation automatically via its metadata API.
- If the Helmet content is client-only dynamic (e.g. updates on hover state), leave it as a client-side enhancement — Next.js metadata won't fight it, but they may produce duplicate tags. Reconcile case-by-case.

**Step 3: Remove `react-helmet` import lines from files where all Helmet usage was removed.**

**Step 4: Commit per file or group**

```bash
git add <files>
git commit -m "refactor: drop react-helmet (Next.js metadata supersedes)"
```

---

### Task 45: Remove `react-router-dom` and `src/index.js`

**Files:**
- Delete: `src/index.js`
- Delete: `src/routing/RouterShell.js` (if not already gone)
- Modify: `package.json`

**Step 1: Verify nothing else imports from react-router-dom**

Run: `grep -rn "react-router-dom" src/ --include="*.js" --include="*.jsx"`
Expected: only files we're about to delete or already deleted.

**Step 2: Delete the CRA entry point**

```bash
rm src/index.js
```

**Step 3: Uninstall react-router-dom**

Run: `npm uninstall react-router-dom`

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove react-router-dom and CRA entry point"
```

---

### Task 46: Remove Electron-related files and deps

**Files:**
- Delete: `public/electron.js` (if exists)
- Modify: `package.json`

**Step 1: Find Electron files**

Run: `find public src -name "electron*" -o -name "*.electron.*" 2>/dev/null`

**Step 2: Delete them**

Run: `rm public/electron.js` (if it exists; verify path first).

**Step 3: Remove `is-electron` import from App.js if present**

Run: `grep -n "is-electron" src/App.js`
Expected: no matches (we replaced index.js already).

If there are any remaining `is-electron` usages in `src/`, replace them with `false` constants (we're web-only now) and delete the import.

**Step 4: Uninstall Electron deps**

Run:
```bash
npm uninstall electron electron-builder electron-is-dev is-electron concurrently wait-on
```

**Step 5: Remove Electron scripts from package.json**

Delete from the `"scripts"` object:
- `e-start`
- `e-dev`
- `e-build`
- `e-test`
- `e-pack`
- `postinstall`

Delete the top-level `"main"` field (it pointed at `public/electron.js`).

Delete the top-level `"build"` field (electron-builder config).

**Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove Electron build target and related deps"
```

---

### Task 47: Replace CRA scripts with Next.js scripts

**Files:**
- Modify: `package.json`

**Step 1: Replace the `"scripts"` block**

```json
"scripts": {
  "dev": "next dev --port 3000",
  "build": "next build",
  "start": "next start --port 3000",
  "lint": "next lint",
  "test": "jest",
  "test:e2e": "playwright test"
}
```

Remove the old:
- `"start": "node --openssl-legacy-provider node_modules/.bin/react-scripts start --port 3000"`
- `"build": "node --openssl-legacy-provider node_modules/.bin/react-scripts build"`
- The `"dev:next"`, `"build:next"`, `"start:next"`, `"lint:next"` (now promoted to canonical names)

**Step 2: Verify dev server**

Run: `npm run dev`
Open: `http://localhost:3000`
Expected: Next.js dev server, app renders normally.

**Step 3: Commit**

```bash
git add package.json
git commit -m "chore(scripts): canonicalize Next.js scripts; remove react-scripts"
```

---

### Task 48: Remove CRA build deps

**Files:**
- Modify: `package.json`

**Step 1: Uninstall**

Run:
```bash
npm uninstall react-scripts @rescripts/cli @rescripts/rescript-env babel-loader babel-plugin-transform-runtime babel-runtime
```

**Step 2: Verify tests and build still work**

Run: `npm test`
Run: `npm run build`

Expected: both succeed.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove CRA + rescripts + legacy babel deps"
```

---

### Task 49: Upgrade or remove other stale deps

**Files:**
- Modify: `package.json`

**Step 1: Audit suspicious version pins**

```bash
npm outdated
```

Watch for:
- `pako` (1.0.6 → latest)
- `react-tipsy`, `react-sortable-hoc`, `react-player`, `react-device-detect` — may be incompatible with React 18; smoke test each.
- `ajv`, `atob`, `jsoncomp`, `html-react-parser` — unlikely to break; leave unless they cause issues.

**Step 2: For each broken dep, decide upgrade or replace**

(This is exploratory; expect 1-3 small follow-up commits.)

**Step 3: Final smoke test**

Run: `npm run build && npm run start`
Run: `npm test && npx playwright test`
Expected: all green.

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): upgrade or replace React 18-incompatible packages"
```

---

### Task 50: Update `browserslist` and remove the legacy openssl flag

**Files:**
- Modify: `package.json`

**Step 1: Update browserslist**

Modern Next.js sets its own browser targets; keep `browserslist` as-is unless you want to narrow it. Verify it doesn't conflict with Next.js defaults:

```bash
npx next info
```

**Step 2: Confirm the `--openssl-legacy-provider` flag is gone**

Run: `grep -r "openssl-legacy-provider" package.json`
Expected: no matches.

**Step 3: Commit if anything changed**

```bash
git add package.json
git commit -m "chore: drop openssl-legacy-provider flag (no longer needed)"
```

---

## Phase 12: Production cutover

---

### Task 51: Merge to master

**Files:** none

**Step 1: Open PR from `deploy-next-preview` (or working branch) to `master`**

Use `gh pr create`. Title: `feat: migrate to Next.js SSR for SEO + social cards`.

**Step 2: Verify Amplify auto-deploys the master branch**

Watch the build in the Amplify console. ~5-10 min.

**Step 3: Run the SEO test suite against production**

```bash
E2E_BASE_URL=https://isaiah.scripture.guide npx playwright test
```

Expected: all PASS.

**Step 4: Validate social cards on the production domain**

Use Facebook debugger, Twitter validator, and a real iMessage test send.

No commit — this is the final verification.

---

### Task 52: Update reference docs to reflect Next.js architecture

**Files:**
- Modify: `docs/reference/routing.md`

**Step 1: Update section 1 ("Topology")**

Replace the React Router / RouterShell description with the Next.js App Router + middleware architecture. Mark the old layout as historical.

**Step 2: Update section 9 ("Implications for SSR / Next.js migration")**

Convert from forward-looking ("If you migrate...") to present-tense factual description of how it works now.

**Step 3: Commit**

```bash
git add docs/reference/routing.md
git commit -m "docs(routing): reflect Next.js architecture post-migration"
```

---

## Risks & open questions

These are deferred decisions or known unknowns the executor should surface if they hit them:

1. **`react-player`, `react-tipsy`, `react-sortable-hoc` may not support React 18.** If any throw on render, evaluate replacement before continuing (Task 49 owns this).

2. **App.js uses `componentWillMount` or other deprecated lifecycles.** Search-and-rename to `UNSAFE_componentWillMount` etc. as a stopgap. A future task can refactor properly.

3. **CSS imports in components.** Next.js supports CSS imports in client components and global CSS in `layout.tsx`. If a component's CSS doesn't apply, check whether it's imported under a `'use client'` boundary.

4. **`public/core/core.txt` size.** If the file is >10 MB, server cold starts may exceed the Lambda 15-second init limit. Mitigation: ship a smaller "SEO-only" index at build time and load the full file only on demand (Phase 2 alternative from brainstorming).

5. **Localhost subsite testing.** The hostname regex matches `<sub>.isaiah` — `localhost` returns `default`. Test subsite behavior using a `--hostname` flag or `/etc/hosts` entry like `127.0.0.1 dev.isaiah.localhost`.

6. **OG image.** Not addressed in this plan. The `twitter:card=summary_large_image` advertises an image but we ship no `og:image`. Add as a follow-up: generate a per-URL OG image with `/og-image/[slug]/route.ts` returning an SVG or use `@vercel/og`.

---

## Completion criteria

The migration is done when:

- [ ] `npm run dev`, `npm run build`, `npm start` all run Next.js (CRA gone)
- [ ] `npm test` (Jest) passes, including all new server-side tests
- [ ] `npx playwright test` passes against `http://localhost:3000`
- [ ] All 13 canonical URL permutations produce correct `<title>`, `<meta property="og:*">`, and `<link rel="canonical">` in the initial HTML response
- [ ] `/search/foo` and `/hebrew/123` legacy URLs redirect (307) to their inline-dot canonical forms
- [ ] Facebook debugger renders a correct preview card for a representative deep URL
- [ ] `package.json` contains no references to: `react-scripts`, `@rescripts/*`, `electron*`, `react-router-dom`, `react-helmet`, `concurrently`, `wait-on`, `--openssl-legacy-provider`
- [ ] `src/routing/RouterShell.js` and `src/index.js` are deleted
- [ ] Amplify production build is green on `master`
- [ ] `docs/reference/routing.md` reflects the post-migration architecture
