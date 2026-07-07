# Source-data pipeline

The Isaiah Explorer data corpus used to live in an external `Isaiah Database.xlsx`
spreadsheet plus a few database-export CSVs. This pipeline brings the
editorial content in-house as YAML, runs through a deterministic build
script, and emits the three runtime artifacts the app already reads.

```
import/                            scripts/                 source-data/                   public/core/
├── Isaiah Database.xlsx           ┌──────────────┐         ├── meta/                     ├── core.txt
├── word_highlights.csv  ────────▶ │ import.mjs   │ ──────▶ ├── structures/  ────────────▶ ├── meta.json
└── (CSV table dumps)              │ (one-time)   │         ├── outlines/                  └── tags_hl.txt
                                   └──────────────┘         ├── tags/                                ▲
                                                            │   ├── taxonomy.yml                     │
public/com/*.json (existing) ─────────────────────────▶     │   └── blocks/                ┌──────────────┐
                                                            ├── highlights/  ──────────────│ build.mjs    │
                                                            ├── commentary/                │ (operational)│
                                                            │   ├── sources.yml            └──────────────┘
                                                            │   ├── audio.yml
                                                            │   └── entries/<src>/<id>.json
                                                            └── custom.yml
```

`import/` and `source-data/` are **gitignored** while copyright review is
pending — the editorial commentary content lives in `source-data/commentary/
entries/`, away from the public repo.

The build script's exit criterion is **structural parity** with the current
runtime artifacts: same shape (object vs array), same key names, same value
types. Content drift (a corrected year on a commentary source, an updated
description, new tags) is expected and not a failure.

---

## Source-data layout (YAML, all gitignored)

```
source-data/
├── meta/
│   ├── structures.yml        # category=structure rows from XLSX Metadata
│   ├── outlines.yml          # category=outline rows
│   ├── versions.yml          # category=version rows
│   ├── commentaries.yml      # category=commentary rows
│   ├── audiocom.yml          # category=audiocom rows
│   └── nonseq.yml            # nonSeq sheet
├── structures/<slug>.yml     # one per structure (whole, 7part, …)
├── outlines/<slug>.yml       # one per outline (chapters, niv, mev, …)
├── tags/
│   ├── taxonomy.yml          # Taxonomy sheet — tag definitions w/ parent/cite/type
│   └── blocks/<slug>.yml     # one per tag — the per-block reference rows
├── highlights/<slug>.yml     # one per tag — { tag, sequences: {seq: [phrases]} }
├── commentary/
│   ├── sources.yml           # Commentary sheet — source-level metadata
│   ├── audio.yml             # commentary_audio.files — MP3 → verse_ids
│   └── entries/<shortcode>/<id>.json   # one per commentary entry (raw HTML)
└── custom.yml                # Custom sheet — subdomain rules
```

### Order is data

`meta/<category>.yml` files are objects keyed by shortcode. **Their key order
matters** — it's the iteration order the runtime ships. The import preserves
XLSX row order for those keys, and the build emits the runtime artifact in
exactly that order.

For commentary, `sources.yml` is an array, and its order is the runtime's
`commentary.comOrder`. Sources flagged `outline: YES` are excluded from
`comOrder` (and thus from `comSources` too) — they're reference works the
runtime doesn't list in the per-verse commentary picker.

---

## Build pipeline (`scripts/build.mjs`)

### Invocation

```
node scripts/build.mjs              # build to build-output/, report diffs
node scripts/build.mjs --write      # also overwrite public/core/*
```

`build-output/` is gitignored. The build always reads from `source-data/` and
the existing per-version verse-text files in `public/text/`.

### Section dependency order

```
index (public/text/index.txt)
   ↓
outlines, structures, custom, commentary_audio, custom   (independent)
   ↓
meta              (needs outlines for sample.headings)
tags              (needs index; commentary.comIndex needs entries/)
   ↓
final core.txt + meta.json + tags_hl.txt
```

### What each section reads

