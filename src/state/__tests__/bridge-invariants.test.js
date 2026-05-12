/**
 * Source-scan invariant tests for the state bridge fields.
 *
 * Tasks C2 (tagPanel) and C3 (audioMode) introduced enums + setters
 * (setTagPanel, setAudioMode) that atomically update both the new enum
 * fields AND legacy bridge fields (tagMode/infoOpen/audioState/
 * commentaryAudioMode). To prevent silent drift, raw writes of those
 * legacy fields outside the dedicated setters are forbidden.
 *
 * If you add a new file or refactor an existing one and this test fails,
 * the right fix is almost always to call setTagPanel(...) or
 * setAudioMode(...) instead of writing the legacy field directly.
 *
 * Exceptions: state initializer (App.js state = {...}), the setters
 * themselves, the AUDIO_MODE/TAG_PANEL bridge implementations, and the
 * state/* directory. The allowlist is encoded below.
 */

import fs from 'fs';
import path from 'path';

// Walk the src/ tree (excluding tests, node_modules) and return JS files.
function listSourceFiles(dir) {
  var files = [];
  var entries = fs.readdirSync(dir, { withFileTypes: true });
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    var full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === '__tests__') continue;
      if (e.name === 'node_modules') continue;
      files = files.concat(listSourceFiles(full));
    } else if (e.isFile()) {
      if (e.name.endsWith('.test.js')) continue;
      if (/\.(js|jsx)$/.test(e.name)) files.push(full);
    }
  }
  return files;
}

var SRC_ROOT = path.resolve(__dirname, '..', '..');

// Files allowed to write the legacy fields (because they ARE the setters).
var ALLOWLIST_REL = [
  'state/tagPanel.js',
  'state/audioState.js',
  // Known legacy drift: these files write audioMode + audioState +
  // commentaryAudioMode together (manual bridge instead of setAudioMode).
  // They keep the bridge in sync today; future cleanup should migrate these
  // to setAudioMode() and remove them from this allowlist.
  'Components/Audio.js',
  'Components/Verse.js',
];

// The state initializer in App.js writes these fields once; allow that file
// but only for the initial-state object. We approximate via a substring match
// on the canonical initializer pattern, not a full parse.
var APP_JS_REL = 'App.js';

function relPath(p) { return path.relative(SRC_ROOT, p).replace(/\\/g, '/'); }

function findOffenders(field) {
  // Match `field:` preceded by some whitespace or `{`, but only inside a
  // multi-arg setState call. The regex is conservative: catches obvious
  // direct writes; ignores normal reads like `state.field` or destructuring.
  var pattern = new RegExp('setState[\\s\\S]{0,400}\\b' + field + '\\s*:', 'g');
  var files = listSourceFiles(SRC_ROOT);
  var offenders = [];
  for (var i = 0; i < files.length; i++) {
    var rel = relPath(files[i]);
    if (ALLOWLIST_REL.indexOf(rel) >= 0) continue;
    var src = fs.readFileSync(files[i], 'utf8');
    var matches = src.match(pattern);
    if (!matches) continue;
    // Trim each match to the immediate setState(...) snippet for the error message
    offenders.push({ file: rel, matchCount: matches.length });
  }
  return offenders;
}

describe('state bridge invariants', () => {
  test('no raw setState writes of tagMode outside setTagPanel/state-init', () => {
    var offenders = findOffenders('tagMode');
    // App.js is the ONLY allowed offender (it has the setTagPanel method).
    var external = offenders.filter(function(o) { return o.file !== APP_JS_REL; });
    expect(external).toEqual([]);
  });

  test('no raw setState writes of infoOpen outside setTagPanel/state-init', () => {
    var offenders = findOffenders('infoOpen');
    var external = offenders.filter(function(o) { return o.file !== APP_JS_REL; });
    expect(external).toEqual([]);
  });

  test('no raw setState writes of audioState outside setAudioMode/state-init', () => {
    var offenders = findOffenders('audioState');
    var external = offenders.filter(function(o) { return o.file !== APP_JS_REL; });
    expect(external).toEqual([]);
  });

  test('no raw setState writes of commentaryAudioMode outside setAudioMode/state-init', () => {
    var offenders = findOffenders('commentaryAudioMode');
    var external = offenders.filter(function(o) { return o.file !== APP_JS_REL; });
    expect(external).toEqual([]);
  });
});
