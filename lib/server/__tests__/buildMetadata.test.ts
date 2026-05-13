import { buildMetadata } from '../buildMetadata';

const fakeData: any = {
  tags: {
    tagIndex: {
      'Suffering Servant': { slug: 'suffering-servant' },
      'Creation': { slug: 'creation' },
    },
  },
  commentary: {
    comSources: {
      barnes: { name: 'Barnes' },
      gileadi: { name: 'Gileadi' },
    },
  },
  index: { '17656': { chapter: 1, verse: 1 } },
};

const baseState = {
  structure: 'whole',
  outline: 'chapters',
  version: 'IINST',
  chapter: 5,
  verse: 4,
  selected_tag: null,
  showcase_tag: null,
  searchQuery: null,
  hebrewStrongIndex: null,
  commentaryMode: false,
  commentarySource: null,
  commentaryID: null,
};

describe('buildMetadata', () => {
  test('default verse: "Isaiah 5:4 | Isaiah Explorer"', () => {
    const m = buildMetadata(baseState, fakeData, 'https://isaiah.scripture.guide');
    expect(m.title).toBe('Isaiah 5:4 | Isaiah Explorer');
    expect(m.description).toContain('Isaiah 5:4');
    expect(m.alternates?.canonical).toBe('https://isaiah.scripture.guide/whole/chapters/iinst/5/4');
  });

  test('with tag: title leads with tag', () => {
    const m = buildMetadata({ ...baseState, selected_tag: 'Suffering Servant' }, fakeData, 'https://x');
    expect(m.title).toBe('Suffering Servant | Isaiah 5:4');
    expect(m.description).toContain('Suffering Servant');
  });

  test('showcase_tag wins over selected_tag', () => {
    const m = buildMetadata(
      { ...baseState, selected_tag: 'Creation', showcase_tag: 'Suffering Servant' },
      fakeData,
      'https://x'
    );
    expect(m.title).toBe('Suffering Servant | Isaiah 5:4');
  });

  test('unknown tag: falls through to default title', () => {
    const m = buildMetadata({ ...baseState, selected_tag: 'Nonexistent Tag' }, fakeData, 'https://x');
    expect(m.title).toBe('Isaiah 5:4 | Isaiah Explorer');
  });

  test('with search: quoted query in title', () => {
    const m = buildMetadata({ ...baseState, searchQuery: 'comfort my people' }, fakeData, 'https://x');
    expect(m.title).toContain('comfort my people');
    expect(m.description).toContain('comfort my people');
  });

  test('with hebrew: Hebrew Hxxxx label', () => {
    const m = buildMetadata({ ...baseState, hebrewStrongIndex: 6918 }, fakeData, 'https://x');
    expect(m.title).toBe('Hebrew H6918 | Isaiah Explorer');
  });

  test('hebrew beats search', () => {
    const m = buildMetadata(
      { ...baseState, searchQuery: 'comfort', hebrewStrongIndex: 6918 },
      fakeData,
      'https://x'
    );
    expect(m.title).toBe('Hebrew H6918 | Isaiah Explorer');
  });

  test('with commentary: source name + verse', () => {
    const m = buildMetadata(
      { ...baseState, commentaryMode: true, commentarySource: 'barnes' },
      fakeData,
      'https://x'
    );
    expect(m.title).toBe('Isaiah 5:4 | Barnes');
    expect(m.description).toContain('Barnes');
  });

  test('unknown commentary source: falls through to default', () => {
    const m = buildMetadata(
      { ...baseState, commentaryMode: true, commentarySource: 'unknown-source' },
      fakeData,
      'https://x'
    );
    expect(m.title).toBe('Isaiah 5:4 | Isaiah Explorer');
  });

  test('OpenGraph tags present', () => {
    const m = buildMetadata(baseState, fakeData, 'https://x');
    expect(m.openGraph?.title).toBeDefined();
    expect(m.openGraph?.description).toBeDefined();
    expect(m.openGraph?.url).toBeDefined();
    expect(m.openGraph?.type).toBe('article');
    expect(m.openGraph?.siteName).toBe('Isaiah Explorer');
  });

  test('Twitter card present', () => {
    const m = buildMetadata(baseState, fakeData, 'https://x');
    expect(m.twitter?.card).toBe('summary_large_image');
    expect(m.twitter?.title).toBeDefined();
    expect(m.twitter?.description).toBeDefined();
  });

  test('canonical reflects modifier (tag in path)', () => {
    const m = buildMetadata(
      { ...baseState, selected_tag: 'Suffering Servant' },
      fakeData,
      'https://x'
    );
    expect(m.alternates?.canonical).toContain('/tag.suffering-servant');
  });

  test('canonical reflects commentary trailing segments', () => {
    const m = buildMetadata(
      { ...baseState, commentaryMode: true, commentarySource: 'barnes', commentaryID: '123' },
      fakeData,
      'https://x'
    );
    expect(m.alternates?.canonical).toContain('/commentary.barnes/123');
  });
});