| Section | YAML / data source | Derivation |
|---|---|---|
| `index` | `public/text/index.txt` | direct read (base64+gzip JSON) |
| `meta.structure` etc. | `source-data/meta/*.yml` | one-to-one, plus `meta.version.<sc>.sample` pulled from `public/text/verses_<sc>.txt` and `meta.version.<sc>.sample.<vid>.headings` from the same-shortcode entry in `outlines` |
| `meta.nonSeq` | `source-data/meta/nonseq.yml` | C:V → verse_id via the index |
| `structures` | `source-data/structures/*.yml` (order from `meta/structures.yml`) | parse `reference` to verse-id spans; array of `{description, reference, verses, tag, details, super}` per section |
| `outlines` | `source-data/outlines/*.yml` (order from `meta/outlines.yml` + extras on disk) | parse `reference`; numeric-only references coerced to `Number` |
| `commentary.{comOrder,comSources}` | `source-data/commentary/sources.yml` | filter `outline === 'YES'` from comOrder |
| `commentary.comIndex` | `source-data/commentary/entries/<src>/<id>.json` | for each entry, register the entry id at every verse_id it spans (`verse_id` … `verse_id + verse_count - 1`) |
| `commentary.comData` | hard-coded `{"-1": null}` | vestigial placeholder in the runtime |
| `commentary_audio` | `source-data/commentary/audio.yml` | direct |
| `tags.tagIndex` | `source-data/tags/taxonomy.yml` | derive each tag's full `parents` chain by walking the immediate-parent map; `slug` defaults to a clean algorithm but a per-row `slug:` override is honoured (URL stability); `type` defaults to `''` but is inferred as `chiasm`/`parallel` from a Ⓧ/⦷ tag-name prefix; `prev`/`next` siblings (see "Tag taxonomy quirks" below) |
| `tags.tagStructure` | `source-data/tags/blocks/<file>.yml` | parse references; object form (`{seq: block}`) for `chiasm`/`parallel` tags, array form for everything else. Files are looked up by content `tag:` field rather than filename so Ⓧ/⦷ tags with prefix-only difference (e.g. "Peace" vs "Ⓧ Peace") don't collide. The chiasm/parallel object keys are sorted lexicographically. |
| `tags.parentTagIndex` | derived | parent → [children], walks ALL taxonomy rows (so alias rows contribute) |
| `tags.tagChildren` | derived | parent → [children] from CANONICAL rows only — a parent that is itself a tag but whose children's canonical rows live elsewhere (e.g. "Cumulative Themes") doesn't get a key. Two runtime compat keys (`""` and `"fixMe"`) tied to dirty data on "Damascus+Ephraim—Outline" are not reproduced. |
| `tags.verseTagIndex` | derived | verse_id → [tag] from `tagStructure` |
| `tags.slugmap` | derived | slug → [tag, description] |
| `tags.superRefs` | **copy-through from current** | derivation rules not yet captured |
| `custom` | `source-data/custom.yml` | group rows by mode; `type` and `base` are scalars, every other key accumulates into an array |
| `tags_hl.txt` | `source-data/highlights/*.yml` | direct shape transform `{tag: {seq: [phrases]}}` |

### Parity report

The script deep-diffs the regenerated tree against the currently-committed
`public/core/core.txt` and reports two kinds of differences per section:

- **structural** — missing key, extra key, wrong type, object-vs-array.
  These must be zero — the app is strict about shape.
- **content** — same shape, different value (or different array length).
  Tolerated. The XLSX usually has newer content than the runtime, and the
  runtime currently lags.

Exit status `0` only when every section is rebuilt and every section has
zero structural diffs.

---

## Reference parser — quirks worth knowing

A scripture reference like `Isaiah 1:2–28; 5:1,8–30; 8:23–9:7; 48:16b–19` is
parsed into a list of `{startVid: spanLength}` runs through a single
`refToSpans()`. Quirks encoded for runtime parity:

| Token                | Treatment                                                      |
|----------------------|----------------------------------------------------------------|
| `Isaiah 1–66`        | Strip "Isaiah " prefix.                                         |
| `1:2–28`             | En-dash (`–`) and hyphen (`-`) both work as range separators.   |
| `1.5` between digits | Excel auto-format: `.` between digits is normalised to `:` (so "Isaiah 49.22" parses like "Isaiah 49:22"). |
| `;` between segments | Hard segment boundary; each segment parsed independently.       |
| `C:V1, V2, …`        | Intra-chapter comma list. Contiguous numbers merge into one span (`14:1, 2` → one span of 2); gaps stay separate (`5:1,8–30` → two spans). |
| `8:23–9:7`           | Cross-chapter. If 8:23 doesn't exist (chapter 8 has only 22 verses), the parser overflows into the next chapter — 8:23 resolves to 9:1. Bible-numbering quirk. |
| `48:12–16a`          | End-side letter suffix → strip the letter, include the verse. → `12-16`. |
| `48:16b–19`          | Start-side letter suffix → range degenerates to the single start verse. → just `16`. |
| `41:2ab`             | Single-verse with letter suffix; tracked on the block's `sub` field as `{vid: "ab"}`. |
| `59:21:00`           | Excel time-format leakage (the cell was formatted as time and typed as `59:21`). Strip the trailing `:00`. |
| `63:8–6`             | Inverted ranges (end < start, source typos) are dropped. |

### Encoding shapes (output side)

