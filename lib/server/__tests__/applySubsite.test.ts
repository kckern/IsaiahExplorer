import { applySubsite } from '../applySubsite';

const baseData = (): any => ({
  meta: {
    commentary: { barnes: {}, gileadi: {}, henry: {} },
    version: { KJV: {}, IINST: {}, NRSV: {} },
  },
  custom: {
    dev: { type: 'blacklist', com: ['henry'] },
    spu: { type: 'blacklist', com: ['barnes', 'gileadi'] },
    nonblacklist: { type: 'something-else', com: ['barnes'] },
  },
});

describe('applySubsite', () => {
  test('default subsite: data unchanged', () => {
    const d = baseData();
    const out = applySubsite(d, 'default');
    expect(Object.keys(out.meta.commentary)).toEqual(['barnes', 'gileadi', 'henry']);
  });

  test('dev subsite: henry removed', () => {
    const out = applySubsite(baseData(), 'dev');
    expect(out.meta.commentary.henry).toBeUndefined();
    expect(out.meta.commentary.barnes).toBeDefined();
    expect(out.meta.commentary.gileadi).toBeDefined();
  });

  test('spu subsite: barnes + gileadi removed', () => {
    const out = applySubsite(baseData(), 'spu');
    expect(out.meta.commentary.barnes).toBeUndefined();
    expect(out.meta.commentary.gileadi).toBeUndefined();
    expect(out.meta.commentary.henry).toBeDefined();
  });

  test('subsite without blacklist: data unchanged', () => {
    const out = applySubsite(baseData(), 'nonblacklist');
    expect(Object.keys(out.meta.commentary)).toEqual(['barnes', 'gileadi', 'henry']);
  });

  test('unknown subsite: data unchanged', () => {
    const out = applySubsite(baseData(), 'totally-unknown');
    expect(Object.keys(out.meta.commentary)).toEqual(['barnes', 'gileadi', 'henry']);
  });

  test('returns a new object — original not mutated', () => {
    const d = baseData();
    applySubsite(d, 'dev');
    expect(d.meta.commentary.henry).toBeDefined();
  });
});
