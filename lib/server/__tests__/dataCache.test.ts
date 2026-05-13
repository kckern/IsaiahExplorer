import { loadGlobalData, __resetCache } from '../dataCache';

describe('loadGlobalData', () => {
  beforeEach(() => __resetCache());

  test('returns an object with tags, meta, commentary, index', async () => {
    const data = await loadGlobalData();
    expect(data).toBeDefined();
    expect(data.tags).toBeDefined();
    expect(data.tags.tagIndex).toBeDefined();
    expect(data.meta).toBeDefined();
    expect(data.meta.structure).toBeDefined();
    expect(data.meta.version).toBeDefined();
    expect(data.commentary).toBeDefined();
    expect(data.index).toBeDefined();
  });

  test('caches between calls (same reference)', async () => {
    const a = await loadGlobalData();
    const b = await loadGlobalData();
    expect(a).toBe(b);
  });

  test('concurrent calls share the same inflight promise', async () => {
    const [a, b, c] = await Promise.all([
      loadGlobalData(),
      loadGlobalData(),
      loadGlobalData(),
    ]);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });
});
