import { subsiteFromHost } from '../subsite';

describe('subsiteFromHost', () => {
  test('isaiah.scripture.guide → default', () => {
    expect(subsiteFromHost('isaiah.scripture.guide')).toBe('default');
  });

  test('dev.isaiah.scripture.guide → dev', () => {
    expect(subsiteFromHost('dev.isaiah.scripture.guide')).toBe('dev');
  });

  test('spu.isaiah.scripture.guide → spu', () => {
    expect(subsiteFromHost('spu.isaiah.scripture.guide')).toBe('spu');
  });

  test('localhost:3001 → default', () => {
    expect(subsiteFromHost('localhost:3001')).toBe('default');
  });

  test('null → default', () => {
    expect(subsiteFromHost(null)).toBe('default');
  });

  test('undefined → default', () => {
    expect(subsiteFromHost(undefined)).toBe('default');
  });

  test('empty string → default', () => {
    expect(subsiteFromHost('')).toBe('default');
  });
});
