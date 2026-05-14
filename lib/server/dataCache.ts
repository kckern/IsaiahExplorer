import fs from 'fs/promises';
import path from 'path';
import pako from 'pako';

/**
 * Server-side loader for `core.txt`.
 *
 * The file ships as base64-encoded gzipped JSON — same pipeline as the
 * client uses (see App.unzipJSON at src/App.js:2744). On the server we use
 * Node's Buffer to avoid the manual UTF-8 decoder needed in the browser.
 *
 * The result is cached in module scope so subsequent requests in the same
 * Lambda instance return the same reference. Concurrent calls during the
 * initial load share a single inflight promise.
 */
export type GlobalData = {
  tags: { tagIndex: Record<string, { slug: string; name?: string }> };
  meta: {
    structure: Record<string, unknown>;
    outline: Record<string, unknown>;
    version: Record<string, { shortcode?: string; title?: string } | undefined>;
    commentary: Record<string, unknown>;
  };
  commentary: { comSources: Record<string, { name: string }> };
  index: Record<string, { chapter: number; verse: number }>;
  custom?: Record<string, { type?: string; com?: string[]; [key: string]: unknown } | undefined>;
};

let cached: GlobalData | null = null;
let inflight: Promise<GlobalData> | null = null;

export async function loadGlobalData(): Promise<GlobalData> {
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    const filePath = path.join(process.cwd(), 'public', 'core', 'core.txt');
    const base64 = await fs.readFile(filePath, 'utf-8');
    const compressed = Buffer.from(base64, 'base64');
    const decompressed = pako.ungzip(compressed);
    const text = Buffer.from(decompressed).toString('utf-8');
    const data = JSON.parse(text) as GlobalData;
    cached = data;
    inflight = null;
    return data;
  })();

  return inflight;
}

export function __resetCache(): void {
  cached = null;
  inflight = null;
}
