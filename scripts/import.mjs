#!/usr/bin/env node
/**
 * One-time migration from the editorial XLSX + DB-export CSV + the
 * already-extracted commentary JSONs into a versionable YAML tree under
 * `source-data/` (gitignored while copyright review is pending).
 *
 * Inputs (place under `import/` or override via env):
 *   import/Isaiah Database.xlsx                     (12 sheets — see ANALYSIS in chat)
 *   import/word_highlights.csv                      (3785 rows — tag → seq → phrases)
 *   public/com/*.json                               (13,671 commentary entries, by shortcode + id)
 *
 * Output (all gitignored):
 *   source-data/meta/{structures,outlines,versions,commentaries,audiocoms,nonseq}.yml
 *   source-data/structures/<classification>.yml
 *   source-data/outlines/<shortcode>.yml
 *   source-data/tags/taxonomy.yml
 *   source-data/tags/blocks/<slug>.yml
 *   source-data/highlights/<slug>.yml
 *   source-data/commentary/sources.yml
 *   source-data/commentary/entries/<shortcode>/<id>.json
 *   source-data/custom.yml
 *
 * Scratch sheets (Sandbox / Shared / Sheet16 / second-Outline) are skipped
 * per the design discussion — confirmed editorial scratch.
 *
 * Usage:  node scripts/import.mjs
 */

import fs from 'node:fs/promises';
import { existsSync, createReadStream } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import xlsx from 'xlsx';
import yaml from 'js-yaml';

const ROOT = path.resolve(process.cwd());
const SRC = path.join(ROOT, 'source-data');
const IMPORT_XLSX = process.env.IMPORT_XLSX || path.join(ROOT, 'import', 'Isaiah Database.xlsx');
const IMPORT_CSV = process.env.IMPORT_CSV || path.join(ROOT, 'import', 'word_highlights.csv');
const PUBLIC_COM = process.env.PUBLIC_COM || path.join(ROOT, 'public', 'com');

const SKIP_SHEETS = new Set(['Sandbox', 'Shared', 'Sheet16', 'Outline']);
const counts = {};

const slug = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// File-naming slug for tag YAML files. Plain slugify() collides when a tag
// name like "Peace" and "Ⓧ Peace" lowercase to the same alphanumeric stem;
// prefix chiasm/parallel-marked tags so their files coexist.
const tagFile = (tag) => {
  const base = slug(tag);
  if (typeof tag === 'string' && tag.startsWith('Ⓧ')) return `x-${base}`;
  if (typeof tag === 'string' && tag.startsWith('⦷')) return `p-${base}`;
  return base;
};

const isBlank = (v) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

/**
 * Drop blank/undefined fields. Strings are kept as-is (no trim) so that
 * stray trailing whitespace in the source is preserved on round-trip —
 * the runtime data already contains some, and the build script's parity
 * check is byte-exact.
 */
function tidy(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (isBlank(v)) continue;
    out[k] = v;
  }
  return out;
}

async function writeYaml(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const text = yaml.dump(value, { lineWidth: 100, noRefs: true, sortKeys: false });
  await fs.writeFile(filePath, text, 'utf8');
}

function readSheet(wb, name, opts = {}) {
  const ws = wb.Sheets[name];
  if (!ws) return [];
  // raw:true preserves numbers as numbers (the structural-coercion the build
  // expects), but on a few sheets the Reference column contains values like
  // "59:21" that Excel interpreted as time durations — those need raw:false
  // so the formatted string ("59:21:00") survives.
  return xlsx.utils.sheet_to_json(ws, { defval: null, raw: true, ...opts });
}

// ────────────────────────────────────────────────────────────────────────────
// Sheet handlers
// ────────────────────────────────────────────────────────────────────────────

async function importMetadata(wb) {
  const rows = readSheet(wb, 'Metadata');
  // group by Category
  const byCat = new Map();
  for (const r of rows) {
    const cat = r.Category;
    if (!cat) continue;
    const code = r.Shortcode;
    if (!code) continue;
    const entry = tidy({
      shortcode: code,
      title: r.Title,
      short_title: r.Short_Title,
      image: r.image,
      audio: r.audio,
      description: r.Description,
      details: r.Details,
    });
    if (!byCat.has(cat)) byCat.set(cat, {});
    byCat.get(cat)[code] = entry;
  }
  // Category → filename. Most pluralise the English way; audiocom/nonseq are
  // already domain labels and stay singular.
  const META_FILE = {
    structure: 'structures',
    outline: 'outlines',
    version: 'versions',
    commentary: 'commentaries',
    audiocom: 'audiocom',
  };
  for (const [cat, group] of byCat) {
    const base = META_FILE[cat] || `${cat}s`;
    const file = path.join(SRC, 'meta', `${base}.yml`);
    await writeYaml(file, group);
    counts[`meta/${base}.yml`] = Object.keys(group).length;
  }
}

