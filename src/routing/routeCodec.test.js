import { parseRoute, buildRoute, normalizeRoute } from './routeCodec';

// ─── parseRoute ──────────────────────────────────────────────────────────────

describe('parseRoute', () => {
  test('empty / null path returns empty object', () => {
    expect(parseRoute('')).toEqual({});
    expect(parseRoute('/')).toEqual({});
    expect(parseRoute(null)).toEqual({});
  });

  test('canonical structure/outline/version/chapter/verse', () => {
    expect(parseRoute('/divisions/divisions/KJV/1/1')).toMatchObject({
      structure: 'divisions',
      outline: 'divisions',
      version: 'KJV',
      chapter: 1,
      verse: 1,
    });
  });

  test('version is uppercased', () => {
    expect(parseRoute('/divisions/divisions/kjv/52/13')).toMatchObject({
      version: 'KJV',
      chapter: 52,
      verse: 13,
    });
  });

  test('with tag modifier (before chapter/verse)', () => {
    expect(parseRoute('/divisions/divisions/KJV/tag.creation/1/1')).toMatchObject({
      tag: 'creation',
      chapter: 1,
      verse: 1,
    });
  });

  test('with search modifier (before chapter/verse)', () => {
    const r = parseRoute('/divisions/divisions/KJV/search.comfort+my+people/40/3');
    expect(r.search).toBe('comfort my people');
    expect(r.chapter).toBe(40);
    expect(r.verse).toBe(3);
  });

  test('with hebrew modifier (before chapter/verse)', () => {
    expect(parseRoute('/divisions/divisions/KJV/hebrew.2490/53/5')).toMatchObject({
      hebrew: 2490,
      chapter: 53,
      verse: 5,
    });
  });

  test('with commentary source only (after chapter/verse)', () => {
    expect(parseRoute('/divisions/divisions/KJV/53/5/commentary.barnes')).toMatchObject({
      commentarySource: 'barnes',
      chapter: 53,
      verse: 5,
    });
    expect(parseRoute('/divisions/divisions/KJV/53/5/commentary.barnes').commentaryID).toBeUndefined();
  });

  test('with commentary source and id (after chapter/verse)', () => {
    expect(parseRoute('/divisions/divisions/KJV/53/5/commentary.barnes/123')).toMatchObject({
      commentarySource: 'barnes',
      commentaryID: '123',
      chapter: 53,
      verse: 5,
    });
  });

  // Legacy forms
  test('legacy /:chapter/:verse', () => {
    expect(parseRoute('/53/5')).toMatchObject({ chapter: 53, verse: 5 });
    expect(parseRoute('/53/5').structure).toBeUndefined();
  });

  test('legacy /:chapter → verse defaults to 1', () => {
    expect(parseRoute('/53')).toMatchObject({ chapter: 53, verse: 1 });
  });

  test('legacy /tag.:slug at root', () => {
    expect(parseRoute('/tag.creation')).toMatchObject({ tag: 'creation' });
    expect(parseRoute('/tag.creation').structure).toBeUndefined();
  });

  test('legacy /search/:query', () => {
    const r = parseRoute('/search/comfort+my+people');
    expect(r.search).toBe('comfort my people');
  });

  test('legacy /hebrew/:strong', () => {
    expect(parseRoute('/hebrew/2490')).toMatchObject({ hebrew: 2490 });
  });

  describe('recognizedSegments', () => {
    test('full canonical path consumes all 5 segments', () => {
      expect(parseRoute('/whole/chapters/kjv/5/4').recognizedSegments).toBe(5);
    });
    test('garbage that does not match consumes 0 segments', () => {
      expect(parseRoute('/wp-admin/setup.php').recognizedSegments).toBe(0);
    });
    test('canonical prefix with trailing junk consumes only the matched prefix', () => {
      // structure/outline/version/chapter/verse = 5; the extra segment is junk
      expect(parseRoute('/whole/chapters/kjv/5/4/junk').recognizedSegments).toBe(5);
    });
    test('legacy /:chapter/:verse consumes 2', () => {
      expect(parseRoute('/5/4').recognizedSegments).toBe(2);
    });
    test('legacy /:chapter consumes 1', () => {
      expect(parseRoute('/5').recognizedSegments).toBe(1);
    });
  });
});

