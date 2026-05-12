import { AUDIO_MODE, isPlaying, isLoading, isVerseMode, isCommentaryMode } from './audioState';

describe('audio state predicates', () => {
  test('AUDIO_MODE values are stable', () => {
    expect(AUDIO_MODE.IDLE).toBe('idle');
    expect(AUDIO_MODE.VERSE_LOADING).toBe('verse-loading');
    expect(AUDIO_MODE.VERSE_PLAYING).toBe('verse-playing');
    expect(AUDIO_MODE.COMMENTARY_LOADING).toBe('commentary-loading');
    expect(AUDIO_MODE.COMMENTARY_PLAYING).toBe('commentary-playing');
  });

  test('isPlaying matches both playing modes', () => {
    expect(isPlaying(AUDIO_MODE.VERSE_PLAYING)).toBe(true);
    expect(isPlaying(AUDIO_MODE.COMMENTARY_PLAYING)).toBe(true);
    expect(isPlaying(AUDIO_MODE.VERSE_LOADING)).toBe(false);
    expect(isPlaying(AUDIO_MODE.IDLE)).toBe(false);
  });

  test('isLoading matches both loading modes', () => {
    expect(isLoading(AUDIO_MODE.VERSE_LOADING)).toBe(true);
    expect(isLoading(AUDIO_MODE.COMMENTARY_LOADING)).toBe(true);
    expect(isLoading(AUDIO_MODE.VERSE_PLAYING)).toBe(false);
  });

  test('isVerseMode / isCommentaryMode disambiguate', () => {
    expect(isVerseMode(AUDIO_MODE.VERSE_PLAYING)).toBe(true);
    expect(isVerseMode(AUDIO_MODE.COMMENTARY_PLAYING)).toBe(false);
    expect(isCommentaryMode(AUDIO_MODE.COMMENTARY_LOADING)).toBe(true);
    expect(isCommentaryMode(AUDIO_MODE.VERSE_LOADING)).toBe(false);
  });
});
