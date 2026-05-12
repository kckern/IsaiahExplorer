import { TAG_PANEL, derivedTagMode, derivedInfoOpen } from './tagPanel';

describe('tagPanel enum', () => {
  test('enum values are stable', () => {
    expect(TAG_PANEL.CLOSED).toBe('closed');
    expect(TAG_PANEL.VERSES).toBe('verses');
    expect(TAG_PANEL.TREE).toBe('tree');
  });

  test('derivedTagMode: tagMode is true in verses or tree, false in closed', () => {
    expect(derivedTagMode(TAG_PANEL.CLOSED)).toBe(false);
    expect(derivedTagMode(TAG_PANEL.VERSES)).toBe(true);
    expect(derivedTagMode(TAG_PANEL.TREE)).toBe(true);
  });

  test('derivedInfoOpen: infoOpen is true only in tree', () => {
    expect(derivedInfoOpen(TAG_PANEL.CLOSED)).toBe(false);
    expect(derivedInfoOpen(TAG_PANEL.VERSES)).toBe(false);
    expect(derivedInfoOpen(TAG_PANEL.TREE)).toBe(true);
  });
});
