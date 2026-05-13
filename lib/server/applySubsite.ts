import type { GlobalData } from './dataCache';

/**
 * Apply subsite customization to a global-data snapshot, returning a new
 * object with blacklisted entries removed. Mirrors the blacklist branch of
 * App.loadCustoms in src/App.js (lines ~1285-1349) but scoped only to the
 * commentary-source slice that affects metadata.
 *
 * Subsite blacklists for tags, versions, and other categories are not yet
 * implemented here — they'd be added when those slices start affecting
 * server-rendered metadata.
 */
export function applySubsite(data: GlobalData, subsite: string): GlobalData {
  if (subsite === 'default') return data;

  const custom = data.custom?.[subsite];
  if (!custom || custom.type !== 'blacklist') return data;

  // Shallow-clone the affected slices to avoid mutating the module cache.
  const out: GlobalData = {
    ...data,
    meta: { ...data.meta, commentary: { ...data.meta.commentary } },
  };

  if (Array.isArray(custom.com)) {
    for (const code of custom.com) {
      delete out.meta.commentary[code];
    }
  }

  return out;
}
