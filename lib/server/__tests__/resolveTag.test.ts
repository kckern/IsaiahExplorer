import { resolveTagFromSlug } from '../resolveTag';

const data: any = {
  tags: {
    tagIndex: {
      'Suffering Servant': { slug: 'suffering-servant' },
      'Creation': { slug: 'creation' },
      'God of Israel': { slug: 'god-of-israel' },
    },
  },
};

describe('resolveTagFromSlug', () => {
  test('resolves known slug', () => {
    expect(resolveTagFromSlug('suffering-servant', data)).toBe('Suffering Servant');
  });

  test('resolves slug with hyphenated words', () => {
    expect(resolveTagFromSlug('god-of-israel', data)).toBe('God of Israel');
  });

  test('returns null for unknown slug', () => {
    expect(resolveTagFromSlug('does-not-exist', data)).toBeNull();
  });

  test('returns null when slug is null', () => {
    expect(resolveTagFromSlug(null, data)).toBeNull();
  });

  test('returns null when tagIndex missing', () => {
    expect(resolveTagFromSlug('creation', {} as any)).toBeNull();
    expect(resolveTagFromSlug('creation', { tags: {} } as any)).toBeNull();
  });
});
