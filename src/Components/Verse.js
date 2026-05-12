import React, { useContext, useEffect, useRef, useState } from "react";
import { DataContext } from "../DataContext";
import { Passage } from "./Passage.js";
import { Hebrew } from "./Hebrew.js";
import Tipsy from "react-tipsy";
import sprocket_icon from "../img/interface/sprocket.png";
import play_icon from "../img/interface/play.png";
import playing_icon from "../img/interface/audio.gif";
import loading_icon from "../img/interface/audioload.gif";
import comment_icon from "../img/interface/comment.png";
import loading_img from "../img/interface/message.gif";
import heb_png from "../img/interface/hebrew.png";
import { TAG_PANEL } from "../state/tagPanel";
import { AUDIO_MODE } from "../state/audioState";

export default function VerseColumn() {
	var globalData = useContext(DataContext);
	var app = globalData.app;
var state = globalData.state;
	const [fullsize, setFullsize] = useState(false);
	const lastVersionsRef = useRef([]);

	useEffect(() => {
		var timeout = setTimeout(() => {
			if (state.ready === false) {
				setFullsize(true);
			}
		}, 450);
		return () => clearTimeout(timeout);
	}, [app]);

	if (state.ready === false) {
		var loadingClasses = ["loading"];
		if (fullsize === true) loadingClasses.push("fullsize");
		return (
			<div className="col col2">
				<div className="heading">
					<div className="heading_subtitle" id="outline_subtitle">Verse Details</div>
					<div className="heading_title">□{" "}<span id="outline_title">Verse Reference</span></div>
					<div className="heading_title" id="audio_heading">
						<div id="audio_verse" className="active_audio"><img alt="Play Audio" src={loading_icon} /> Play Audio Verse</div>
						<div id="audio_commentary"><img alt="Select" id="com_option" src={sprocket_icon} /><img alt="Audio Commentary" src={play_icon} /> Play Commentary</div>
						<div id="commentary"><img alt="Commentary" src={comment_icon} /> Read Commentaries</div>
					</div>
				</div>
				<div id="verse" className={loadingClasses.join(" ")}><img alt="Loading" src={loading_img} /><br /> Loading Verse Details...</div>
			</div>
		);
	}
	if ([null, 0, undefined].indexOf(state.active_verse_id) > -1) return false;

	var heading = "□ " + globalData.index[state.active_verse_id].string;

	var versions = lastVersionsRef.current;
	if (!state.spotHover) {
		versions = state.top_versions.slice(0);
		var pos = versions.indexOf(state.version);
		if (pos >= 0) versions.splice(pos, 1);
		if (versions.length > 4) versions = versions.slice(0, 4);
		versions.push(state.version);
		lastVersionsRef.current = versions;
	}

	var hebimg = null;
	if (state.hebrewReady === true)
		hebimg = <img src={heb_png} alt="tag" id="hebIcon" className="tag" onClick={() => {
			if (state.hebrewMode) return app.setState({ hebrewMode: false, hebrewFax: false }, app.clearTag.bind(app));
			app.setState({ hebrewMode: true }, app.setUrl.bind(app));
		}} />;

	var swap_imgs = versions.map((shortcode, key) => {
		var classes = [];
		if (shortcode !== state.version) classes.push("alt");
		return (
			<img
				alt="spot"
				onMouseEnter={() => app.spotVerse(shortcode)}
				onMouseLeave={() => app.spotVerse(state.version)}
				onClick={() => app.setActiveVersion(shortcode)}
				className={classes.join(" ")}
				src={require("../img/versions/" + shortcode.toLowerCase() + ".jpg")}
				key={key}
			/>
		);
	});
	var readhide = "Read Commentaries";
	if (state.commentaryMode) readhide = "Hide Commentaries";
	return (
		<div className="col col2">
			<div className="heading">
				<div className="heading_subtitle">{hebimg}Verse Details</div>
				<div className="heading_title" id="detail_heading">{heading}
					<div className="swapverse" onClick={app.freezeSwap.bind(app)} onMouseLeave={app.reOrderSwap.bind(app)}>
						{swap_imgs}
					</div>
				</div>
				<div className="heading_title" id="audio_heading">
					<AudioVerse />
					<AudioCommentary />
					<button type="button" id="commentary" onClick={() => {
						app.setTagPanel(state.tagMode ? TAG_PANEL.VERSES : TAG_PANEL.CLOSED);
						app.setState({ commentaryMode: !state.commentaryMode, commentary_verse_range: [], selected_verse_id: null, commentary_verse_id: state.active_verse_id }, app.setUrl.bind(app));
					}}><img alt="Commentary" src={comment_icon} /> {readhide}</button>
				</div>
			</div>
			<VersePanel />
		</div>
	);
}

