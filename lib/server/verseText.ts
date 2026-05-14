import fs from 'fs/promises';
import path from 'path';
import pako from 'pako';
import { loadGlobalData } from './dataCache';

/**
 * Server-side loader for per-version verse text (`public/text/verses_<V>.txt`).
 *
 * Same base64+gzip pipeline as core.txt. Each file decompresses to an object
 * keyed by verse_id: `{ [verse_id]: { format, text } }`. Results are cached in
 * module scope per version (one Lambda instance reuses them across requests).
 *
 * `getVerseText` resolves a chapter:verse pair to its verse_id via a reverse
 * index built from `core.txt`'s `index` map, then returns the text with the
 * app's display-format markers stripped to plain prose.
 */

type VerseEntry = { format?: string; text?: string };
type VersionText = Record<string, VerseEntry>;

const versionCache = new Map<string, VersionText>();
const versionInflight = new Map<string, Promise<VersionText>>();

async function loadVersionText(version: string): Promise<VersionText> {
  const key = version.toUpperCase();
  const cached = versionCache.get(key);
  if (cached) return cached;
  const inflight = versionInflight.get(key);
  if (inflight) return inflight;

  const promise = (async () => {
    const filePath = path.join(process.cwd(), 'public', 'text', `verses_${key}.txt`);
    const base64 = await fs.readFile(filePath, 'utf-8');
    const decompressed = pako.ungzip(Buffer.from(base64, 'base64'));
    const data = JSON.parse(Buffer.from(decompressed).toString('utf-8')) as VersionText;
    versionCache.set(key, data);
    versionInflight.delete(key);
    return data;
  })();

  versionInflight.set(key, promise);
  return promise;
}

let reverseIndex: Map<string, string> | null = null;

async function getVerseId(chapter: number, verse: number): Promise<string | null> {
  if (!reverseIndex) {
    const data = await loadGlobalData();
    const map = new Map<string, string>();
    for (const [verseId, entry] of Object.entries(data.index)) {
      map.set(`${entry.chapter}:${entry.verse}`, verseId);
    }
    reverseIndex = map;
  }
  return reverseIndex.get(`${chapter}:${verse}`) ?? null;
}

/**
 * Strip the app's verse-display markers, leaving plain prose:
 *   `/` and `/_`  → line breaks (become spaces)
 *   `¶` `§`       → paragraph/section marks (removed)
 *   `▼` `►`       → inline UI markers (removed)
 *   `‐` `‑`       → hard/non-breaking hyphens (normalized to `-`)
 */
export function cleanVerseText(raw: string): string {
  return raw
    .replace(/\/_/g, ' ')
    .replace(/\//g, ' ')
    .replace(/[¶§▼►]/g, '')
    .replace(/[‐‑]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Plain-prose text of one verse in one version, or null if not found. */
export async function getVerseText(
  version: string,
  chapter: number,
  verse: number,
): Promise<string | null> {
  const verseId = await getVerseId(chapter, verse);
  if (!verseId) return null;
  try {
    const versionText = await loadVersionText(version);
    const entry = versionText[verseId];
    if (!entry || !entry.text) return null;
    return cleanVerseText(entry.text);
  } catch {
    return null;
  }
}

export function __resetVerseTextCache(): void {
  versionCache.clear();
  versionInflight.clear();
  reverseIndex = null;
}
