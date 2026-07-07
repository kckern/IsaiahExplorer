import { getFocalTag, getTagVerses, resetTagVerseCache } from './tagSelectors';

describe('getTagVerses', () => {
  beforeEach(() => resetTagVerseCache());

  // A tag whose verses come from tagStructure segments.
  const tags = {
    tagIndex: { Leaf: {}, Parent: {}, Missing: undefined },
    tagStructure: { Leaf: [{ verses: [1, 2] }, { verses: [3] }] },
    superRefs: { Structures: [100, 101], SuperTag: [9] },
    tagChildren: { Parent: ['Leaf', 'SuperTag'] },
    parentTagIndex: {},
  };
  // SuperTag resolves via superRefs; give it a tagIndex entry so it's "known".
  tags.tagIndex.SuperTag = {};

  test('expands tagStructure segments into a flat verse list', () => {
    expect(getTagVerses(tags, 'Leaf')).toEqual([1, 2, 3]);
  });

  test('a parent concatenates its children (structure + superRefs)', () => {
    expect(getTagVerses(tags, 'Parent')).toEqual([1, 2, 3, 9]);
  });

  test('unknown tag falls back to superRefs.Structures', () => {
    expect(getTagVerses(tags, 'Nope')).toEqual([100, 101]);
  });

  test('does NOT mutate the input store (no verses key written back)', () => {
    getTagVerses(tags, 'Leaf');
    expect(tags.tagIndex.Leaf.verses).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(tags.tagIndex.Leaf, 'verses')).toBe(false);
  });

  test('memoizes: same tag returns the identical array reference', () => {
    const a = getTagVerses(tags, 'Leaf');
    const b = getTagVerses(tags, 'Leaf');
    expect(a).toBe(b);
  });

  test('guards against cyclic tag graphs', () => {
    const cyclic = {
      tagIndex: { A: {}, B: {} },
      tagStructure: {},
      superRefs: {},
      tagChildren: { A: ['B'], B: ['A'] },
      parentTagIndex: {},
    };
    expect(getTagVerses(cyclic, 'A')).toEqual([]);
  });
});

describe('getFocalTag', () => {
  test('returns null tag when nothing is selected', () => {
    expect(getFocalTag({ selected_tag: null, showcase_tag: null, previewed_tag: null, tagMode: false }))
      .toEqual({ tag: null, source: null });
  });

  test('returns selected_tag with source=committed', () => {
    expect(getFocalTag({ selected_tag: 'Servant Song', showcase_tag: null, previewed_tag: null, tagMode: false }))
      .toEqual({ tag: 'Servant Song', source: 'committed' });
  });

  test('showcase_tag overrides selected_tag', () => {
    expect(getFocalTag({ selected_tag: 'Servant Song', showcase_tag: 'Vineyard', previewed_tag: null, tagMode: false }))
      .toEqual({ tag: 'Vineyard', source: 'showcase' });
  });

  test('previewed_tag wins in tagMode only when nothing else is set', () => {
    expect(getFocalTag({ selected_tag: null, showcase_tag: null, previewed_tag: 'Hope', tagMode: true }))
      .toEqual({ tag: 'Hope', source: 'previewed' });
  });

  test('previewed_tag ignored when tagMode is false', () => {
    expect(getFocalTag({ selected_tag: null, showcase_tag: null, previewed_tag: 'Hope', tagMode: false }))
      .toEqual({ tag: null, source: null });
  });

  test('previewed_tag ignored when selected_tag exists', () => {
    expect(getFocalTag({ selected_tag: 'Servant Song', showcase_tag: null, previewed_tag: 'Hope', tagMode: true }))
      .toEqual({ tag: 'Servant Song', source: 'committed' });
  });
});
