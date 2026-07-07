#!/usr/bin/env node
/**
 * Operational build: source-data/ + reference corpus → public/core/core.txt
 *                                                     + public/core/meta.json
 *                                                     + public/core/tags_hl.txt
 *
 * Exit criterion (per design discussion): regenerated artifacts must match
 * the currently-committed ones structurally and semantically. The script
 * writes to `build-output/` (gitignored) and prints a deep diff against
 * `public/core/*`. Sections not yet implemented copy through from the
 * current file so we can land them one at a time; the exit state is
 * "zero copies + zero diffs".
 *
 * Usage:
 *   node scripts/build.mjs            # build to build-output/, diff against public/
 *   node scripts/build.mjs --write    # overwrite public/core/* on success
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import yaml from 'js-yaml';
import pako from 'pako';

const ROOT = path.resolve(process.cwd());
const SRC = path.join(ROOT, 'source-data');
const PUBLIC = path.join(ROOT, 'public');
const OUT_DIR = path.join(ROOT, 'build-output');
const WRITE = process.argv.includes('--write');

// Which sections we've fully rebuilt from source vs. still copying through.
// As we land each, flip the flag from false → true.
const REBUILT = {
  index: true,
  meta: true,
  structures: true,
  outlines: true,
  commentary: true,
  commentary_audio: true,
  tags: true,
  custom: true,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

async function loadYamlFile(p) {
  return yaml.load(await fs.readFile(p, 'utf8'));
}

async function loadYamlDir(dir) {
  const out = {};
  if (!existsSync(dir)) return out;
  for (const name of (await fs.readdir(dir)).sort()) {
    if (!name.endsWith('.yml')) continue;
    out[name.replace(/\.yml$/, '')] = await loadYamlFile(path.join(dir, name));
  }
  return out;
}

function packB64Gzip(obj) {
  const json = JSON.stringify(obj);
  return Buffer.from(pako.gzip(json)).toString('base64');
}

function unpackB64Gzip(text) {
  const compressed = Buffer.from(text, 'base64');
  const json = Buffer.from(pako.ungzip(compressed)).toString('utf8');
  return JSON.parse(json);
}

async function loadCurrentCore() {
  const text = await fs.readFile(path.join(PUBLIC, 'core', 'core.txt'), 'utf8');
  return unpackB64Gzip(text);
}

// Deep diff. Returns {structural, content} arrays.
//   structural — missing keys, extra keys, wrong types, array length mismatch.
//   content    — same shape but a leaf value differs (YAML may have newer
//                content than the runtime; that's fine. The app cares about
//                structure.)
function diff(expected, actual, basePath = '') {
  const structural = [];
  const content = [];
  const walk = (a, b, p) => {
    if (a === b) return;
    if (a === null || b === null) {
      if (a !== b) {
        const where = typeof a !== typeof b ? structural : content;
        where.push({ path: p, expected: summarize(a), actual: summarize(b) });
      }
      return;
    }
    if (typeof a !== typeof b) {
      structural.push({ path: p, expected: `(${typeof a})`, actual: `(${typeof b})` });
      return;
    }
    if (typeof a !== 'object') {
      if (a !== b) content.push({ path: p, expected: summarize(a), actual: summarize(b) });
      return;
    }
    if (Array.isArray(a) !== Array.isArray(b)) {
      structural.push({ path: p, expected: `array=${Array.isArray(a)}`, actual: `array=${Array.isArray(b)}` });
      return;
    }
    if (Array.isArray(a)) {
      // Different array lengths are CONTENT, not structural — the app's
      // structural contract is "this is an array of <element shape>". The
      // shape check happens via element-wise walk for the indices in common.
      if (a.length !== b.length) {
        content.push({ path: p, expected: `len=${a.length}`, actual: `len=${b.length}` });
      }
      const n = Math.min(a.length, b.length);
      for (let i = 0; i < n; i++) walk(a[i], b[i], `${p}[${i}]`);
      return;
    }
    const all = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of all) {
      if (!(k in a)) structural.push({ path: `${p}.${k}`, expected: 'MISSING', actual: summarize(b[k]) });
      else if (!(k in b)) structural.push({ path: `${p}.${k}`, expected: summarize(a[k]), actual: 'MISSING' });
      else walk(a[k], b[k], `${p}.${k}`);
    }
  };
  walk(expected, actual, basePath);
  return { structural, content };
}

function summarize(v) {
  if (v === null || v === undefined) return String(v);
  if (typeof v === 'string') return JSON.stringify(v.slice(0, 60));
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return `[array len=${v.length}]`;
  return `[object keys=${Object.keys(v).length}]`;
}

// ─── Section builders (placeholder bodies; implement one by one) ────────────

async function buildIndex() {
  // The verse-id ↔ chapter:verse map is shipped to clients as public/text/
  // index.txt; core.txt.index is the same payload duplicated. We read the
  // text file so the build doesn't depend on the file we're rebuilding.
  const text = await fs.readFile(path.join(PUBLIC, 'text', 'index.txt'), 'utf8');
  return unpackB64Gzip(text);
}

const META_BASE_FIELDS = ['shortcode', 'title', 'short_title', 'image', 'audio', 'description', 'details'];

// ─── Reference parser ──────────────────────────────────────────────────────
// Source refs use the editorial shape "Isaiah 1–5; 34–35", "1:1–9", "5:1,8–30",
// etc. The runtime stores spans run-length-encoded as {startVid: spanLength}.

function buildVerseLookup(index) {
  const reverse = new Map();
  const chBounds = {};
  const chapterSizes = {};
  for (const [vidStr, e] of Object.entries(index)) {
    const vid = Number(vidStr);
    reverse.set(`${e.chapter}:${e.verse}`, vid);
    const b = (chBounds[e.chapter] ??= { firstVid: vid, lastVid: vid });
    if (vid < b.firstVid) b.firstVid = vid;
    if (vid > b.lastVid) b.lastVid = vid;
    if (!chapterSizes[e.chapter] || e.verse > chapterSizes[e.chapter]) {
      chapterSizes[e.chapter] = e.verse;
    }
  }
  return { reverse, chBounds, chapterSizes };
}

// Parse one endpoint of a range. `defaultChapter` is the chapter to assume
// when the token is just a number and we're on the right side of a range
// that has a left-side chapter:verse (e.g. "1:5–8" → right side is verse 8
// in chapter 1).
function parseEndpoint(token, defaultChapter) {
  const t = token.trim();
  if (t.includes(':')) {
    const [c, v] = t.split(':').map((s) => parseInt(s, 10));
    return { chapter: c, verse: v };
  }
  const n = parseInt(t, 10);
  if (defaultChapter != null) return { chapter: defaultChapter, verse: n };
  return { chapter: n, verse: null }; // entire chapter
}

function endpointToVid(ep, side, lookup) {
  const { reverse, chBounds, chapterSizes } = lookup;
  if (ep.verse == null) {
    return side === 'start' ? chBounds[ep.chapter]?.firstVid : chBounds[ep.chapter]?.lastVid;
  }
  const direct = reverse.get(`${ep.chapter}:${ep.verse}`);
  if (direct != null) return direct;
  // Overflow into the next chapter (Bible-numbering quirk: some refs say
  // "8:23" where the running Hebrew numbering treats that as 9:1).
  let chapter = ep.chapter;
  let verse = ep.verse;
  while (chapterSizes[chapter] && verse > chapterSizes[chapter]) {
    verse -= chapterSizes[chapter];
    chapter += 1;
  }
  return reverse.get(`${chapter}:${verse}`);
}

// Pure-numeric range-side token, like "1" or "1:5".
const STRICT = /^(\d+:)?\d+$/;

// Strip a trailing letter from "1:5b" / "5b" (verse-part marker).
const stripLetter = (t) =>
  String(t)
    .trim()
    .replace(/^(\d+):(\d+)[a-zA-Z]+$/, '$1:$2')
    .replace(/^(\d+)[a-zA-Z]+$/, '$1');

const hasLetter = (t) => /^\d+:\d+[a-zA-Z]+$|^\d+[a-zA-Z]+$/.test(String(t).trim());

// Excel renders "59:21" typed into a time-formatted cell as "59:21:00" —
// drop the trailing seconds field so we get back a real C:V token.
const stripTimeSuffix = (t) => String(t).trim().replace(/^(\d+:\d+):\d+$/, '$1');

function parseRange(r, lookup) {
  if (!r) return null;
  const parts = r.split(/\s*[–-]\s*/).map((s) => s.trim());
  if (parts.length === 1) {
    const cleaned = stripLetter(stripTimeSuffix(parts[0]));
    if (!STRICT.test(cleaned)) return null;
    const ep = parseEndpoint(cleaned, null);
    return [endpointToVid(ep, 'start', lookup), endpointToVid(ep, 'end', lookup)];
  }
  // Range A–B.
  // Start-side letter ("16b–19" or "16b") → range collapses to the single
  // start verse. Mirrors the runtime: only the verse_id of the leading verse
  // is emitted because partial verses can't be represented.
  if (hasLetter(parts[0])) {
    const cleaned = stripLetter(parts[0]);
    if (!STRICT.test(cleaned)) return null;
    const ep = parseEndpoint(cleaned, null);
    const vid = endpointToVid(ep, 'start', lookup);
    return vid == null ? null : [vid, vid];
  }
  if (!STRICT.test(parts[0])) return null;
  // End-side letter ("12–16a") → strip and proceed normally; the verse with
  // the letter suffix is included.
  const cleanedEnd = stripLetter(parts[1]);
  if (!STRICT.test(cleanedEnd)) return null;
  const a = parseEndpoint(parts[0], null);
  const b = parseEndpoint(cleanedEnd, a.verse != null ? a.chapter : null);
  return [endpointToVid(a, 'start', lookup), endpointToVid(b, 'end', lookup)];
}

