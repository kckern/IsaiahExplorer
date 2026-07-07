import { routeFromParams, isRecognizedRoute } from '../routeFromParams';

describe('isRecognizedRoute', () => {
  test('bare root (undefined/empty) is recognized', () => {
    expect(isRecognizedRoute(undefined)).toBe(true);
    expect(isRecognizedRoute([])).toBe(true);
  });
  test('canonical path is recognized', () => {
    expect(isRecognizedRoute(['whole', 'chapters', 'kjv', '5', '4'])).toBe(true);
  });
  test('legacy short forms are recognized', () => {
    expect(isRecognizedRoute(['5', '4'])).toBe(true);
    expect(isRecognizedRoute(['5'])).toBe(true);
  });
  test('garbage paths are rejected', () => {
    expect(isRecognizedRoute(['wp-admin', 'setup.php'])).toBe(false);
    expect(isRecognizedRoute(['.env'])).toBe(false);
  });
  test('trailing junk after a canonical path is rejected', () => {
    expect(isRecognizedRoute(['whole', 'chapters', 'kjv', '5', '4', 'junk'])).toBe(false);
  });
  test('out-of-range chapters are rejected', () => {
    expect(isRecognizedRoute(['whole', 'chapters', 'kjv', '99', '1'])).toBe(false);
    expect(isRecognizedRoute(['67', '1'])).toBe(false);
  });
  test('verse 0 is rejected', () => {
    expect(isRecognizedRoute(['5', '0'])).toBe(false);
  });
});

describe('routeFromParams', () => {
  test('undefined slug returns defaults', () => {
    const s = routeFromParams(undefined);
    expect(s.chapter).toBe(1);
    expect(s.verse).toBe(1);
    expect(s.structure).toBe('whole');
    expect(s.outline).toBe('chapters');
    expect(s.version).toBe('IINST');
  });

  test('empty array returns defaults', () => {
    const s = routeFromParams([]);
    expect(s.chapter).toBe(1);
    expect(s.verse).toBe(1);
  });

  test('canonical /whole/chapters/iinst/5/4', () => {
    const s = routeFromParams(['whole', 'chapters', 'iinst', '5', '4']);
    expect(s.structure).toBe('whole');
    expect(s.outline).toBe('chapters');
    expect(s.version).toBe('IINST');
    expect(s.chapter).toBe(5);
    expect(s.verse).toBe(4);
    expect(s.tagSlug).toBeNull();
    expect(s.searchQuery).toBeNull();
    expect(s.hebrewStrongIndex).toBeNull();
    expect(s.commentaryMode).toBe(false);
  });

  test('with tag modifier', () => {
    const s = routeFromParams(['whole', 'chapters', 'iinst', 'tag.suffering-servant', '5', '4']);
    expect(s.tagSlug).toBe('suffering-servant');
    expect(s.chapter).toBe(5);
    expect(s.verse).toBe(4);
  });

  test('with search modifier', () => {
    const s = routeFromParams(['whole', 'chapters', 'iinst', 'search.comfort+my+people', '40', '3']);
    expect(s.searchQuery).toBe('comfort my people');
  });

  test('with hebrew modifier', () => {
    const s = routeFromParams(['whole', 'chapters', 'iinst', 'hebrew.2490', '53', '5']);
    expect(s.hebrewStrongIndex).toBe(2490);
  });

  test('with commentary source only', () => {
    const s = routeFromParams(['whole', 'chapters', 'iinst', '5', '4', 'commentary.barnes']);
    expect(s.commentaryMode).toBe(true);
    expect(s.commentarySource).toBe('barnes');
    expect(s.commentaryID).toBeNull();
  });

  test('with commentary source + id', () => {
    const s = routeFromParams(['whole', 'chapters', 'iinst', '5', '4', 'commentary.barnes', '123']);
    expect(s.commentaryMode).toBe(true);
    expect(s.commentarySource).toBe('barnes');
    expect(s.commentaryID).toBe('123');
  });

  test('legacy /:chapter/:verse', () => {
    const s = routeFromParams(['53', '5']);
    expect(s.chapter).toBe(53);
    expect(s.verse).toBe(5);
    // defaults backfilled
    expect(s.structure).toBe('whole');
    expect(s.outline).toBe('chapters');
    expect(s.version).toBe('IINST');
  });

  test('legacy /:chapter alone defaults verse to 1', () => {
    const s = routeFromParams(['53']);
    expect(s.chapter).toBe(53);
    expect(s.verse).toBe(1);
  });

  test('URL-encoded slug elements are decoded (Next.js gives us %2B for +)', () => {
    const s = routeFromParams(['whole', 'chapters', 'iinst', 'search.comfort%2Bmy%2Bpeople', '40', '3']);
    expect(s.searchQuery).toBe('comfort my people');
  });
});
