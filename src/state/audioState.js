/**
 * Audio mode enum + predicates.
 *
 * Replaces the pair of fields (state.audioState ∈ {null,"loading","playing"}
 * × state.commentaryAudioMode ∈ {true,false}) which had 6 combinations but
 * only 5 valid ones, and where the meaning of "loading" depended on the
 * second boolean.
 */
export const AUDIO_MODE = {
  IDLE: 'idle',
  VERSE_LOADING: 'verse-loading',
  VERSE_PLAYING: 'verse-playing',
  COMMENTARY_LOADING: 'commentary-loading',
  COMMENTARY_PLAYING: 'commentary-playing',
};

export function isPlaying(mode) {
  return mode === AUDIO_MODE.VERSE_PLAYING || mode === AUDIO_MODE.COMMENTARY_PLAYING;
}

export function isLoading(mode) {
  return mode === AUDIO_MODE.VERSE_LOADING || mode === AUDIO_MODE.COMMENTARY_LOADING;
}

export function isVerseMode(mode) {
  return mode === AUDIO_MODE.VERSE_LOADING || mode === AUDIO_MODE.VERSE_PLAYING;
}

export function isCommentaryMode(mode) {
  return mode === AUDIO_MODE.COMMENTARY_LOADING || mode === AUDIO_MODE.COMMENTARY_PLAYING;
}

// Bridge accessors for transitional migration: derived legacy fields.
export function legacyAudioState(mode) {
  if (isLoading(mode)) return 'loading';
  if (isPlaying(mode)) return 'playing';
  return null;
}

export function legacyCommentaryAudioMode(mode) {
  return isCommentaryMode(mode);
}

/**
 * Map legacy (audioState, commentaryAudioMode) pair to AUDIO_MODE.
 * Used by transitional writers that compute a new legacy audioState value
 * but leave commentaryAudioMode unchanged.
 */
export function audioModeFromLegacy(legacyState, commentary) {
  if (legacyState === null || legacyState === undefined) return AUDIO_MODE.IDLE;
  if (legacyState === 'loading') {
    return commentary ? AUDIO_MODE.COMMENTARY_LOADING : AUDIO_MODE.VERSE_LOADING;
  }
  if (legacyState === 'playing') {
    return commentary ? AUDIO_MODE.COMMENTARY_PLAYING : AUDIO_MODE.VERSE_PLAYING;
  }
  return AUDIO_MODE.IDLE;
}
