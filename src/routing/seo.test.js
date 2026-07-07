import { buildTitle, buildDescription, truncate } from './seo';

const base = { chapter: 1, verse: 1, shortcode: 'KJV' };

describe('buildTitle', () => {
  test('default: reference + version', () => {
    expect(buildTitle({ ...base })).toBe('Isaiah 1:1 · KJV | Isaiah Explorer');
  });

  test('tag leads', () => {
    expect(buildTitle({ ...base, tagName: 'Messiah' })).toBe('Messiah | Isaiah 1:1');
  });

  test('search: quoted query', () => {
    expect(buildTitle({ ...base, searchQuery: 'zion' })).toBe('"zion" | Isaiah Explorer');
  });

  test('hebrew beats search', () => {
    expect(buildTitle({ ...base, hebrewStrongIndex: 430, searchQuery: 'zion' })).toBe(
      'Hebrew H430 | Isaiah Explorer'
    );
  });

  test('commentary: source name', () => {
    expect(buildTitle({ ...base, commentarySourceName: 'Barnes' })).toBe('Isaiah 1:1 | Barnes');
  });

  test('tag beats hebrew, search, and commentary', () => {
    expect(
      buildTitle({
        ...base,
        tagName: 'Messiah',
        hebrewStrongIndex: 430,
        searchQuery: 'zion',
        commentarySourceName: 'Barnes',
      })
    ).toBe('Messiah | Isaiah 1:1');
  });
});

describe('buildDescription', () => {
  test('default without verseText', () => {
    expect(buildDescription({ ...base })).toBe(
      'Read Isaiah 1:1 in multiple translations with thematic tags, Hebrew lexicon, and scholarly commentary.'
    );
  });

  test('verseText becomes description', () => {
    expect(buildDescription({ ...base, verseText: 'For unto us a child is born.' })).toBe(
      'For unto us a child is born.'
    );
  });

  test('tag description', () => {
    expect(buildDescription({ ...base, tagName: 'Messiah' })).toBe(
      'Explore the theme "Messiah" in Isaiah.'
    );
  });

  test('hebrew description', () => {
    expect(buildDescription({ ...base, hebrewStrongIndex: 430 })).toBe(
      'Study Hebrew word H430 in Isaiah.'
    );
  });

  test('search description', () => {
    expect(buildDescription({ ...base, searchQuery: 'zion' })).toBe(
      'Isaiah Explorer search results for "zion".'
    );
  });

  test('commentary description', () => {
    expect(buildDescription({ ...base, commentarySourceName: 'Barnes' })).toBe(
      'Barnes commentary on Isaiah 1:1.'
    );
  });
});

describe('truncate', () => {
  test('short text is unchanged', () => {
    expect(truncate('hello', 300)).toBe('hello');
  });

  test('long text truncates with ellipsis', () => {
    const long = 'word '.repeat(120).trim();
    const out = truncate(long, 300);
    expect(out.length).toBeLessThanOrEqual(301);
    expect(out).toMatch(/…$/);
  });
});