function AudioVerse() {
	var globalData = useContext(DataContext);
	var app = globalData.app;
var state = globalData.state;
	var isAudioDisabled = globalData.meta.version[state.version].audio !== 1 && state.hebrewMode === false;

	function startPlaying() {
		app.setState(
			{
				audioMode: AUDIO_MODE.VERSE_LOADING,
				audioState: "loading",
				commentaryAudioMode: false,
				audioPointer: 0,
				selected_verse_id: null,
				commentary_audio_verse_range: []
			},
			app.setUrl.bind(app)
		);
	}

	function handleClick() {
		if (isAudioDisabled) return false;
		if (state.audioState !== null) {
			app.setAudioMode(AUDIO_MODE.IDLE, function() {
				if (state.commentaryAudioMode) startPlaying();
				app.setUrl();
			});
		} else {
			startPlaying();
			app.setUrl();
		}
	}

	function cyclePlaybackRate() {
		let sequence = {
			"1": 1.25,
			"1.25": 1.5,
			"1.5": 2,
			"2": 1
		};
		let rate = state.playbackRate;
		app.setState({ playbackRate: sequence[rate] || 1 });
	}

	var classes = [];

	let rateLabel = state.playbackRate + "×";
	if (state.playbackRate === 1.5) rateLabel = "1½";
	if (state.playbackRate === 1.25) rateLabel = "1¼";

	var icon = play_icon;
	var text = "Play Audio Verse";
	if (state.audioMode === AUDIO_MODE.VERSE_LOADING) {
		icon = loading_icon;
		text = "Loading Audio Verse";
		classes.push("active_audio");
	}
	if (state.audioMode === AUDIO_MODE.VERSE_PLAYING) {
		icon = playing_icon;
		text = "Pause Audio Verse";
		classes.push("active_audio");
	}
	let isPlaying = state.audioMode === AUDIO_MODE.VERSE_PLAYING || state.audioMode === AUDIO_MODE.COMMENTARY_PLAYING;
	let button = (
		<button
			type="button"
			onClick={cyclePlaybackRate}
			aria-label={"Playback speed: " + rateLabel + (isPlaying ? "" : " (audio not playing)")}
			className={isPlaying ? "rate-pill" : "rate-pill rate-pill--idle"}
		>{rateLabel}</button>
	);
	return <>
		<button
			type="button"
			className={classes.join(" ")}
			onClick={handleClick}
			disabled={isAudioDisabled}
			id="audio_verse"
		><img alt="Play Audio" src={icon} /> {text}</button>
		{button}
	</>;
}

function AudioCommentary() {
	var globalData = useContext(DataContext);
	var app = globalData.app;
var state = globalData.state;
	const [options, setOptions] = useState(false);

	function startPlaying(shortcode) {
		app.setTagPanel(TAG_PANEL.CLOSED);
		app.setState({
			audioMode: AUDIO_MODE.COMMENTARY_LOADING,
			audioState: "loading",
			commentaryAudioMode: true,
			audioPointer: 0,
			commentaryAudio: shortcode
		});
	}

	function handleClick(e) {
		if (e === undefined) return false;
		if (state.audioState !== null) {
			app.setState({
				audioMode: AUDIO_MODE.IDLE,
				audioState: null,
				commentaryAudioMode: false,
				commentary_audio_verse_range: []
			}, function() {
				if (!state.commentaryAudioMode) {
					startPlaying(state.commentaryAudio);
				} else {
					app.setActiveVerse(state.active_verse_id, undefined, undefined, undefined, "audio");
				}
			});
		} else {
			startPlaying(state.commentaryAudio);
		}
	}


	function handleOptions() {
		// Just open the picker; do NOT tear down active playback.
		// The user is choosing a source, not stopping audio. If they pick
		// a different source, startPlaying() below will switch streams.
		setOptions(true);
	}

	function selectOption(e) {
		var shortcode = e.target.options[e.target.selectedIndex].attributes.value.value;
		if (shortcode === "top") return false;
		startPlaying(shortcode);
		setOptions(false);
	}

	if (options) {
		var items = [<option key="top" value="top">Make a selection:</option>];
		for (var i in globalData.meta.audiocom) {
			var it = globalData.meta.audiocom[i];
			items.push(<option key={it.shortcode} value={it.shortcode}> ⤷ {it.title}</option>);
		}
		var selector = <select onChange={selectOption} id="com_selector">{items}</select>;
		return <div id="audio_commentary" onClick={handleClick}>{selector}</div>;
	}

	var classes = [];
	var icon = play_icon;
	var text = "Play Commentary";
	if (state.audioMode === AUDIO_MODE.COMMENTARY_LOADING) {
		icon = loading_icon;
		text = "Loading Commentary";
		classes.push("active_audio");
	}
	if (state.audioMode === AUDIO_MODE.COMMENTARY_PLAYING) {
		icon = playing_icon;
		text = "Pause Commentary";
		classes.push("active_audio");
	}

	return <button
		type="button"
		className={classes.join(" ")}
		id="audio_commentary"
		onClick={handleClick}
	><img alt="Audio Commentary" src={icon} /> {text} <img onClick={(e) => { e.stopPropagation(); handleOptions(); }} alt="Select audio source" id="com_option" src={sprocket_icon} /></button>;
}