/**
 * "Isaiah 1–5; 34–35" → [{17656:115},{18305:27}]
 * Supports "1", "1:5", "1:5–9", "1–3", "1:5–3:10", "; "-separated lists,
 * and intra-chapter comma lists ("14:1, 2" or "5:1,8–30"). Comma-separated
 * sub-ranges within a chapter MERGE if the resulting spans are contiguous,
 * otherwise they remain as separate spans.
 */
function refToSpans(ref, lookup) {
  if (!ref) return [];
  const s = String(ref).replace(/^\s*Isaiah\s+/i, '').trim();
  const spans = [];
  for (const seg of s.split(/\s*;\s*/)) {
    // Expand "C:V1, V2-V3" into ["C:V1", "C:V2-V3"]
    const m = /^(\d+):(.+)$/.exec(seg.trim());
    const subs = m && m[2].includes(',')
      ? m[2].split(/\s*,\s*/).map((v) => `${m[1]}:${v}`)
      : [seg];
    const pairs = [];
    for (const sub of subs) {
      const p = parseRange(sub, lookup);
      if (!p || p[0] == null || p[1] == null) continue;
      pairs.push(p);
    }
    // Merge adjacent contiguous spans within this seg (verses 1+2 in a list
    // like "14:1, 2" become one span of 2).
    const merged = [];
    for (const p of pairs) {
      const tail = merged[merged.length - 1];
      if (tail && tail[1] + 1 === p[0]) tail[1] = p[1];
      else merged.push([p[0], p[1]]);
    }
    for (const [start, end] of merged) spans.push({ [start]: end - start + 1 });
  }
  return spans;
}

function categoryEntries(group, category) {
  const out = {};
  for (const [code, e] of Object.entries(group ?? {})) {
    const entry = { category };
    for (const f of META_BASE_FIELDS) entry[f] = e?.[f] ?? '';
    out[code] = entry;
  }
  return out;
}

// 8 showcase verse_ids — Isaiah 1:18, 7:14, 9:6, 11:6, 53:2-5 — surfaced in
// the version preview. Hard-coded in src/Components/Settings/Preview/Version.js.
const VERSION_SAMPLE_IDS = [17673, 17797, 17836, 17891, 18714, 18715, 18716, 18717];

async function loadVersionSampleEntries(shortcode) {
  const p = path.join(PUBLIC, 'text', `verses_${shortcode}.txt`);
  if (!existsSync(p)) return null;
  const text = await fs.readFile(p, 'utf8');
  const data = unpackB64Gzip(text);
  const out = {};
  for (const id of VERSION_SAMPLE_IDS) {
    const entry = data[String(id)];
    if (entry) out[id] = entry; // raw entry (format, text, possibly more)
  }
  return Object.keys(out).length ? out : null;
}

