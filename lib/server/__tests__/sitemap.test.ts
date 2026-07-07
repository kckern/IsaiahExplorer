import { sitemapEntries, SITE_ORIGIN } from '../sitemapEntries';

const fixture = {
  index: {
    '17656': { chapter: 1, verse: 1 },
    '17657': { chapter: 1, verse: 2 },
    '17700': { chapter: 2, verse: 1 },
  },
};

describe('sitemapEntries', () => {
  test('one entry per verse in the index', () => {
    expect(sitemapEntries(fixture)).toHaveLength(3);
  });

  test('URLs are absolute canonical forms (lowercase, default structure/outline/version)', () => {
    const urls = sitemapEntries(fixture).map((e) => e.url);
    expect(urls).toContain(`${SITE_ORIGIN}/whole/chapters/kjv/1/1`);
    expect(urls).toContain(`${SITE_ORIGIN}/whole/chapters/kjv/1/2`);
    expect(urls).toContain(`${SITE_ORIGIN}/whole/chapters/kjv/2/1`);
  });

  test('no legacy short forms', () => {
    for (const e of sitemapEntries(fixture)) {
      expect(e.url).toMatch(/\/whole\/chapters\/kjv\/\d+\/\d+$/);
    }
  });

  test('chapter-opening verses get higher priority', () => {
    const byUrl = Object.fromEntries(sitemapEntries(fixture).map((e) => [e.url, e]));
    expect(byUrl[`${SITE_ORIGIN}/whole/chapters/kjv/1/1`].priority).toBe(0.7);
    expect(byUrl[`${SITE_ORIGIN}/whole/chapters/kjv/1/2`].priority).toBe(0.5);
  });

  test('empty index yields no entries', () => {
    expect(sitemapEntries({})).toEqual([]);
  });
});
