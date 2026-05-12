import { getFocalTag } from './tagSelectors';

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