| Container          | Empty | 1 span (span 1)         | 1 span (span >1)        | 2+ spans (all span 1)         | 2+ spans (mixed)                                 |
|--------------------|-------|-------------------------|-------------------------|-------------------------------|--------------------------------------------------|
| `outline.verses`   | `{}`  | `[vid]`                 | `{vid: span}`           | array of bare forms           | array of bare forms                              |
| `structure.verses` | —     | array `[{vid: span}]`   | array `[{vid: span}]`   | array of bare forms           | array of bare forms                              |
| `tagStructure.<>.verses` | `{}` | `[vid]`            | `{vid: span}`           | flat `[v1, v2, …]`            | array; consecutive single-verses bundle into `[v1, v2]` between multi-verse `{vid: span}` |

Within `tagStructure` blocks, source spans are merged when they overlap **or
are adjacent**, with two carve-outs:

- **Both single-verse, adjacent**: keep separate — `[17656, 18353, 18354]`
  for `1:1; 36:22; 37:1` rather than folding 18353+18354 into a
  cross-chapter range.
- **Cross-chapter adjacency with at least one single-verse**: keep separate —
  `47:4-15` + `48:1` stays as two spans (the second is single-verse), while
  `7:17-25` + `8:1-22` collapses into `7:17-8:22` (both multi-verse).

For the `ref` field rebuilt from those merged spans, intra-chapter ranges are
sorted ascending by start verse (`Isaiah 62:6-7; 62:1-4` → ref `62:1-4,6-7`).
Cross-chapter sequences preserve source order (`Destruction` lists 32:19,
29:2–6, … in that order).

---

## Tag taxonomy quirks

The Taxonomy sheet has 1035 rows but only 593 distinct tag names — 15 tags
appear under multiple parents. Two patterns:

- **Aliases (`type=alias`).** A second row attaching the tag to a thematic
  parent like "Major Chiasms". The runtime uses the canonical (non-alias)
  row for `tagIndex` fields and sibling-nav, but `parentTagIndex` lists the
  tag under both the canonical and alias parents.
- **Cross-classified tags.** Some tags (`Ⓧ Servant↔Tyrant`) have two
  non-alias rows under two different parents (e.g. Part IV and Redemption).
  The runtime uses the LAST non-alias row as canonical.

Sibling-nav order within a parent isn't the canonical-row position — it's
the **first taxonomy mention** of each tag, looking across the whole sheet.
That's why `Mini-Studies` siblings start Salvation → Zion → Endtime
Participants → … even though those tags' Mini-Studies rows appear later in
the file (Salvation and Zion first appear earlier under Ugaritic / Themes).

---

## Known content drift (XLSX vs current runtime)

These are intentional editorial changes that surface as content diffs. The
XLSX is the authoritative source going forward.

| Path | XLSX / build | Current runtime |
|---|---|---|
| `commentary.comSources.oswalt.year` | `1986` | `1998` |
| `meta.version.NWT.sample.17673.headings.heading` | `"Let Us Set Matters Straight"` | `"Let Us Set Matters Straight "` (trailing space) |
| `meta.version.CEV.sample.17673.headings.heading` | `"An Invitation From the Lord"` | `"An Invitation from the Lord"` (case) |

Plus ~10K content-level differences inside `tags.tagStructure.*` reflecting
ongoing editorial updates to tag references and descriptions.

---

## Final structural-parity numbers

After the latest pass:

| Section | Structural diffs |
|---|---|
| `index` | 0 |
| `meta` | 0 |
| `structures` | 0 |
| `outlines` | 0 |
| `commentary` | 0 |
| `commentary_audio` | 0 |
| `custom` | 0 |
| `tags.tagStructure` | 153 |
| `tags.tagChildren` | 3 |
| `tags.slugmap` | 1 |
| **total** | **157** |

Down from a baseline of 4215 once all 8 sections were first wired up
(96% reduction). The remaining 157 diffs are concentrated in a few dozen
tags whose source references have one-off encoding quirks not yet
captured by the rules above.

## Open / deferred

- `tags.superRefs` — copy-through from the current runtime. Derivation
  pending; no obvious YAML source.
- ~150 long-tail `tagStructure` block-encoding edge cases in specific tags.
  Continuing past this point is per-tag debugging rather than rule
  capture.
- The `.dat` conversion for `public/com/*.json` (obfuscation pass) —
  separate workstream, design discussed but not yet implemented.

---

## Adding new content

| To add … | Edit | Then |
|---|---|---|
| A new commentary entry | drop `source-data/commentary/entries/<src>/<id>.json` | `node scripts/build.mjs --write` |
| A new commentary source | append to `source-data/commentary/sources.yml` (note the order matters for `comOrder`) | rebuild |
| A new tag | new row in `source-data/tags/taxonomy.yml`, plus `source-data/tags/blocks/<slug>.yml` | rebuild |
| A new highlight phrase | edit `source-data/highlights/<slug>.yml` | rebuild |
| A new outline / structure | edit `source-data/meta/<cat>.yml` + add `source-data/<cat>/<slug>.yml` | rebuild |
| A subdomain rule | edit `source-data/custom.yml` | rebuild |
