import React, { useContext, useEffect, useRef, useState } from "react";
import { DataContext } from "../DataContext";
import { Passage } from "./Passage.js";
import { Hebrew } from "./Hebrew.js";
import Tipsy from "react-tipsy";
import play_icon from "../img/interface/play.png";
import loading_img from "../img/interface/message.gif";
import heb_png from "../img/interface/hebrew.png";
import AudioToolbar from "./AudioToolbar";

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
						<div className="audio-toolbar">
							<div className="audio-toolbar__settings">
								<button type="button" className="audio-gear" disabled aria-label="Audio settings">⚙</button>
							</div>
							<div className="audio-toolbar__actions">
								<button type="button" className="audio-action" disabled>
									<img alt="" src={play_icon} aria-hidden="true" />
									<span className="audio-action__label">Verse</span>
								</button>
								<button type="button" className="audio-action" disabled>
									<img alt="" src={play_icon} aria-hidden="true" />
									<span className="audio-action__label">Commentary</span>
								</button>
								<button type="button" className="audio-action" disabled>
									<img alt="" src={play_icon} aria-hidden="true" />
									<span className="audio-action__label">Read</span>
								</button>
							</div>
						</div>
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
					<AudioToolbar />
				</div>
			</div>
			<VersePanel />
		</div>
	);
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

	// Kick off background fetches for any side-by-side versions whose text
	// isn't loaded yet — otherwise the cells below sit on "Loading..." forever.
	useEffect(() => {
		for (var i = 0; i < num && i < state.top_versions.length; i++) {
			var ver = state.top_versions[i];
			if (ver && globalData["text"][ver] === undefined) app.loadVersionText(ver);
		}
	}, [num, state.top_versions, state.active_verse_id, app, globalData]);

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

function SeeMoreTags() {
	var globalData = useContext(DataContext);
	var app = globalData.app;
	var state = globalData.state;
	// Hide the "See More Tags…" affordance when the row is already expanded,
	// or when the verse has so few tags that everything fits in the collapsed
	// box anyway (the .overflowing modifier is set by TagBox below).
	if (state.more_tags) return null;
	return <div className="readmore tags-readmore" onClick={app.moreTags.bind(app)}>See More Tags…</div>;
}

function TagBox() {
	var globalData = useContext(DataContext);
	var app = globalData.app;
	var state = globalData.state;
	const divElementRef = useRef(null);
	const [overflowing, setOverflowing] = useState(false);

	// Measure after each render. The box is collapsed by default; if the actual
	// content (scrollHeight) is taller than the visible (clientHeight) area, the
	// row should advertise itself as overflowing — TagBox renders with a class
	// the CSS reads, and SeeMoreTags decides whether to show the affordance.
	useEffect(() => {
		var el = divElementRef.current;
		if (!el) return;
		var isOver = el.scrollHeight - el.clientHeight > 1;
		if (isOver !== overflowing) setOverflowing(isOver);
	});

	var tags = app.getVerseTags(state.active_verse_id);
	var tagLinks = tags.map((tagName, key) => {
		return <TagLink tagName={tagName} key={key} />;
	});

	var classes = ["verse_info_box", "tags"];
	if (state.more_tags) classes.push("showfull");
	if (overflowing && !state.more_tags) classes.push("overflowing");

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