// For a built outline (output of buildOutlines), return a map of
//   { startVid: { heading: string, last: lastVid } }
// for every entry that starts at a verse_id matching one of the
// VERSION_SAMPLE_IDS. Used to attach `headings` on per-version samples.
function sampleHeadingMap(outlineEntries) {
  const m = new Map();
  if (!Array.isArray(outlineEntries)) return m;
  for (const h of outlineEntries) {
    const v = h.verses;
    if (!v) continue;
    // verses can be {vid:span} (single-range) or [{vid:span},…] (multi-range).
    // For our purpose only the first-range entry matters — that's where the
    // heading visually starts.
    const first = Array.isArray(v) ? v[0] : v;
    const startVid = Number(Object.keys(first)[0]);
    const span = first[startVid];
    if (VERSION_SAMPLE_IDS.includes(startVid)) {
      m.set(startVid, { heading: h.heading, last: startVid + span - 1 });
    }
  }
  return m;
}

async function buildMeta(currentCore, builtOutlines) {
  const structures = await loadYamlFile(path.join(SRC, 'meta', 'structures.yml'));
  const outlines = await loadYamlFile(path.join(SRC, 'meta', 'outlines.yml'));
  const versions = await loadYamlFile(path.join(SRC, 'meta', 'versions.yml'));
  const commentaries = await loadYamlFile(path.join(SRC, 'meta', 'commentaries.yml'));
  const audiocom = await loadYamlFile(path.join(SRC, 'meta', 'audiocom.yml'));
  const nonseq = await loadYamlFile(path.join(SRC, 'meta', 'nonseq.yml'));

  const versionsBuilt = categoryEntries(versions, 'version');
  for (const code of Object.keys(versionsBuilt)) {
    const entries = await loadVersionSampleEntries(code);
    if (!entries) continue;
    // Some versions share a shortcode with an outline (NASB, NWT, MSG, CEV).
    // For those, attach the section heading + last verse_id on samples that
    // happen to start a heading section in that version's outline. Key order
    // mirrors the runtime: headings first, then verse_id/format/text.
    const headingsMap = sampleHeadingMap(builtOutlines?.[code.toLowerCase()]);
    const sample = {};
    for (const id of VERSION_SAMPLE_IDS) {
      const e = entries[id];
      if (!e) continue;
      const heading = headingsMap.get(id);
      sample[id] = heading
        ? { headings: heading, verse_id: id, format: e.format, text: e.text }
        : { verse_id: id, format: e.format, text: e.text };
    }
    if (Object.keys(sample).length) versionsBuilt[code].sample = sample;
  }

  // nonSeq: convert "Isaiah C:V" → verse_id using the index.
  const index = currentCore.index;
  const reverse = new Map();
  for (const [vid, e] of Object.entries(index)) {
    reverse.set(`${e.chapter}:${e.verse}`, Number(vid));
  }
  const toId = (ref) => {
    const m = /(\d+):(\d+)/.exec(ref ?? '');
    return m ? reverse.get(`${m[1]}:${m[2]}`) ?? null : null;
  };
  const nonSeqOut = {};
  for (const r of nonseq ?? []) {
    const vid = toId(r.verse);
    const pid = toId(r.precedent);
    if (!vid || !pid) continue;
    (nonSeqOut[r.version] ??= {})[vid] = pid;
  }

  return {
    structure: categoryEntries(structures, 'structure'),
    outline: categoryEntries(outlines, 'outline'),
    version: versionsBuilt,
    commentary: categoryEntries(commentaries, 'commentary'),
    audiocom: categoryEntries(audiocom, 'audiocom'),
    nonSeq: nonSeqOut,
  };
}

async function buildStructures(ctx) {
  // Output key order follows meta/structures.yml (which is itself imported in
  // XLSX row order). Per-structure file lives at structures/<slugged>.yml.
  const meta = await loadYamlFile(path.join(SRC, 'meta', 'structures.yml'));
  const lookup = buildVerseLookup(ctx.index);
  const out = {};
  for (const shortcode of Object.keys(meta)) {
    const slug = shortcode.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const file = path.join(SRC, 'structures', `${slug}.yml`);
    if (!existsSync(file)) continue;
    const data = await loadYamlFile(file);
    out[shortcode] = (data.sections ?? []).map((s) => {
      const refRaw = s.reference ?? '';
      // Runtime references are normalised to start with "Isaiah ". A handful
      // of YAML rows omit the prefix (XLSX inconsistency).
      const reference = refRaw && !/^\s*Isaiah\b/i.test(refRaw) ? `Isaiah ${refRaw}` : refRaw;
      return {
        description: s.description ?? '',
        reference,
        verses: refToSpans(refRaw, lookup),
        tag: s.tag ?? '',
        details: s.details ?? '',
        super: s.super ?? '',
      };
    });
  }
  return out;
}

