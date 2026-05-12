import React, { useContext, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';
import { DataContext } from "../DataContext";
import { AUDIO_MODE, isCommentaryMode } from "../state/audioState";

// Audio host. The CloudFront function `SGMapping` translates:
//   /commentary/{shortcode}/{file}  → /commentary/{S3_dir}/{file}
//   /{VERSION}/{verse_id}           → /mp3/{VERSION}/{VERSION}-{verse_id}.mp3
//   (HEBREW special-cased)
const AUDIO_HOST = "https://audio.scripture.guide";

/** Build the URL for a single verse's audio. */
function verseAudioUrl(version, verseId) {
	return AUDIO_HOST + "/" + version + "/" + verseId;
}

/**
 * Resolve the audio file for a verse under a commentary source.
 * Returns { filename, url, fileIndex, files } or null if no file exists.
 * Centralizes the data-shape handling: `index[verseId][source]` is an
 * array of filenames; we use the first one.
 */
function resolveCommentaryFile(globalData, verseId, source) {
	var allFiles = globalData.commentary_audio && globalData.commentary_audio.files;
	var byVerse = globalData.commentary_audio && globalData.commentary_audio.index;
	if (!allFiles || !allFiles[source]) return null;
	if (!byVerse || !byVerse[verseId] || !byVerse[verseId][source]) return null;

	var filenames = byVerse[verseId][source];
	var filename = Array.isArray(filenames) ? filenames[0] : filenames;
	if (!filename) return null;

	var files = allFiles[source];
	var keys = Object.keys(files);
	var fileIndex = keys.indexOf(filename);
	if (fileIndex < 0) return null;

	return {
		filename: filename,
		url: AUDIO_HOST + "/commentary/" + source + "/" + filename,
		fileIndex: fileIndex,
		files: files,
		keys: keys
	};
}


export default function Audio() {
	var globalData = useContext(DataContext);
	var state = globalData.state;
	if (state.audioMode === AUDIO_MODE.IDLE) return null;
	if (isCommentaryMode(state.audioMode)) return <AudioCommentaryPlayer />;
	return <AudioVersePlayer />;
}


function AudioVersePlayer() {
	var globalData = useContext(DataContext);
	var app = globalData.app;
	var state = globalData.state;
	var audioPointerRef = useRef(0);

	// Compute the queue (current + next) for the active verse.
	var version = state.hebrewMode ? "HEBREW" : state.version;
	var hasAudio = globalData.meta.version[state.version].audio === 1 || state.hebrewMode;

	var url = verseAudioUrl(version, state.active_verse_id);
	var next_url = url;
	var next = null;
	var resolvedPointer = audioPointerRef.current;

	if (hasAudio) {
		var p = state.audioPointer;
		var idx = -1;
		while (idx === -1 && p >= 0) {
			idx = state.highlighted_verse_range.indexOf(state.active_verse_id, p);
			p--;
		}
		if (idx >= 0) {
			resolvedPointer = idx;
			if (idx + 1 < state.highlighted_verse_range.length) {
				next = state.highlighted_verse_range[idx + 1];
				next_url = verseAudioUrl(version, next);
			}
		}
	}

	// Sync the ref + state.audioPointer via effect (NOT during render).
	useEffect(() => {
		if (resolvedPointer === audioPointerRef.current) return;
		audioPointerRef.current = resolvedPointer;
		if (state.audioPointer !== resolvedPointer) {
			app.setState({ audioPointer: resolvedPointer });
		}
	}, [resolvedPointer, state.audioPointer, app]);

	if (!hasAudio) return null;

	var onStart = function() {
		app.setAudioMode(AUDIO_MODE.VERSE_PLAYING);
	};

	var onError = function(e) {
		console.warn("Verse audio failed to load:", url, e);
		app.setAudioMode(AUDIO_MODE.IDLE, app.setUrl.bind(app));
	};

	var onEnded = function() {
		if (next === null ||
			state.highlighted_verse_range.indexOf(state.active_verse_id) < 0 ||
			state.highlighted_verse_range.indexOf(next) < 0) {
			return app.setAudioMode(AUDIO_MODE.IDLE, app.setUrl.bind(app));
		}
		var rangeIdx = -1;
		if (app.arrowPointer === null) app.arrowPointer = 0;
		for (var pointer = app.arrowPointer; rangeIdx === -1 && pointer >= 0; pointer--) {
			rangeIdx = state.highlighted_verse_range.indexOf(state.active_verse_id, pointer);
		}
		rangeIdx++;
		if (rangeIdx >= state.highlighted_verse_range.length) rangeIdx = 0;
		var nexter = state.highlighted_verse_range[rangeIdx];
		app.arrowPointer = audioPointerRef.current = rangeIdx;
		app.setActiveVerse(nexter, undefined, undefined, true, "audio");
	};

	return (
		<span>
			<ReactPlayer
				className='react-player'
				width='0%' height='0%'
				key={11}
				url={url}
				playing={true}
				onStart={onStart}
				onError={onError}
				onEnded={onEnded}
				playbackRate={state.playbackRate || 1}
			/>
			{next ? <ReactPlayer
				className='react-player'
				width='0%' height='0%'
				key={12}
				url={next_url}
				playing={true}
				volume={0}
				muted={true}
				playbackRate={state.playbackRate || 1}
			/> : null}
		</span>
	);
}


function AudioCommentaryPlayer() {
	var globalData = useContext(DataContext);
	var app = globalData.app;
	var state = globalData.state;
	var audioPointerRef = useRef(0);
	var hVersesRef = useRef([]);

	// Pick the verse to look up. If we have a commentary verse range from a
	// previous resolution, use its first verse; otherwise use the focal verse.
	var lookupVerseId = state.commentary_audio_verse_range.length > 0
		? state.commentary_audio_verse_range[0]
		: state.active_verse_id;

	// Fall back to gileadi if the requested source is missing.
	var source = state.commentaryAudio;
	if (!globalData.commentary_audio.files || !globalData.commentary_audio.files[source]) {
		source = "gileadi";
	}

	var current = resolveCommentaryFile(globalData, lookupVerseId, source);

	// Sync audioPointer + highlight-verses range via effect, not during render.
	useEffect(() => {
		if (!current) return;
		var nextPointer = current.fileIndex;
		var verses = current.files[current.filename];
		audioPointerRef.current = nextPointer;
		hVersesRef.current = verses;

		var needsRangeUpdate = !arraysEqual(state.commentary_audio_verse_range, verses);
		if (state.audioPointer !== nextPointer || needsRangeUpdate) {
			app.setState({
				audioPointer: nextPointer,
				commentary_audio_verse_range: verses,
				comSearchMode: false
			});
		}
	}, [current && current.filename, source, app, state.audioPointer, state.commentary_audio_verse_range]);

	if (!current) {
		// No audio file for this verse + source. Surface the failure rather
		// than leaving the player stuck on "Loading".
		console.warn("No commentary audio for verse", lookupVerseId, "source", source);
		setTimeout(function() {
			app.setAudioMode(AUDIO_MODE.IDLE, { commentary_audio_verse_range: [] });
		}, 0);
		return null;
	}

	// Look up the next file in the source's playlist for prefetch.
	var nextFile = current.keys[current.fileIndex + 1];
	var nextUrl = null;
	var nextVerse = null;
	if (nextFile) {
		nextUrl = AUDIO_HOST + "/commentary/" + source + "/" + nextFile;
		var nhVerses = current.files[nextFile];
		if (Array.isArray(nhVerses) && nhVerses.length > 0) nextVerse = nhVerses[0];
	}

	var onStart = function() {
		app.setAudioMode(AUDIO_MODE.COMMENTARY_PLAYING);
	};

	var onError = function(e) {
		console.warn("Commentary audio failed to load:", current.url, e);
		app.setAudioMode(AUDIO_MODE.IDLE, { commentary_audio_verse_range: [] });
	};

	var onEnded = function() {
		if (nextVerse === null || nextVerse === undefined) {
			return app.setAudioMode(AUDIO_MODE.IDLE, { commentary_audio_verse_range: [] });
		}
		app.setActiveVerse(nextVerse, undefined, undefined, "force", "comaudio");
	};

	return (
		<span>
			<ReactPlayer
				className='react-player'
				width='0%' height='0%'
				key={21}
				url={current.url}
				playing={true}
				onStart={onStart}
				onError={onError}
				onEnded={onEnded}
				playbackRate={state.playbackRate || 1}
			/>
			{nextUrl ? <ReactPlayer
				className='react-player'
				width='0%' height='0%'
				key={22}
				url={nextUrl}
				playing={true}
				volume={0}
				muted={true}
				playbackRate={state.playbackRate || 1}
			/> : null}
		</span>
	);
}


function arraysEqual(a, b) {
	if (a === b) return true;
	if (!a || !b) return false;
	if (a.length !== b.length) return false;
	for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
	return true;
}
