import React, { useContext, useRef, useState } from "react";
import { DataContext } from "../DataContext";
import { AUDIO_MODE } from "../state/audioState";
import { TAG_PANEL } from "../state/tagPanel";
import AudioMenuPopover from "./AudioMenuPopover";
import play_icon from "../img/interface/play.png";
import playing_icon from "../img/interface/audio.gif";
import loading_icon from "../img/interface/audioload.gif";
import comment_icon from "../img/interface/comment.png";

const COMMENTARY_SOURCE_LABELS = {
	gileadi: "Gileadi",
	mcgee: "McGee",
};

const SPEED_OPTIONS = [1, 1.25, 1.5, 2];

export default function AudioToolbar() {
	var globalData = useContext(DataContext);
	var app = globalData.app;
	var state = globalData.state;
	const [gearOpen, setGearOpen] = useState(false);
	const gearRef = useRef(null);

	// Verse audio state
	var isVerseDisabled = globalData.meta.version[state.version].audio !== 1 && state.hebrewMode === false;
	var isVerseLoading = state.audioMode === AUDIO_MODE.VERSE_LOADING;
	var isVersePlaying = state.audioMode === AUDIO_MODE.VERSE_PLAYING;
	var verseIcon = play_icon;
	var verseLabel = "Verse";
	if (isVerseLoading) { verseIcon = loading_icon; verseLabel = "Loading"; }
	if (isVersePlaying) { verseIcon = playing_icon; verseLabel = "Pause"; }

	// Commentary audio state
	var isCommentaryLoading = state.audioMode === AUDIO_MODE.COMMENTARY_LOADING;
	var isCommentaryPlaying = state.audioMode === AUDIO_MODE.COMMENTARY_PLAYING;
	var sourceName = COMMENTARY_SOURCE_LABELS[state.commentaryAudio] || state.commentaryAudio;
	var commIcon = play_icon;
	var commLabel = sourceName;
	if (isCommentaryLoading) { commIcon = loading_icon; commLabel = "Loading " + sourceName; }
	if (isCommentaryPlaying) { commIcon = playing_icon; commLabel = "Pause " + sourceName; }

	// Read commentary state
	var isReadOpen = state.commentaryMode === true;

	// --- Handlers ---

	function clickVerse() {
		if (isVerseDisabled) return;
		if (state.audioState !== null) {
			app.setAudioMode(AUDIO_MODE.IDLE, app.setUrl.bind(app));
		} else {
			app.setAudioMode(
				AUDIO_MODE.VERSE_LOADING,
				{ audioPointer: 0, selected_verse_id: null, commentary_audio_verse_range: [] },
				app.setUrl.bind(app)
			);
		}
	}

	function clickCommentary() {
		if (state.audioState !== null) {
			app.setAudioMode(AUDIO_MODE.IDLE, { commentary_audio_verse_range: [] });
		} else {
			app.setTagPanel(TAG_PANEL.CLOSED);
			app.setAudioMode(AUDIO_MODE.COMMENTARY_LOADING, { audioPointer: 0 });
		}
	}

	function clickRead() {
		app.setTagPanel(state.tagMode ? TAG_PANEL.VERSES : TAG_PANEL.CLOSED);
		app.setState(
			{
				commentaryMode: !state.commentaryMode,
				commentary_verse_range: [],
				selected_verse_id: null,
				commentary_verse_id: state.active_verse_id,
			},
			app.setUrl.bind(app)
		);
	}

	function switchSource(shortcode) {
		if (state.commentaryAudio === shortcode) return;
		if (isCommentaryLoading || isCommentaryPlaying) {
			// Switch sources without stopping playback (preserves F1 behavior).
			app.setAudioMode(
				AUDIO_MODE.COMMENTARY_LOADING,
				{ audioPointer: 0, commentaryAudio: shortcode }
			);
		} else {
			app.setState({ commentaryAudio: shortcode });
		}
	}

	function setSpeed(rate) {
		app.setState({ playbackRate: rate });
	}

	return (
		<div className="audio-toolbar">
			<div className="audio-toolbar__settings">
				<button
					ref={gearRef}
					type="button"
					className="audio-gear"
					onClick={() => setGearOpen(function(o) { return !o; })}
					aria-label="Audio settings"
					aria-haspopup="menu"
					aria-expanded={gearOpen}
				>⚙</button>
				<AudioMenuPopover open={gearOpen} onClose={() => setGearOpen(false)} triggerRef={gearRef}>
					<div className="audio-options-popover">
						<div className="audio-options__section">
							<div className="audio-options__heading">Playback speed</div>
							<div className="audio-speed-chips">
								{SPEED_OPTIONS.map(function(rate) {
									return (
										<button
											key={rate}
											type="button"
											className={"audio-speed-chip" + (state.playbackRate === rate ? " audio-speed-chip--active" : "")}
											onClick={() => setSpeed(rate)}
										>{rate}×</button>
									);
								})}
							</div>
						</div>
						<div className="audio-options__section">
							<div className="audio-options__heading">Commentary source</div>
							<div className="audio-source-list">
								{Object.values(globalData.meta.audiocom).map(function(src) {
									var isActive = state.commentaryAudio === src.shortcode;
									var label = COMMENTARY_SOURCE_LABELS[src.shortcode] || src.short_title || src.title || src.shortcode;
									return (
										<button
											key={src.shortcode}
											type="button"
											className={"audio-source-item" + (isActive ? " audio-source-item--active" : "")}
											onClick={() => switchSource(src.shortcode)}
										>
											<span className="audio-source-item__bullet">{isActive ? "●" : "○"}</span>
											{label}
										</button>
									);
								})}
							</div>
						</div>
					</div>
				</AudioMenuPopover>
			</div>
			<div className="audio-toolbar__actions">
				<button
					type="button"
					id="audio_verse"
					className="audio-action"
					onClick={clickVerse}
					disabled={isVerseDisabled}
					aria-pressed={isVersePlaying}
				>
					<img alt="" src={verseIcon} aria-hidden="true" />
					<span className="audio-action__label">{verseLabel}</span>
				</button>
				<button
					type="button"
					id="audio_commentary"
					className="audio-action"
					onClick={clickCommentary}
					aria-pressed={isCommentaryPlaying}
				>
					<img alt="" src={commIcon} aria-hidden="true" />
					<span className="audio-action__label">{commLabel}</span>
				</button>
				<button
					type="button"
					id="commentary"
					className="audio-action"
					onClick={clickRead}
					aria-pressed={isReadOpen}
				>
					<img alt="" src={comment_icon} aria-hidden="true" />
					<span className="audio-action__label">{isReadOpen ? "Hide" : "Read"}</span>
				</button>
			</div>
		</div>
	);
}