async function importStructures(wb) {
  const rows = readSheet(wb, 'Structures');
  // group by Classification (= structure shortcode)
  const byShort = new Map();
  for (const r of rows) {
    const code = r.Classification;
    if (!code) continue;
    const entry = tidy({
      description: r.Description,
      reference: r.Reference,
      tag: r.Tag,
      details: r.Details,
      super: r.Super,
    });
    if (Object.keys(entry).length === 0) continue;
    if (!byShort.has(code)) byShort.set(code, []);
    byShort.get(code).push(entry);
  }
  for (const [code, sections] of byShort) {
    const file = path.join(SRC, 'structures', `${slug(code)}.yml`);
    await writeYaml(file, { shortcode: code, sections });
    counts[`structures/${slug(code)}.yml`] = sections.length;
  }
}

async function importOutlines(wb) {
  // Headings.Reference has occasional Excel-time-formatted cells (e.g.
  // "59:21" surfaces as 2.472916… without formatting). raw:false uses each
  // cell's display format so those come through as strings.
  const rows = readSheet(wb, 'Headings', { raw: false });
  const byShort = new Map();
  for (const r of rows) {
    const code = r.Shortcode;
    if (!code) continue;
    const entry = tidy({
      heading: r.Heading,
      seq: r.Seq,
      reference: r.Reference,
      description: r.Description,
    });
    if (Object.keys(entry).length === 0) continue;
    if (!byShort.has(code)) byShort.set(code, []);
    byShort.get(code).push(entry);
  }
  for (const [code, headings] of byShort) {
    const file = path.join(SRC, 'outlines', `${slug(code)}.yml`);
    await writeYaml(file, { shortcode: code, headings });
    counts[`outlines/${slug(code)}.yml`] = headings.length;
  }
}

async function importTaxonomy(wb) {
  const rows = readSheet(wb, 'Taxonomy');
  // Some runtime slugs were hand-curated and don't match a clean algorithm —
  // e.g. "Sunday School" → "sundayschool" (no separator) but "Spiritual
  // Ladder" → "spiritual-ladder" (with separator). Existing URLs depend on
  // these specific slugs, so override per-tag when the saved slug differs
  // from what slugify() would produce.
  let runtimeSlugByTag = new Map();
  try {
    const pako = (await import('pako')).default;
    const corePath = path.join(ROOT, 'public', 'core', 'core.txt');
    const text = await fs.readFile(corePath, 'utf8');
    const core = JSON.parse(
      Buffer.from(pako.ungzip(Buffer.from(text, 'base64'))).toString('utf8'),
    );
    for (const [tag, entry] of Object.entries(core.tags?.tagIndex ?? {})) {
      if (entry?.slug) runtimeSlugByTag.set(tag, entry.slug);
    }
  } catch {}
  const tags = [];
  for (const r of rows) {
    if (!r.tag) continue;
    const entry = tidy({
      type: r.type,
      parent: r.parent,
      tag: r.tag,
      ref: r.ref,
      description: r.description,
      details: r.details,
      citation: r.citation,
      subscript: r.subscript,
    });
    const runtimeSlug = runtimeSlugByTag.get(r.tag);
    if (runtimeSlug && runtimeSlug !== slug(r.tag)) {
      entry.slug = runtimeSlug;
    }
    tags.push(entry);
  }
  await writeYaml(path.join(SRC, 'tags', 'taxonomy.yml'), tags);
  counts['tags/taxonomy.yml'] = tags.length;
}