// ─── buildRoute ──────────────────────────────────────────────────────────────

describe('buildRoute', () => {
  const baseState = {
    structure: 'divisions',
    outline: 'divisions',
    version: 'KJV',
    chapter: 1,
    verse: 1,
  };

  test('basic canonical path', () => {
    expect(buildRoute(baseState, () => null)).toBe('/divisions/divisions/kjv/1/1');
  });

  test('with tag', () => {
    const state = { ...baseState, selected_tag: 'Creation' };
    const getTagSlug = (tag) => tag === 'Creation' ? 'creation' : null;
    expect(buildRoute(state, getTagSlug)).toContain('/tag.creation');
  });

  test('showcase_tag takes precedence over selected_tag', () => {
    const state = { ...baseState, selected_tag: 'Creation', showcase_tag: 'Servant' };
    const getTagSlug = (tag) => tag.toLowerCase();
    expect(buildRoute(state, getTagSlug)).toContain('/tag.servant');
    expect(buildRoute(state, getTagSlug)).not.toContain('/tag.creation');
  });

  test('with search query', () => {
    const state = { ...baseState, searchQuery: 'comfort my people' };
    expect(buildRoute(state, () => null)).toContain('/search.comfort+my+people');
  });

  test('hebrew takes precedence over search', () => {
    const state = { ...baseState, searchQuery: 'comfort', hebrewStrongIndex: 2490 };
    const path = buildRoute(state, () => null);
    expect(path).toContain('/hebrew.2490');
    expect(path).not.toContain('/search.');
  });

  test('with commentary mode', () => {
    const state = { ...baseState, commentaryMode: true, commentarySource: 'barnes', commentaryID: '123' };
    const path = buildRoute(state, () => null);
    expect(path).toContain('/commentary.barnes/123');
  });

  test('commentary without id', () => {
    const state = { ...baseState, commentaryMode: true, commentarySource: 'barnes' };
    const path = buildRoute(state, () => null);
    expect(path).toContain('/commentary.barnes');
    expect(path).not.toMatch(/\/commentary\.barnes\/[0-9]/);
  });

  test('output is lowercase', () => {
    const state = { ...baseState, version: 'NRSV', structure: 'Chiastic' };
    const path = buildRoute(state, () => null);
    expect(path).toBe(path.toLowerCase());
  });
});

// ─── Round-trip ──────────────────────────────────────────────────────────────

describe('round-trip stability', () => {
  const getTagSlug = (tag) => tag.toLowerCase().replace(/\s+/g, '-');

  const cases = [
    '/divisions/divisions/kjv/1/1',
    '/chiastic/chiastic/esv/52/13',
    '/divisions/divisions/kjv/search.comfort+my+people/40/3',
    '/divisions/divisions/kjv/hebrew.2490/53/5',
  ];

  cases.forEach((path) => {
    test(`round-trip: ${path}`, () => {
      const parsed = parseRoute(path);
      if (parsed.structure && parsed.chapter && parsed.verse) {
        const rebuilt = buildRoute({
          structure: parsed.structure,
          outline: parsed.outline,
          version: parsed.version,
          chapter: parsed.chapter,
          verse: parsed.verse,
          searchQuery: parsed.search || null,
          hebrewStrongIndex: parsed.hebrew || null,
          commentaryMode: !!parsed.commentarySource,
          commentarySource: parsed.commentarySource,
          commentaryID: parsed.commentaryID,
        }, getTagSlug);
        expect(rebuilt).toBe(path);
      }
    });
  });
});

// ─── normalizeRoute ──────────────────────────────────────────────────────────

describe('normalizeRoute', () => {
  test('returns null for canonical paths (no redirect needed)', () => {
    expect(normalizeRoute('/divisions/divisions/KJV/1/1')).toBeNull();
    expect(normalizeRoute('/')).toBeNull();
    expect(normalizeRoute('')).toBeNull();
  });
});
