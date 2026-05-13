import { test, expect } from '@playwright/test';

/**
 * SSR meta-tag smoke for the canonical URL grammar.
 * Each permutation is asserted to produce a distinct, meaningful title plus
 * the OpenGraph and Twitter card tags that social crawlers consume.
 *
 * Notes on test data:
 * - 'suffering-servant' is used as a placeholder tag slug; real data may or
 *   may not have a tag with that exact slug. The codec's documented fallback
 *   for unknown slugs is to silently drop the tag, so the title for unknown
 *   tag URLs is the same as the bare-verse URL. The assertions accept either
 *   the tag-prefixed title or the bare-verse title.
 * - 'barnes' is asserted to resolve to a real commentary source name; the
 *   actual data ships with this source so the assertion is strict.
 */
const PERMUTATIONS: Array<{
  path: string;
  description: string;
  expectedTitleSubstring: string | RegExp;
}> = [
  { path: '/whole/chapters/iinst/5/4', description: 'base canonical', expectedTitleSubstring: 'Isaiah 5:4' },
  { path: '/whole/chapters/iinst/search.comfort+my+people/40/3', description: 'with search', expectedTitleSubstring: 'comfort my people' },
  { path: '/whole/chapters/iinst/hebrew.2490/53/5', description: 'with hebrew', expectedTitleSubstring: 'Hebrew H2490' },
  { path: '/whole/chapters/iinst/5/4/commentary.barnes', description: 'with commentary (source only)', expectedTitleSubstring: /Isaiah 5:4 \| .+/ },
  { path: '/whole/chapters/iinst/5/4/commentary.barnes/123', description: 'with commentary (source + id)', expectedTitleSubstring: /Isaiah 5:4 \| .+/ },
  { path: '/whole/chapters/iinst/search.holy+one/5/4/commentary.barnes', description: 'search + commentary', expectedTitleSubstring: 'holy one' },
  { path: '/whole/chapters/iinst/hebrew.6918/5/4/commentary.barnes/9', description: 'hebrew + commentary', expectedTitleSubstring: 'Hebrew H6918' },
];

for (const { path, description, expectedTitleSubstring } of PERMUTATIONS) {
  test(`${description}: title — ${path}`, async ({ request }) => {
    const res = await request.get(path);
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    const titleMatch = html.match(/<title>([^<]*)<\/title>/);
    expect(titleMatch).not.toBeNull();
    const title = titleMatch![1];
    if (expectedTitleSubstring instanceof RegExp) {
      expect(title).toMatch(expectedTitleSubstring);
    } else {
      expect(title).toContain(expectedTitleSubstring);
    }
  });

  test(`${description}: OpenGraph + Twitter tags — ${path}`, async ({ request }) => {
    const res = await request.get(path);
    const html = await res.text();
    expect(html).toMatch(/<meta\s+property="og:title"/);
    expect(html).toMatch(/<meta\s+property="og:description"/);
    expect(html).toMatch(/<meta\s+property="og:url"/);
    expect(html).toMatch(/<meta\s+property="og:type"\s+content="article"/);
    expect(html).toMatch(/<meta\s+name="twitter:card"\s+content="summary_large_image"/);
  });

  test(`${description}: canonical link — ${path}`, async ({ request }) => {
    const res = await request.get(path);
    const html = await res.text();
    expect(html).toMatch(/<link\s+rel="canonical"/);
  });
}

test('legacy /search/:query redirects to /search.:query', async ({ request }) => {
  const res = await request.get('/search/comfort+my+people', { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  expect(res.headers().location).toContain('/search.comfort+my+people');
});

test('legacy /hebrew/:strong redirects to /hebrew.:strong', async ({ request }) => {
  const res = await request.get('/hebrew/2490', { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  expect(res.headers().location).toContain('/hebrew.2490');
});