async function importTagBlocks(wb) {
  const rows = readSheet(wb, 'Tags');
  const byTag = new Map();
  for (const r of rows) {
    if (!r.tag) continue;
    const entry = tidy({
      seq: r.seq,
      reference: r.reference,
      heading: r.heading,
      desc: r.desc,
      details: r.details,
      post_details: r.post_details,
    });
    if (Object.keys(entry).length === 0) continue;
    if (!byTag.has(r.tag)) byTag.set(r.tag, []);
    byTag.get(r.tag).push(entry);
  }
  let n = 0;
  for (const [tag, blocks] of byTag) {
    const file = path.join(SRC, 'tags', 'blocks', `${tagFile(tag)}.yml`);
    await writeYaml(file, { tag, blocks });
    n++;
  }
  counts['tags/blocks/*.yml'] = n;
}

async function importCommentarySources(wb) {
  const rows = readSheet(wb, 'Commentary');
  const sources = [];
  for (const r of rows) {
    if (!r.shortcode) continue;
    sources.push(
      tidy({
        shortcode: r.shortcode,
        entries: r.entries,
        year: r.year,
        label: r.label,
        name: r.name,
        outline: r.Outline,
        permission: r.permission,
      }),
    );
  }
  // Reorder so the YAML matches the current core.txt's comOrder (which is
  // hand-curated and isn't recoverable algorithmically from year alone —
  // tie-breaking within a year doesn't match XLSX row order). Sources marked
  // outline=YES are excluded from comOrder by the build but kept in the YAML
  // for completeness; append them at the end.
  try {
    const pako = (await import('pako')).default;
    const corePath = path.join(ROOT, 'public', 'core', 'core.txt');
    const text = await fs.readFile(corePath, 'utf8');
    const core = JSON.parse(
      Buffer.from(pako.ungzip(Buffer.from(text, 'base64'))).toString('utf8'),
    );
    const curOrder = core?.commentary?.comOrder ?? [];
    const orderIdx = new Map(curOrder.map((s, i) => [s, i]));
    sources.sort((a, b) => {
      const ai = orderIdx.has(a.shortcode) ? orderIdx.get(a.shortcode) : 1e9;
      const bi = orderIdx.has(b.shortcode) ? orderIdx.get(b.shortcode) : 1e9;
      return ai - bi;
    });
  } catch {
    // No current core.txt yet → leave YAML in XLSX row order.
  }
  await writeYaml(path.join(SRC, 'commentary', 'sources.yml'), sources);
  counts['commentary/sources.yml'] = sources.length;
}

async function importNonSeq(wb) {
  const rows = readSheet(wb, 'nonSeq');
  const entries = [];
  for (const r of rows) {
    if (!r.Version || !r.Verse) continue;
    entries.push(tidy({ version: r.Version, verse: r.Verse, precedent: r.Precedent }));
  }
  await writeYaml(path.join(SRC, 'meta', 'nonseq.yml'), entries);
  counts['meta/nonseq.yml'] = entries.length;
}

async function importCustom(wb) {
  const rows = readSheet(wb, 'Custom');
  // group by mode → list of {key, value}
  const byMode = new Map();
  for (const r of rows) {
    if (!r.mode || !r.key) continue;
    if (!byMode.has(r.mode)) byMode.set(r.mode, []);
    byMode.get(r.mode).push(tidy({ key: r.key, value: r.value }));
  }
  const out = {};
  for (const [mode, entries] of byMode) out[mode] = entries;
  await writeYaml(path.join(SRC, 'custom.yml'), out);
  counts['custom.yml'] = Object.keys(out).length;
}

// ────────────────────────────────────────────────────────────────────────────
// CSV — word_highlights.csv
// ────────────────────────────────────────────────────────────────────────────