function VersePanel() {
	var globalData = useContext(DataContext);
	var app = globalData.app;
var state = globalData.state;
	const [passagesMore, setPassagesMore] = useState(false);
	const [sectionsMore, setSectionsMore] = useState(false);
	const [, setTagsMore] = useState(false);

	function seeMorePassages() {
		setPassagesMore(true);
	}
	function seeMoreSections() {
		setSectionsMore(true);
	}
	function reset() {
		setTagsMore(false);
		setPassagesMore(false);
		setSectionsMore(false);
	}

	useEffect(() => {
		app.spreadVerse();
	});

	var highlights = [null];
	if (state.hebrewMode && state.hebrewStrongIndex !== null && state.hebrewReady) {
		var tmp = globalData.hebrew.high;
		if (tmp[state.hebrewStrongIndex] !== undefined) highlights = tmp[state.hebrewStrongIndex].h;
	}

	return <div id="verse">
		<Hebrew />
		<div className="verse_container">
			<Passage verses={state.active_verse_id} highlights={highlights} spottable={true} wrapperId="verse_text" />
		</div>
		<ExtraVersions highlights={highlights} />
		<TagBox />
		<SeeMoreTags />
		<PassagesBox showFull={passagesMore} resetter={reset} />
		<SeeMore clicker={seeMorePassages} clicked={passagesMore} />
		<SectionsBox showFull={sectionsMore} resetter={reset} />
		<SeeMore clicker={seeMoreSections} clicked={sectionsMore} />
	</div>;
}

function ExtraVersions({ highlights }) {
	var globalData = useContext(DataContext);
	var app = globalData.app;
var state = globalData.state;
	var cells = [];
	var heads = [];
	var num = state.version_views;
	for (var i in state.top_versions) {
		if (i >= num) continue;
		var ver = state.top_versions[i];

		if (globalData["text"][ver] === undefined) cells.push(<td key={i}>Loading...</td>);
		else
			cells.push(
				<td key={i}>
					<Passage plain={1} verses={state.active_verse_id} version={ver} highlights={highlights} />
				</td>
			);
		heads.push(<td key={i}><img alt="Passage Version" src={require("../img/versions/" + ver.toLowerCase() + ".jpg")} onClick={app.setActiveVersion.bind(app, ver)} /></td>);
	}

	var extra = null;
	var heading = null;

	if (num > 1) {
		extra = <div key={2} className={"extraversions count" + num}>
			<table><tbody><tr className="head">{heads}</tr><tr className="cells">{cells}</tr></tbody></table>
		</div>;
		heading = <h4 key={3}>{num} Side-by-side Translations</h4>;
	}
	return <div>
		<Tipsy key={1} content="Number of side-by-side translations" placement="left" trigger="hover focus touch" className="sbs">
			<span key={4} onClick={app.cycleVersionViews.bind(app)} className="vernum">{num}</span>
		</Tipsy>
		{heading}
		{extra}
	</div>;
}

function SeeMoreTags({ clicked }) {
	var globalData = useContext(DataContext);
	var app = globalData.app;
var state = globalData.state;
	if (clicked) return null;
	return <div className="readmore" onClick={app.moreTags.bind(app)}>See More Tags...</div>;
}

function TagBox() {
	var globalData = useContext(DataContext);
	var app = globalData.app;
var state = globalData.state;
	const divElementRef = useRef(null);

	useEffect(() => {
		if (divElementRef.current === null) return;
		var height = divElementRef.current.clientHeight;
		if (height > 90) {
			// keep behavior parity; oversize handling is intentionally disabled
		} else if (height <= 90) {
			// keep behavior parity; oversize handling is intentionally disabled
		}
	});

	var tags = app.getVerseTags(state.active_verse_id);
	var tagLinks = tags.map((tagName, key) => {
		return <TagLink tagName={tagName} key={key} />;
	});

	var classes = ["verse_info_box", "tags"];

	return (
		<div className={classes.join(" ")} ref={divElementRef}>
			<h4>Verse Tags</h4>
			{tagLinks}
		</div>
	);
}