async function buildOutlines(ctx) {
  // Iterate the actual outline files on disk — the Metadata sheet omits a few
  // shortcodes (e.g. HCSB) that the Headings sheet does include, and the
  // runtime exposes them anyway. Use meta/outlines.yml order where it exists,
  // and append any extra outline-file shortcodes at the end.
  const meta = await loadYamlFile(path.join(SRC, 'meta', 'outlines.yml'));
  const lookup = buildVerseLookup(ctx.index);
  const dir = path.join(SRC, 'outlines');
  const fsCodes = (await fs.readdir(dir))
    .filter((n) => n.endsWith('.yml'))
    .map((n) => n.replace(/\.yml$/, ''));
  const ordered = [
    ...Object.keys(meta).filter((c) => {
      const slug = c.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return fsCodes.includes(slug);
    }),
    ...fsCodes.filter((c) => !(c in meta) && !Object.keys(meta).some((k) =>
      k.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') === c)),
  ];
  const out = {};
  for (const shortcode of ordered) {
    const slug = shortcode.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const file = path.join(dir, `${slug}.yml`);
    if (!existsSync(file)) continue;
    const data = await loadYamlFile(file);
    out[shortcode] = (data.headings ?? []).map((h) => {
      const spans = refToSpans(h.reference ?? '', lookup);
      // Outline encoding (confirmed against current d.outlines):
      //   span > 1  →  {startVid: span}                (object form)
      //   span == 1 →  [startVid]                      (bare-id array form)
      //   multi    →  array of the per-span shapes above
      const encodeSpan = (s) => {
        const vid = Number(Object.keys(s)[0]);
        return s[vid] === 1 ? [vid] : { [vid]: s[vid] };
      };
      let verses;
      if (spans.length === 0) verses = {};
      else if (spans.length === 1) verses = encodeSpan(spans[0]);
      else verses = spans.map(encodeSpan);
      // Pure-chapter references like "16" are stored as Number in the
      // runtime (XLSX text-formatted cell keeps a quoted string through YAML).
      let reference = h.reference ?? '';
      if (typeof reference === 'string' && /^\d+$/.test(reference)) {
        reference = Number(reference);
      }
      return { heading: h.heading ?? '', reference, verses };
    });
  }
  return out;
}

async function buildCommentary(currentCore) {
  const sources = await loadYamlFile(path.join(SRC, 'commentary', 'sources.yml'));
  const inOrder = sources.filter((s) => s.outline !== 'YES');
  const comOrder = inOrder.map((s) => s.shortcode);
  const comSources = {};
  for (const s of inOrder) {
    comSources[s.shortcode] = {
      shortcode: s.shortcode,
      label: s.label,
      name: s.name,
      year: s.year,
    };
  }

  // comIndex: scan every commentary entry JSON, group by (verse_id, shortcode).
  // Per-verse, the inner ordering is comOrder (gileadi first, calvin last).
  const entriesDir = path.join(SRC, 'commentary', 'entries');
  const comIndex = {};
  if (existsSync(entriesDir)) {
    const sourceFolders = await fs.readdir(entriesDir);
    for (const shortcode of sourceFolders) {
      const dir = path.join(entriesDir, shortcode);
      const st = await fs.stat(dir);
      if (!st.isDirectory()) continue;
      const files = await fs.readdir(dir);
      for (const f of files) {
        if (!f.endsWith('.json')) continue;
        const id = Number(f.replace(/\.json$/, ''));
        if (!Number.isFinite(id)) continue;
        const entry = JSON.parse(await fs.readFile(path.join(dir, f), 'utf8'));
        const startVid = entry.verse_id;
        if (startVid == null) continue;
        const count = Math.max(1, Number(entry.verse_count) || 1);
        // Register this entry at every verse_id it spans (start … start+count-1).
        for (let vid = startVid; vid < startVid + count; vid++) {
          const bucket = (comIndex[vid] ??= {});
          (bucket[shortcode] ??= []).push(id);
        }
      }
    }
    // Sort entry-id arrays ascending; sort per-verse source keys by comOrder.
    for (const vid of Object.keys(comIndex)) {
      const bucket = comIndex[vid];
      for (const sc of Object.keys(bucket)) bucket[sc].sort((a, b) => a - b);
      const ordered = {};
      for (const sc of comOrder) if (bucket[sc]) ordered[sc] = bucket[sc];
      for (const sc of Object.keys(bucket)) if (!(sc in ordered)) ordered[sc] = bucket[sc];
      comIndex[vid] = ordered;
    }
  }
  // Sort verse_id keys ascending so JSON output ordering is stable.
  const orderedComIndex = {};
  for (const vid of Object.keys(comIndex).sort((a, b) => Number(a) - Number(b))) {
    orderedComIndex[vid] = comIndex[vid];
  }

  // comData is a vestigial placeholder in the current runtime: { "-1": null }.
  // Preserved as-is.
  const comData = { '-1': null };

  return { comOrder, comSources, comIndex: orderedComIndex, comData };
}

async function buildCommentaryAudio(currentCore) {
  // commentary_audio.files is editorial data that doesn't live in the XLSX
  // (it tracks MP3 file → verse_ids per audio source). source-data/commentary/
  // audio.yml is the source of truth.
  const file = path.join(SRC, 'commentary', 'audio.yml');
  if (!existsSync(file)) return currentCore.commentary_audio;
  return await loadYamlFile(file);
}

// ─── Tags ───────────────────────────────────────────────────────────────────

function slugify(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// "Isaiah 1:2–28;2:10;5:1;5:8–30" →
//   ref:  "1:2–28;  2:10;  5:1,8–30"           (Isaiah stripped, double-spaced,
//                                               adjacent same-chapter refs merged
//                                               into comma form)
//   oref: "Isaiah 1:2-28; Isaiah 2:10; Isaiah 5:1; Isaiah 5:8-30"
//                                              (each segment prefixed with Isaiah
//                                               and the en-dash flattened to '-')
function normaliseTagRefs(reference) {
  const s = String(reference ?? '').replace(/^\s*Isaiah\s+/i, '').trim();
  if (!s) return { ref: '', oref: '' };
  const segs = s.split(/\s*;\s*/).filter(Boolean);
  // oref: per-segment "Isaiah " prefix, en-dash → hyphen, commas spaced.
  const oref = segs
    .map((seg) => `Isaiah ${seg.replace(/–/g, '-').replace(/\s*,\s*/g, ', ')}`)
    .join('; ');
  // ref: merge adjacent same-chapter segments into comma form
  // ("5:1" + "5:8-30" → "5:1,8-30"), join with ";  " (two-space).
  const merged = [];
  for (const seg of segs) {
    const tail = merged[merged.length - 1];
    const tailMatch = tail && /^(\d+):/.exec(tail);
    const segMatch = /^(\d+):(.+)$/.exec(seg);
    if (tailMatch && segMatch && tailMatch[1] === segMatch[1]) {
      merged[merged.length - 1] = `${tail},${segMatch[2]}`;
    } else {
      merged.push(seg);
    }
  }
  const ref = merged.join(';  ');
  return { ref, oref };
}

// Merge overlapping or contiguous spans. Standard interval-merge over the
// [startVid, endVid] form, sorted by startVid. The runtime applies this when
// the source reference contains overlapping segments like "41:17; 41:17–20"
// — those collapse into a single "41:17–20".
// Group spans by chapter (first-occurrence chapter order) and sort within
// each chapter by start verse_id. Used to align both encodeTagVerses output
// and the rendered `ref` string with the runtime: cross-chapter sequences
// preserve source order, intra-chapter ranges are emitted ascending.
function sortSpansForOutput(spans, index) {
  const byChapter = new Map();
  const order = [];
  for (const s of spans) {
    const start = Number(Object.keys(s)[0]);
    const ch = index[start]?.chapter ?? null;
    if (!byChapter.has(ch)) {
      byChapter.set(ch, []);
      order.push(ch);
    }
    byChapter.get(ch).push(s);
  }
  const out = [];
  for (const ch of order) {
    const arr = byChapter.get(ch);
    arr.sort((a, b) => Number(Object.keys(a)[0]) - Number(Object.keys(b)[0]));
    out.push(...arr);
  }
  return out;
}

function mergeOverlappingSpans(spans, index) {
  // Preserve source order — many refs go in non-ascending chapter order
  // (e.g. Destruction lists 32:19 first, then 29:2–6, …). We only fold
  // a span into an earlier one when it overlaps or is adjacent — and
  // adjacency doesn't cross chapter boundaries (47:15 + 48:1 share vid
  // adjacency but represent separate ranges).
  const ranges = [];
  const chapter = (vid) => index?.[vid]?.chapter ?? null;
  for (const s of spans) {
    const v = Number(Object.keys(s)[0]);
    const len = s[v];
    // Drop inverted ranges (source typos like "63:8-6") — len ≤ 0 means
    // start > end after parse.
    if (!Number.isFinite(len) || len <= 0) continue;
    let start = v;
    let end = v + len - 1;
    let foldIdx = -1;
    for (let i = 0; i < ranges.length; i++) {
      const [rs, re] = ranges[i];
      const overlap = start <= re && end >= rs;
      const adjacent = start === re + 1 || end + 1 === rs;
      if (!overlap && !adjacent) continue;
      // Two single-verse spans that touch (e.g. 36:22 then 37:1) stay
      // separate so the runtime emits them in flat-array bundle form.
      const bothSingle = rs === re && start === end;
      if (bothSingle) continue;
      // Cross-chapter adjacency merges only when BOTH spans are
      // multi-verse — "7:17-25" + "8:1-22" merges into "7:17-8:22", but
      // "47:4-15" + "48:1" stays as two separate spans because the second
      // is single-verse.
      if (adjacent && !overlap) {
        const aCh = chapter(re);
        const bCh = chapter(start);
        if (aCh != null && bCh != null && aCh !== bCh) {
          const tailIsSingle = rs === re;
          const newIsSingle = start === end;
          if (tailIsSingle || newIsSingle) continue;
        }
      }
      foldIdx = i;
      start = Math.min(rs, start);
      end = Math.max(re, end);
      break;
    }
    if (foldIdx >= 0) ranges[foldIdx] = [start, end];
    else ranges.push([start, end]);
  }
  return ranges.map(([s, e]) => ({ [s]: e - s + 1 }));
}

// Render merged spans back to a "C:V[–V']" reference string. Used for the
// runtime `ref` field (which is recomputed from the merged spans, not the
// raw source segments).
function spansToRefString(mergedSpans, index, lookup) {
  if (!mergedSpans.length) return '';
  // Whole-chapter shortcut: a single span covering all verses of one or more
  // contiguous chapters emits the bare chapter number / range, not a verse
  // form. ("Isaiah 7" → 7 as Number; "Isaiah 37–38" → "37–38" as String.)
  if (mergedSpans.length === 1) {
    const s = mergedSpans[0];
    const start = Number(Object.keys(s)[0]);
    const end = start + s[start] - 1;
    const a = index[start];
    const b = index[end];
    if (
      a && b &&
      a.verse === 1 &&
      lookup?.chapterSizes?.[b.chapter] === b.verse
    ) {
      return a.chapter === b.chapter ? a.chapter : `${a.chapter}–${b.chapter}`;
    }
  }
  const fmt = (vid) => {
    const e = index[vid];
    return e ? { ch: e.chapter, v: e.verse } : null;
  };
  // Group spans by chapter (preserve first-occurrence chapter order) so we
  // can produce one comma-merged piece per chapter. Within a chapter the
  // ranges are sorted ascending by start verse — matches the runtime, which
  // emits "62:1-4,6-7" even when the source says "62:6-7; 62:1-4".
  const byChapter = new Map();
  const chapterOrder = [];
  for (const s of mergedSpans) {
    const start = Number(Object.keys(s)[0]);
    const a = fmt(start);
    if (!a) continue;
    if (!byChapter.has(a.ch)) {
      byChapter.set(a.ch, []);
      chapterOrder.push(a.ch);
    }
    byChapter.get(a.ch).push(s);
  }
  for (const ch of chapterOrder) {
    byChapter.get(ch).sort(
      (x, y) => Number(Object.keys(x)[0]) - Number(Object.keys(y)[0]),
    );
  }
  const segments = [];
  for (const ch of chapterOrder) {
    const ranges = [];
    for (const s of byChapter.get(ch)) {
      const start = Number(Object.keys(s)[0]);
      const len = s[start];
      const end = start + len - 1;
      const a = fmt(start);
      const b = fmt(end);
      if (!a || !b) continue;
      if (start === end) ranges.push(`${a.v}`);
      else if (a.ch === b.ch) ranges.push(`${a.v}–${b.v}`);
      else ranges.push(`${a.v}–${b.ch}:${b.v}`);
    }
    segments.push(`${ch}:${ranges.join(',')}`);
  }
  return segments.join(';  ');
}

// Collect letter-suffix sub-verse markers from a reference (e.g. "41:2ab",
// "46:10–13b", "41:2c–7" → { vid_for_41:2 : "ab" }, { vid_for_46:13 : "b" },
// { vid_for_41:2 : "c" }). Stored on the block as `sub` when non-empty.
function collectSubMarkers(reference, lookup) {
  const s = String(reference ?? '').replace(/^\s*Isaiah\s+/i, '').trim();
  const subs = {};
  for (const seg of s.split(/\s*;\s*/)) {
    const m = /^(\d+):(.+)$/.exec(seg.trim());
    if (!m) continue;
    const ch = m[1];
    for (const part of m[2].split(/\s*,\s*/)) {
      for (const side of part.split(/\s*[–-]\s*/)) {
        const mm = /^(\d+)([a-zA-Z]+)$/.exec(side.trim());
        if (!mm) continue;
        const vid = lookup.reverse.get(`${ch}:${mm[1]}`);
        if (vid != null) subs[vid] = mm[2];
      }
    }
  }
  return subs;
}

// tagStructure verses encoding:
//   0 spans                        → {}
//   1 span                         → bare form ({vid:span} or [vid] for span=1)
//   N spans, all single-verse      → flat [v1, v2, …]
//   N spans, mixed                 → array of mixed elements; consecutive
//                                    single-verse spans are bundled into one
//                                    [vid, vid, …] element between multi-verse
//                                    {vid:span} objects.
function encodeTagVerses(spans) {
  if (spans.length === 0) return {};
  if (spans.length === 1) {
    const s = spans[0];
    const vid = Number(Object.keys(s)[0]);
    return s[vid] === 1 ? [vid] : { [vid]: s[vid] };
  }
  const out = [];
  let buf = [];
  const flushBuf = () => {
    if (buf.length) out.push([...buf]);
    buf = [];
  };
  for (const s of spans) {
    const vid = Number(Object.keys(s)[0]);
    if (s[vid] === 1) buf.push(vid);
    else {
      flushBuf();
      out.push({ [vid]: s[vid] });
    }
  }
  flushBuf();
  // All-single-verse case (no multi-verse spans): runtime drops the wrapper
  // array and stores the bare verse_id list.
  if (out.length === 1 && Array.isArray(out[0])) return out[0];
  return out;
}

async function buildTags(ctx) {
  const currentCore = ctx;
  const lookup = buildVerseLookup(ctx.index);
  const taxonomy = await loadYamlFile(path.join(SRC, 'tags', 'taxonomy.yml'));

  // 15 tag names have multiple taxonomy rows — typically a canonical entry
  // (e.g. type=chiasm under Part I → Seven Part Structure → Structures) plus
  // one or more alias rows (type=alias) attached to a thematic parent like
  // "Major Chiasms". The runtime resolves these as follows:
  //   • tagIndex fields + sibling-nav (prev/next) use the CANONICAL row
  //     (last non-alias row; fall back to last row if every row is an alias).
  //   • parentTagIndex DOES include alias rows so the tag shows up under
  //     each of its declared parents.
  const rowsByTag = new Map();
  for (const r of taxonomy) (rowsByTag.get(r.tag) ?? rowsByTag.set(r.tag, []).get(r.tag)).push(r);

  const canonicalRow = new Map();
  for (const [tag, rows] of rowsByTag) {
    const nonAlias = rows.filter((r) => r.type !== 'alias');
    canonicalRow.set(tag, (nonAlias.length ? nonAlias : rows).at(-1));
  }

  const immediateParent = new Map();
  for (const [tag, r] of canonicalRow) immediateParent.set(tag, r.parent);

  const fullParents = (tag) => {
    const chain = [];
    let p = immediateParent.get(tag);
    const seen = new Set();
    while (p && !seen.has(p)) {
      chain.push(p);
      seen.add(p);
      if (p === 'root') break;
      p = immediateParent.get(p);
    }
    return chain;
  };

  // Sibling navigation considers only the canonical row of each tag.
  // Order within a parent's bucket follows the FIRST taxonomy mention of
  // each tag across the entire taxonomy (not the position of the canonical
  // row itself). This matches the runtime: e.g. under Mini-Studies the chain
  // runs Salvation → Zion → Endtime Participants → … because Salvation and
  // Zion first appear earlier (under Ugaritic / Themes) before their
  // canonical Mini-Studies rows.
  const firstMentionIdx = new Map();
  for (let i = 0; i < taxonomy.length; i++) {
    const t = taxonomy[i].tag;
    if (!firstMentionIdx.has(t)) firstMentionIdx.set(t, i);
  }
  const siblings = new Map();
  for (const [tag, r] of canonicalRow) {
    if (!siblings.has(r.parent)) siblings.set(r.parent, []);
    siblings.get(r.parent).push(tag);
  }
  for (const [p, arr] of siblings) {
    arr.sort((a, b) => firstMentionIdx.get(a) - firstMentionIdx.get(b));
  }
  const navOf = (tag) => {
    const list = siblings.get(immediateParent.get(tag)) || [];
    const i = list.indexOf(tag);
    return {
      prev: i > 0 ? list[i - 1] : undefined,
      next: i >= 0 && i < list.length - 1 ? list[i + 1] : undefined,
    };
  };

  // Build tagIndex in canonical-row order across the taxonomy. The runtime
  // ships the iteration order it produced; matching that gives us a stable
  // JSON serialisation diff.
  // Some taxonomy rows omit `type` even when the tag is clearly a chiasm or
  // parallel — the runtime falls back to detecting these via the Ⓧ / ⦷
  // prefix in the tag name. Mirror that here.
  const inferType = (tag, declared) => {
    if (declared) return declared;
    if (typeof tag === 'string' && tag.startsWith('Ⓧ')) return 'chiasm';
    if (typeof tag === 'string' && tag.startsWith('⦷')) return 'parallel';
    return '';
  };

  const tagIndex = {};
  for (const r of taxonomy) {
    if (canonicalRow.get(r.tag) !== r) continue;
    const nav = navOf(r.tag);
    const entry = {
      parents: fullParents(r.tag),
      description: r.description ?? '',
      details: r.details ?? '',
      cite: r.citation ?? '',
      type: inferType(r.tag, r.type),
      // Per-tag slug override allowed (some hand-curated slugs in the existing
      // runtime don't match a clean algorithm; URLs depend on the exact form).
      slug: r.slug || slugify(r.tag),
    };
    if (r.subscript) entry.subscript = r.subscript;
    if (nav.next !== undefined) entry.next = nav.next;
    if (nav.prev !== undefined) entry.prev = nav.prev;
    tagIndex[r.tag] = entry;
  }

  // 2) tagStructure — one record per tag that has block data, in taxonomy order.
  //
  // Shape per tag depends on type:
  //   chiasm / parallel → object keyed by block.seq ("A1", "1A", …)
  //   regular / citation → array of blocks in YAML order
  // Index block YAML files by their content `tag:` field — chiasm-/parallel-
  // prefix tags share an alphanumeric slug with their non-prefix counterparts
  // (e.g. "Peace" vs "Ⓧ Peace"), so filename-based lookup would collide.
  const blocksDir = path.join(SRC, 'tags', 'blocks');
  const blocksByTag = new Map();
  if (existsSync(blocksDir)) {
    for (const f of (await fs.readdir(blocksDir)).filter((n) => n.endsWith('.yml'))) {
      const data = await loadYamlFile(path.join(blocksDir, f));
      if (data?.tag) blocksByTag.set(data.tag, data);
    }
  }
  const tagStructure = {};
  // Some block references use "." instead of ":" between chapter and verse
  // (Excel auto-format leakage). Normalise before parsing.
  const normaliseRef = (raw) => String(raw ?? '').replace(/(\d)\.(\d)/g, '$1:$2');

  const buildBlockRecord = (b) => {
    const refText = normaliseRef(b.reference);
    const rawSpans = refToSpans(refText, lookup);
    const mergedSpans = mergeOverlappingSpans(rawSpans, ctx.index);
    const sortedSpans = sortSpansForOutput(mergedSpans, ctx.index);
    const verses = encodeTagVerses(sortedSpans);
    // The runtime's `ref` is computed FROM the merged spans (so overlapping
    // source segments collapse), while `oref` preserves the source segment
    // structure.
    const ref = spansToRefString(sortedSpans, ctx.index, lookup);
    const oref = normaliseTagRefs(refText).oref;
    const rec = { desc: b.desc ?? '', verses, ref, oref };
    if (b.heading) rec.heading = b.heading;
    if (b.details) rec.details = b.details;
    if (b.post_details) rec.post_details = b.post_details;
    const sub = collectSubMarkers(refText, lookup);
    if (Object.keys(sub).length) rec.sub = sub;
    return rec;
  };
  for (const tag of Object.keys(tagIndex)) {
    const data = blocksByTag.get(tag);
    if (!data) continue;
    const blocks = data.blocks ?? [];
    const type = tagIndex[tag].type;
    if (type === 'chiasm' || type === 'parallel') {
      // The runtime sorts seq keys lexicographically — e.g. parallel tags
      // emit "1A, 1B, 2A, 2B, …" even when the source listed A-first then
      // B-first ("1A, 2A, 3A, 1B, 2B, …"). Chiasms use letter-major
      // seqs ("A1, A2, B1, B2, …") and the same lex sort produces the
      // expected order.
      const obj = {};
      const sortedBlocks = [...blocks].sort((a, b) =>
        String(a.seq).localeCompare(String(b.seq)),
      );
      for (const b of sortedBlocks) obj[String(b.seq)] = buildBlockRecord(b);
      tagStructure[tag] = obj;
    } else {
      tagStructure[tag] = blocks.map(buildBlockRecord);
    }
  }

  // 3) parentTagIndex — parent → [children]. Walks ALL taxonomy rows, so a
  //    tag with alias rows appears under each of its declared parents.
  const parentTagIndex = {};
  for (const r of taxonomy) {
    const arr = (parentTagIndex[r.parent] ??= []);
    if (!arr.includes(r.tag)) arr.push(r.tag);
  }

  // 4) tagChildren — distinct from parentTagIndex. The runtime computes it
  //    from canonical rows only (so a parent that is itself a tag but whose
  //    children's canonical rows live elsewhere — e.g. "Cumulative Themes" —
  //    doesn't get a key here). The runtime data also contains a couple of
  //    compat keys ("", "fixMe") tied to buggy rows on
  //    "Damascus+Ephraim—Outline"; those reflect dirty data and are not
  //    reproduced from the cleaned-up YAML.
  const tagChildren = {};
  for (const [parent, children] of siblings) {
    if (parent != null) tagChildren[parent] = [...children];
  }

  // 5) verseTagIndex — verse_id → [tag] for every block-tagged verse.
  const expandSpan = (span) => {
    const out = [];
    if (Array.isArray(span)) {
      out.push(span[0]);
    } else if (span && typeof span === 'object') {
      const vid = Number(Object.keys(span)[0]);
      const len = span[vid];
      if (Number.isFinite(len)) for (let i = 0; i < len; i++) out.push(vid + i);
    }
    return out;
  };
  const verseTagIndex = {};
  for (const [tag, blocks] of Object.entries(tagStructure)) {
    const verseSet = new Set();
    // blocks is either an array (regular/citation) or an object keyed by seq
    // (chiasm/parallel) — iterate the values either way.
    const blockList = Array.isArray(blocks) ? blocks : Object.values(blocks);
    for (const b of blockList) {
      // b.verses: {} | {vid:span} | [vid] | [v1,v2,…] | [{vid:span},[vid],…]
      let spans = [];
      if (Array.isArray(b.verses)) {
        if (b.verses.length === 0) spans = [];
        else if (typeof b.verses[0] === 'number') {
          // Flat array of single verse_ids.
          spans = b.verses.map((vid) => ({ [vid]: 1 }));
        } else {
          // Array of {vid:span} or [vid] (which may itself be [v1,v2,…]).
          for (const el of b.verses) {
            if (Array.isArray(el)) {
              for (const vid of el) spans.push({ [vid]: 1 });
            } else {
              spans.push(el);
            }
          }
        }
      } else if (b.verses && typeof b.verses === 'object' && Object.keys(b.verses).length > 0) {
        spans = [b.verses];
      }
      for (const span of spans) for (const vid of expandSpan(span)) verseSet.add(vid);
    }
    for (const vid of verseSet) (verseTagIndex[vid] ??= []).push(tag);
  }
  // Stable verse-id key order.
  const verseTagIndexOrdered = {};
  for (const vid of Object.keys(verseTagIndex).sort((a, b) => Number(a) - Number(b))) {
    verseTagIndexOrdered[vid] = verseTagIndex[vid];
  }

  // 6) slugmap — slug → [tag, description].
  const slugmap = {};
  for (const tag of Object.keys(tagIndex)) {
    slugmap[tagIndex[tag].slug] = [tag, tagIndex[tag].description];
  }

  // 7) superRefs — verse-id list for top-level structural categories. Copy
  //    through from currentCore until we map the derivation rules.
  const superRefs = currentCore.tags.superRefs;

  return {
    tagIndex,
    tagStructure,
    parentTagIndex,
    verseTagIndex: verseTagIndexOrdered,
    tagChildren,
    superRefs,
    slugmap,
  };
}

async function buildCustom(currentCore) {
  const customYaml = await loadYamlFile(path.join(SRC, 'custom.yml'));
  // `type` and `base` are scalars (string); every other key (com, comaudio,
  // tag, version, outline, structure, …) accumulates into an array preserving
  // the YAML order. Confirmed against d.custom.{default,christian,spu,kckern}.
  const SCALAR = new Set(['type', 'base']);
  const out = {};
  for (const mode of Object.keys(customYaml)) {
    const m = {};
    for (const { key, value } of customYaml[mode] ?? []) {
      if (SCALAR.has(key)) {
        m[key] = value;
      } else {
        (m[key] ??= []).push(value);
      }
    }
    out[mode] = m;
  }
  return out;
}

// ─── Orchestration ──────────────────────────────────────────────────────────

async function buildCore(currentCore) {
  // Build index first (everything needs verse_id lookups), then outlines
  // (because meta.version.*.sample.*.headings reads from built outlines).
  const index = await buildIndex();
  const ctx = { ...currentCore, index };
  const outlines = await buildOutlines(ctx);
  return {
    structures: await buildStructures(ctx),
    meta: await buildMeta(ctx, outlines),
    outlines,
    index,
    commentary_audio: await buildCommentaryAudio(ctx),
    commentary: await buildCommentary(ctx),
    tags: await buildTags(ctx),
    custom: await buildCustom(ctx),
  };
}

async function buildTagHighlights() {
  // source-data/highlights/<tag-slug>.yml → {tag: {seq: [phrases]}} → tags_hl.txt
  const dir = path.join(SRC, 'highlights');
  if (!existsSync(dir)) return {};
  const files = (await fs.readdir(dir)).filter((n) => n.endsWith('.yml'));
  const out = {};
  for (const f of files) {
    const data = await loadYamlFile(path.join(dir, f));
    if (!data?.tag) continue;
    const seqs = {};
    for (const seq of Object.keys(data.sequences ?? {})) {
      seqs[seq] = data.sequences[seq];
    }
    out[data.tag] = seqs;
  }
  return out;
}

async function main() {
  console.log('Loading current public/core/core.txt as baseline...');
  const current = await loadCurrentCore();
  console.log('Building from source-data/...');
  const built = await buildCore(current);
  const highlights = await buildTagHighlights();

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, 'core.json.new'), JSON.stringify(built, null, 2));
  await fs.writeFile(path.join(OUT_DIR, 'core.txt.new'), packB64Gzip(built));
  // public/core/meta.json is pretty-printed with 4-space indent in the
  // runtime — match for byte-level parity.
  await fs.writeFile(path.join(OUT_DIR, 'meta.json.new'), JSON.stringify(built.meta, null, 4));
  await fs.writeFile(path.join(OUT_DIR, 'tags_hl.txt.new'), packB64Gzip(highlights));

  // Per-section diff report. Structural diffs MUST be 0 — the app is strict
  // about shape. Content diffs are tolerated: the spreadsheet often has
  // newer content than the runtime, and the runtime currently lags. We
  // report both so a regression in shape is obvious without being drowned
  // out by intentional content updates.
  console.log('\n=== Rebuild status per section ===');
  let totalStructural = 0;
  let totalContent = 0;
  for (const k of Object.keys(REBUILT)) {
    const tag = REBUILT[k] ? 'REBUILT' : 'copy-through';
    const target = current[k];
    const probe = built[k];
    const d = diff(target, probe, k);
    totalStructural += d.structural.length;
    totalContent += d.content.length;
    console.log(`  ${k.padEnd(18)} ${tag.padEnd(14)} structural=${d.structural.length}  content=${d.content.length}`);
    if (REBUILT[k] && d.structural.length) {
      for (const x of d.structural.slice(0, 10)) {
        console.log(`    STRUCT ${x.path}\n           expected: ${x.expected}\n           actual:   ${x.actual}`);
      }
      if (d.structural.length > 10) console.log(`    … (${d.structural.length - 10} more structural)`);
    }
    if (REBUILT[k] && d.content.length && d.content.length <= 5) {
      for (const x of d.content.slice(0, 5)) {
        console.log(`    content ${x.path}: cur=${x.expected} new=${x.actual}`);
      }
    }
  }

  const rebuiltAll = Object.values(REBUILT).every(Boolean);
  console.log(`\nTotal structural diffs vs current: ${totalStructural}`);
  console.log(`Total content diffs vs current:    ${totalContent}`);

  const ok = rebuiltAll && totalStructural === 0;
  if (ok) {
    console.log('STRUCTURAL PARITY ACHIEVED.');
    if (WRITE) {
      await fs.copyFile(path.join(OUT_DIR, 'core.txt.new'), path.join(PUBLIC, 'core', 'core.txt'));
      await fs.copyFile(path.join(OUT_DIR, 'meta.json.new'), path.join(PUBLIC, 'core', 'meta.json'));
      await fs.copyFile(path.join(OUT_DIR, 'tags_hl.txt.new'), path.join(PUBLIC, 'core', 'tags_hl.txt'));
      console.log('Wrote public/core/{core.txt, meta.json, tags_hl.txt}');
    }
    process.exit(0);
  }
  if (WRITE) {
    // --write still lets you emit even when structural diffs remain (you've
    // accepted the divergence): copy the build to public/core/ explicitly.
    await fs.copyFile(path.join(OUT_DIR, 'core.txt.new'), path.join(PUBLIC, 'core', 'core.txt'));
    await fs.copyFile(path.join(OUT_DIR, 'meta.json.new'), path.join(PUBLIC, 'core', 'meta.json'));
    await fs.copyFile(path.join(OUT_DIR, 'tags_hl.txt.new'), path.join(PUBLIC, 'core', 'tags_hl.txt'));
    console.log(`Wrote public/core/{core.txt, meta.json, tags_hl.txt} with ${totalStructural} structural diff(s).`);
  }
  if (!rebuiltAll) {
    console.log(`(${Object.values(REBUILT).filter((v) => !v).length} section(s) still copy-through — keep iterating.)`);
  }
  process.exit(totalStructural === 0 && rebuiltAll ? 0 : 1);
}

main().catch((e) => {
  console.error('FAILED:', e);
  process.exit(1);
});