async function importHighlights() {
  if (!existsSync(IMPORT_CSV)) {
    console.warn(`  (skipping highlights — ${IMPORT_CSV} not found)`);
    return;
  }
  const byTag = new Map();
  const rl = readline.createInterface({
    input: createReadStream(IMPORT_CSV, 'utf8'),
    crlfDelay: Infinity,
  });
  let header = null;
  for await (const lineRaw of rl) {
    const line = lineRaw.replace(/^﻿/, '');
    if (!line) continue;
    if (header === null) {
      header = line.split('\t').map((c) => c.trim());
      continue;
    }
    // Three tab-separated fields: tag, seq, phrases (phrases is a JSON array
    // possibly wrapped in surrounding quotes with internal doubled quotes).
    const firstTab = line.indexOf('\t');
    const secondTab = line.indexOf('\t', firstTab + 1);
    if (firstTab < 0 || secondTab < 0) continue;
    const tag = line.slice(0, firstTab);
    const seq = Number(line.slice(firstTab + 1, secondTab));
    let raw = line.slice(secondTab + 1).trim();
    if (raw.startsWith('"') && raw.endsWith('"')) {
      raw = raw.slice(1, -1).replace(/""/g, '"');
    }
    let phrases;
    try {
      phrases = JSON.parse(raw);
    } catch {
      phrases = [];
    }
    if (!Array.isArray(phrases)) continue;
    if (!byTag.has(tag)) byTag.set(tag, {});
    byTag.get(tag)[seq] = phrases;
  }
  let n = 0;
  for (const [tag, seqMap] of byTag) {
    const ordered = {};
    for (const k of Object.keys(seqMap).sort((a, b) => Number(a) - Number(b))) {
      ordered[k] = seqMap[k];
    }
    const file = path.join(SRC, 'highlights', `${tagFile(tag)}.yml`);
    await writeYaml(file, { tag, sequences: ordered });
    n++;
  }
  counts['highlights/*.yml'] = n;
}

// ────────────────────────────────────────────────────────────────────────────
// public/com/*.json → source-data/commentary/entries/<shortcode>/<id>.json
// ────────────────────────────────────────────────────────────────────────────

// commentary_audio.files isn't in the XLSX — it's the per-source MP3
// manifest (gileadi, mcgee). Seed source-data/commentary/audio.yml from the
// current core.txt once; from then on the YAML is the source of truth.
async function importCommentaryAudio() {
  const corePath = path.join(ROOT, 'public', 'core', 'core.txt');
  if (!existsSync(corePath)) {
    console.warn('  (skipping commentary audio — no current core.txt)');
    return;
  }
  const pako = (await import('pako')).default;
  const text = await fs.readFile(corePath, 'utf8');
  const core = JSON.parse(
    Buffer.from(pako.ungzip(Buffer.from(text, 'base64'))).toString('utf8'),
  );
  const files = core?.commentary_audio?.files;
  if (!files) {
    console.warn('  (skipping commentary audio — no files in current core)');
    return;
  }
  await writeYaml(path.join(SRC, 'commentary', 'audio.yml'), { files });
  let total = 0;
  for (const sc of Object.keys(files)) total += Object.keys(files[sc]).length;
  counts['commentary/audio.yml'] = total;
}

async function importCommentaryEntries() {
  if (!existsSync(PUBLIC_COM)) {
    console.warn(`  (skipping commentary entries — ${PUBLIC_COM} not found)`);
    return;
  }
  const files = await fs.readdir(PUBLIC_COM);
  let n = 0;
  let failures = 0;
  for (const f of files) {
    const m = f.match(/^([a-zA-Z0-9_-]+)\.(\d+)\.json$/);
    if (!m) continue;
    const [, shortcode, id] = m;
    const srcPath = path.join(PUBLIC_COM, f);
    const dstDir = path.join(SRC, 'commentary', 'entries', shortcode);
    const dstPath = path.join(dstDir, `${id}.json`);
    await fs.mkdir(dstDir, { recursive: true });
    try {
      await fs.copyFile(srcPath, dstPath);
      n++;
    } catch (e) {
      failures++;
    }
  }
  counts['commentary/entries/**.json'] = n;
  if (failures) console.warn(`  (${failures} commentary entries failed to copy)`);
}

// ────────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Reading XLSX: ${IMPORT_XLSX}`);
  if (!existsSync(IMPORT_XLSX)) {
    console.error(`  not found — drop it under import/ or set IMPORT_XLSX`);
    process.exit(1);
  }
  const wb = xlsx.readFile(IMPORT_XLSX);
  console.log(`  ${wb.SheetNames.length} sheets:`, wb.SheetNames.join(', '));

  console.log('\nWriting source-data/ …');
  await importMetadata(wb);
  await importStructures(wb);
  await importOutlines(wb);
  await importTaxonomy(wb);
  await importTagBlocks(wb);
  await importCommentarySources(wb);
  await importNonSeq(wb);
  await importCustom(wb);
  await importHighlights();
  await importCommentaryEntries();
  await importCommentaryAudio();

  console.log('\nSummary:');
  for (const k of Object.keys(counts).sort()) {
    console.log(`  ${k.padEnd(40)} ${counts[k]}`);
  }
  console.log('\nDone. source-data/ is gitignored — review before committing.');
}

main().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