function TagLink({ tagName }) {
	var globalData = useContext(DataContext);
	var app = globalData.app;
var state = globalData.state;
	var classes = ["taglink"];
	if (state.selected_tag === tagName) classes.push("tag_highlighted");
	var tagData = app.getTagData(tagName);
	var content = (
		<div>
			<div className="pedigree"><span>{tagData.parents.filter(v => v !== "root").reverse().join(" » ")}</span></div>
			<div>{tagData.description.trim().replace(/\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)$/g, "\u00a0$1\u00a0$2\u00a0$3")}</div>
		</div>
	);

	return (
		<Tipsy content={content} placement="top" trigger="hover focus touch" className="tagtip">
			<div
				className={classes.join(" ")}
				onMouseEnter={() => app.setPreviewedTag(tagName)}
				onMouseLeave={() => app.setPreviewedTag(null)}
				onClick={() => app.setActiveTag(tagName)}>{tagName}</div>
		</Tipsy>
	);
}

function PassagesBox({ showFull, resetter }) {
	var globalData = useContext(DataContext);
	var app = globalData.app;
var state = globalData.state;
	if (state.active_verse_id === null) return null;

	var entries = state.top_outlines.slice(0);
	for (var i in globalData["meta"]["outline"]) if (entries.indexOf(i) < 0) entries.push(i);
	const Passagelist = entries.map((option, optionKey) => {
		var shortcode = option;
		var index = parseInt(globalData["outlineIndex"][state.active_verse_id][shortcode], 0);
		var outline = globalData["outlines"][shortcode];
		if (typeof outline[index] === "undefined") return null;

		var heading = outline[index];
		var classes = [];
		if (shortcode === state.outline) classes.push("active");

		var item = {};
		item["classes"] = classes;
		item["shortcode"] = shortcode;
		item["heading"] = heading.heading;

		return <PassagesLink key={optionKey} item={item} resetter={resetter} />;
	});
	var classes = ["verse_info_box", "outline"];
	if (!showFull) classes.push("top5");
	return (
		<div className={classes.join(" ")}>
			<h4>Encompassing Passages</h4>
			<div>{Passagelist}</div>
		</div>
	);
}

function PassagesLink({ item, resetter }) {
	var globalData = useContext(DataContext);
	var app = globalData.app;
var state = globalData.state;
	return (
		<div
			onClick={() => {
				app.setActiveOutline(item.shortcode);
				resetter();
			}}
			onMouseEnter={() => app.setPreviewedPassage(item.shortcode)}
			onMouseLeave={() => app.setPreviewedPassage(null)}>
			<div className={item.classes.join(" ")}>
				<img alt="Passage Version" src={require("../img/versions/" + item.shortcode + ".jpg")} /> <span>{item.heading}</span>
			</div>
		</div>
	);
}

function SectionsBox({ showFull, resetter }) {
	var globalData = useContext(DataContext);
	var app = globalData.app;
var state = globalData.state;
	if (state.active_verse_id === null) return null;

	var entries = state.top_structures.slice(0);
	for (var i in globalData["meta"]["structure"]) if (entries.indexOf(i) < 0) entries.push(i);
	const Sectionlist = entries.map((option, optionKey) => {
		var shortcode = option;
		var index = parseInt(globalData["structureIndex"][state.active_verse_id][shortcode], 0);
		var structure = globalData["structures"][shortcode];
		if (structure === undefined) return null;
		var section = structure[index];
		var count = "⦗" + (index + 1) + "/" + structure.length + "⦘";

		var classes = [];
		if (shortcode === state.structure) classes.push("active");

		var item = {};
		item["classes"] = classes;
		item["title"] = globalData["meta"]["structure"][shortcode].title;
		item["shortcode"] = shortcode;
		item["section"] = count + " " + section.description;

		return <SectionsLink key={optionKey} item={item} resetter={resetter} />;
	});

	var classes = ["verse_info_box", "structure"];
	if (!showFull) classes.push("top5");
	return (
		<div className={classes.join(" ")}>
			<h4>Corresponding Structural Sections</h4>
			<div>{Sectionlist}</div>
		</div>
	);
}

function SectionsLink({ item, resetter }) {
	var globalData = useContext(DataContext);
	var app = globalData.app;
var state = globalData.state;
	return (
		<div
			onClick={() => {
				app.setActiveStructure(item.shortcode);
				resetter();
			}}
			onMouseEnter={() => app.setPreviewedSection(item.shortcode)}
			onMouseLeave={() => app.setPreviewedSection(null)}>
			<div className={item.classes.join(" ")}>
				<div className="icon">{item.title}</div>
				<span><img alt="Logo" src={require("../img/structures/" + item.shortcode + ".png")} />{item.section}</span>
			</div>
		</div>
	);
}

function SeeMore({ clicked, clicker }) {
	if (clicked) return null;
	return <div className="readmore" onClick={clicker}>See More...</div>;
}
