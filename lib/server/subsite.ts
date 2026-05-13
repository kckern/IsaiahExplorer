/**
 * Extract subsite identifier from the request Host header.
 * Mirrors App.loadCore at src/App.js:1268-1270:
 *   window.location.host.match(/^(.*?).isaiah/)
 *
 * `dev.isaiah.scripture.guide` → `'dev'`
 * `isaiah.scripture.guide`     → `'default'`
 * Anything that doesn't match  → `'default'`
 */
export function subsiteFromHost(host: string | null | undefined): string {
  if (!host) return 'default';
  const match = host.match(/^(.*?)\.isaiah/);
  return match ? match[1] : 'default';
}
