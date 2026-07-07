import { resolveKey, NO_PREVENT_DEFAULT_ACTIONS } from './keymap';

// A neutral context: nothing focused, no audio, no search modes.
const IDLE = {
  audioActive: false,
  searchboxFocused: false,
  commentaryAudioMode: false,
  searchMode: false,
  preSearchMode: false,
};

// Helper to build a minimal event.
const ev = (key, extra = {}) => ({ key, ...extra });

describe('resolveKey — direct navigation keys', () => {
  const cases = [
    // [key, expected action]
    ['Enter', 'enterToggleVerse'],

    ['ArrowLeft', 'left'],
    ['ArrowUp', 'up'],
    ['ArrowRight', 'right'],
    ['ArrowDown', 'down'],

    ['PageUp', 'cycleVersionPrev'],
    ['[', 'cycleVersionPrev'],
    ['PageDown', 'cycleVersionNext'],
    [']', 'cycleVersionNext'],

    ['Home', 'cycleOutlinePrev'],
    ['End', 'cycleOutlineNext'],
    ["'", 'cycleOutlineNext'],

    ['Insert', 'cycleStructurePrev'],
    ['Delete', 'cycleStructureNext'],

    ['Tab', 'cycleSection'],

    ['`', 'openCommentary'],
    ['~', 'openCommentary'],

    ['+', 'cycleTag'],
    ['=', 'cycleTag'],

    ['/', 'minusToggleTag'],
    ['*', 'toggleHebrew'],
  ];

  it.each(cases)('%s -> %s', (key, action) => {
    expect(resolveKey(ev(key), IDLE)).toBe(action);
  });
});

describe('resolveKey — Escape', () => {
  it('clears the tag when no audio is active', () => {
    expect(resolveKey(ev('Escape'), IDLE)).toBe('escapeClearTag');
  });

  it('is ignored while audio is active', () => {
    expect(resolveKey(ev('Escape'), { ...IDLE, audioActive: true })).toBeNull();
  });
});

describe('resolveKey — Space (audio)', () => {
  it('toggles verse audio in the idle state', () => {
    expect(resolveKey(ev(' '), IDLE)).toBe('toggleAudioVerse');
  });

  it('toggles commentary audio when commentaryAudioMode is on', () => {
    expect(resolveKey(ev(' '), { ...IDLE, commentaryAudioMode: true })).toBe(
      'toggleCommentaryAudio',
    );
  });

  it('prefers commentary audio even during a search', () => {
    expect(
      resolveKey(ev(' '), {
        ...IDLE,
        commentaryAudioMode: true,
        searchMode: true,
      }),
    ).toBe('toggleCommentaryAudio');
  });

  it('is ignored during searchMode (no commentary audio)', () => {
    expect(resolveKey(ev(' '), { ...IDLE, searchMode: true })).toBeNull();
  });

  it('is ignored during preSearchMode (no commentary audio)', () => {
    expect(resolveKey(ev(' '), { ...IDLE, preSearchMode: true })).toBeNull();
  });
});

describe('resolveKey — type-to-search triggers', () => {
  it('a lowercase letter opens the free-text search', () => {
    expect(resolveKey(ev('a'), IDLE)).toBe('preSearch');
  });

  it('an uppercase letter opens the free-text search', () => {
    expect(resolveKey(ev('Z'), IDLE)).toBe('preSearch');
  });

  it('a letter is ignored once a search is already open (searchMode)', () => {
    expect(resolveKey(ev('a'), { ...IDLE, searchMode: true })).toBeNull();
  });

  it('a letter is ignored once a search is already open (preSearchMode)', () => {
    expect(resolveKey(ev('a'), { ...IDLE, preSearchMode: true })).toBeNull();
  });

  it.each(['0', '5', '9'])('digit %s opens the reference search', (d) => {
    expect(resolveKey(ev(d), IDLE)).toBe('preSearchRef');
  });

  it.each(['.', ';'])('reference punctuation %s opens the reference search', (p) => {
    expect(resolveKey(ev(p), IDLE)).toBe('preSearchRef');
  });

  it('digits open the reference search even during a search (unguarded)', () => {
    expect(resolveKey(ev('3'), { ...IDLE, searchMode: true })).toBe('preSearchRef');
  });
});

describe('resolveKey — searchbox focus passthrough', () => {
  const focused = { ...IDLE, searchboxFocused: true };

  it.each(['ArrowLeft', 'ArrowRight', 'End', 'Home', 'Delete', 'Tab'])(
    '%s falls through to native text editing',
    (key) => {
      expect(resolveKey(ev(key), focused)).toBeNull();
    },
  );

  it('ArrowUp still navigates while the search box is focused', () => {
    expect(resolveKey(ev('ArrowUp'), focused)).toBe('up');
  });

  it('ArrowDown still navigates while the search box is focused', () => {
    expect(resolveKey(ev('ArrowDown'), focused)).toBe('down');
  });

  it("apostrophe still cycles outline while the search box is focused", () => {
    expect(resolveKey(ev("'"), focused)).toBe('cycleOutlineNext');
  });
});

describe('resolveKey — modifier and malformed guards', () => {
  it('ignores Ctrl-chorded keys', () => {
    expect(resolveKey(ev('ArrowLeft', { ctrlKey: true }), IDLE)).toBeNull();
  });

  it('ignores Cmd/Meta-chorded keys', () => {
    expect(resolveKey(ev('ArrowLeft', { metaKey: true }), IDLE)).toBeNull();
  });

  it('returns null for events without a string key', () => {
    expect(resolveKey({}, IDLE)).toBeNull();
    expect(resolveKey(null, IDLE)).toBeNull();
  });

  it('returns null for an unmapped key', () => {
    expect(resolveKey(ev('F5'), IDLE)).toBeNull();
  });

  it('works with an omitted context argument', () => {
    expect(resolveKey(ev('ArrowLeft'))).toBe('left');
  });
});

describe('NO_PREVENT_DEFAULT_ACTIONS', () => {
  it('contains exactly the soft actions that skip preventDefault', () => {
    expect([...NO_PREVENT_DEFAULT_ACTIONS].sort()).toEqual(
      ['escapeClearTag', 'preSearch', 'preSearchRef'].sort(),
    );
  });
});
