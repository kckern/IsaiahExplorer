import React, { useContext, useEffect, useState } from "react";
import { DataContext } from "../DataContext";
import { TaggedVerses, TaggedHeading, TagTree } from "./Tags.js";
import { SearchHeading, SearchResults, SearchBox } from "./Search.js";
import { Commentary } from "./Commentary.js";
import loading_img from "../img/interface/typing.gif";
import loading_version from "../img/interface/version_loading.gif";
import tag_png from "../img/interface/tag.png";
import audio from "../img/interface/audio.png";
import { HebrewSearchHeading } from "./Hebrew.js";

function processSubs(text, verse_id, sub) {
	if (sub === undefined) return text;
	if (sub[verse_id] === undefined) return text;
	var letter_str = sub[verse_id];
	var letters = [];
	for (var i = 0; i < letter_str.length; i++) {
		letters.push(letter_str.charAt(i));
	}

	var format = text.format;
	var otext = text.text + "";
	text = text.text;
	text = text.replace(/^[^a-z]/ig, "");
	text = text.replace(/\/_/g, " ");

	var array = [];
	if (text.includes("/") && text.split(/[/¶]+/g).length <= 5)
		array = text.split(/[/¶]+/g);
	else {
		var tmp = text.split(/([,;.:?!]+)/g);
		for (i = 0; i <= tmp.length; i = i + 2) array.push(tmp[i] + tmp[i + 2] + " ");
		//if too short merge lines
	}

	//Divide text by letters
	var lines = [];
	for (var x in letters) {
		var key = letters[x].charCodeAt(0) - 97;
		lines.push(array[key]);
	}
	text = lines.join("/");

	if (text.match(/[a-z]/ig) === null) text = otext;

	var r = {
		format: format,
		text: text
	};
	return r;
}

export default function PassageColumn() {
	var globalData = useContext(DataContext);
	var app = globalData.app;
var state = globalData.state;
	const [metaOpen, setMetaOpen] = useState(false);
	const [fullsize, setFullsize] = useState(false);

	function toggleDrawer(e) {
		if (typeof e !== "undefined") e.stopPropagation();
		setMetaOpen((prevState) => !prevState);
	}

	useEffect(() => {
		var timeout = setTimeout(() => {
			if (state.ready === false) {
				setFullsize(true);
			}
		}, 300);

		return () => {
			clearTimeout(timeout);
		};
	}, [app]);

	useEffect(() => {
		var textElement = document.getElementById("text");
		if (textElement === null) return undefined;

		var handler = app.checkFloater.bind(app);
		textElement.addEventListener("scroll", handler);

		return () => {
			textElement.removeEventListener("scroll", handler);
		};
	});

	if (state.ready === false) {
		var loadingClasses = ["loading"];
		if (fullsize === true) loadingClasses.push("fullsize");

		var loadingHeadingClasses = ["text_heading"];

		return (
			<div className="col col3">
				<div className="heading">
					<div className="heading_subtitle"> Passage Verses</div>
					<div className="heading_title">
						□{" "}
						<span id="outline_title">Version Text</span>
					</div>
					<div className={loadingHeadingClasses.join(" ")}>
						<span className="section_tile">▽ Section Title</span>
						<br />
						<span id="drarrow">⤷</span>▷ Heading Title
					</div>
				</div>
				<div id="text" className={loadingClasses.join(" ")}>
					<img alt="Loading" src={loading_img} />
					<br />
					Loading Passage Text...
				</div>
			</div>
		);
	}

	var versionName = globalData.meta.version[state.version].title;
	var verse_id = state.active_verse_id;
	var sectionTitle = "";
	var headingTitle = "";
	var version_img = "";
	if (verse_id !== null) {
		var s_index = globalData["structureIndex"][verse_id.toString()][state.structure];
		sectionTitle = globalData["structures"][state.structure][s_index].description;
		var h_index = globalData["outlineIndex"][verse_id.toString()][state.outline];
		headingTitle = globalData["outlines"][state.outline][h_index].heading;
		version_img = require("../img/versions/" + state.version.toLowerCase() + ".jpg");
		if (state.ui_version_loading) version_img = loading_version;
	}
	var title = "Passage Verses";
	var tagimg = (
		<img
			src={tag_png}
			alt="tag"
			id="tagIcon"
			className="tag"
			onClick={() => {
				if (state.tagMode) app.clearTag();
				else app.showcaseTag(null);
			}}
		/>
	);

	var hclasses = ["text_heading"];
	var content = <Passage verses={state.highlighted_verse_range} wrapperId="text" />;
	var heading = (
		<div className={hclasses.join(" ")}>
			<span className="section_tile">▽ {sectionTitle}</span>
			<br />
			<span id="drarrow">⤷</span>▷ {headingTitle}
		</div>
	);
	if (state.selected_tag !== null) {
		content = <TaggedVerses />;
		heading = <TaggedHeading />;
		title = "Tagged Verses";
	}

	if (state.tagMode === true) {
		var tagMeta = globalData["tags"]["tagIndex"][state.showcase_tag];
		content = (
			<div id="text" className="tagContainer">
				<div className="tag_meta">
					{" "}
					<TagTree tagMeta={tagMeta} base="root" />
					<div className="tagTaxFooter" />
				</div>
			</div>
		);
		heading = <TaggedHeading />;
		title = "Tags";
	}
	if (state.searchMode === true) {
		content = <SearchResults />;
		heading = <SearchHeading />;
		title = (tagimg = null);
	}
	if (state.hebrewSearch === true) {
		heading = <HebrewSearchHeading />;
	}
	if (state.preSearchMode === true) {
		title = (tagimg = null);
	}
	if (state.comSearchMode === true) {
		title = "Referenced Verses";
	}
	if (state.hebrewSearch === true) {
		title = "Hebrew Word Matches";
	}

	return (
		<div className="col col3">
			<div className="heading">
				<Commentary />
				<div className="heading_subtitle">
					{tagimg}
					{title}
					<SearchBox />
				</div>
				<div className="heading_title" onClick={() => app.cycleVersion(1)}>
					□{" "}
					<span id="heading_title">
						{versionName}
						<img alt="Version" src={version_img} onClick={toggleDrawer} />
					</span>
				</div>
				{heading}
			</div>
			{content}
			<VersionMeta open={metaOpen} toggle={toggleDrawer} />
		</div>
	);
}

export function Passage({
	verses,
	version,
	spottable,
	sub,
	plain,
	wrapperClass,
	wrapperId,
	highlights
}) {
	var globalData = useContext(DataContext);
	var app = globalData.app;
var state = globalData.state;

	var range = verses;
	if (typeof range !== "object") range = [range];
	var block_index = -1;
	var last_format = null;
	var last_verse_id = null;
	var PassageBlocks = [];
	var thisVersion = state.version;
	if (typeof version === "string") thisVersion = version;
	if (typeof state.spot === "string" && spottable) thisVersion = state.spot;
	for (var x in range) {
		var source = globalData["text"][thisVersion];
		if (typeof source === "undefined") {
			source = globalData["meta"]["version"][thisVersion].sample;
		}
		var verse_id = range[x];
		var verseObj = processSubs(source[verse_id.toString()], verse_id.toString(), sub);

		if (typeof verseObj === "undefined") continue;
		var format = verseObj.format;
		var text = "▫" + verseObj.text;
		if (format !== last_format && (plain !== 1 || block_index === -1)) {
			block_index++;
			PassageBlocks[block_index] = {};
			PassageBlocks[block_index].lines = [];
			PassageBlocks[block_index].type = "p";
		}

		if (plain === 1) {
			text = "▫" + text.replace(/([§¶/_▼▲►▫{} ]+)/gi, " ");
			format = "prose";
		}
		if (format === "poetry") PassageBlocks[block_index].type = "blockquote";

		var parts = text.split(/([§¶/_▼▲►▫]+)/gi);
		for (var y in parts) {
			if (y % 2 !== 0) {
				//Block level
				if (parts[y].indexOf("▼") >= 0) format = "poetry";
				if (parts[y].indexOf("►") >= 0) format = "prose";
				if (parts[y].indexOf("¶") >= 0) {
					block_index++;
					PassageBlocks[block_index] = {};
					if (format === "poetry") PassageBlocks[block_index].type = "blockquote";
					if (format === "prose") PassageBlocks[block_index].type = "p";
					PassageBlocks[block_index].lines = [];
				}
				//Line Level
				var classes = ["verse", format];

				if (parts[y].indexOf("/") >= 0) classes.push("linebreak");
				if (parts[y].indexOf("_") >= 0) classes.push("indent");

				//Ready: block_index with type, format, classes
			} else {
				if (parts[y] === "") continue;

				//Break between non consecutive verses
				if (
					parseInt(verse_id, 0) !== last_verse_id &&
					parseInt(verse_id, 0) !== last_verse_id + 1 &&
					last_verse_id !== null
				) {
					block_index++;
					PassageBlocks[block_index] = {};
					PassageBlocks[block_index].lines = [
						{ verse_id: null, classes: ["break"], line: null }
					];
					block_index++;
					PassageBlocks[block_index] = {};
					PassageBlocks[block_index].lines = [];
				}

				PassageBlocks[block_index].lines.push({
					verse_id: verse_id,
					classes: classes,
					line: parts[y]
				});
				last_verse_id = parseInt(verse_id, 0);
			}
		}
		last_format = format;
	}

	classes = [];
	if (typeof wrapperClass === "string") classes.push(wrapperClass);
	if (state.ui_version_loading) classes.push("greyed_out");

	return (
		<div id={wrapperId} className={classes.join(" ")}>
			{PassageBlocks.map((block, blockKey) => {
				return (
					<PassageBlock
						highlights={highlights}
						type={block.type}
						lines={block.lines}
						key={blockKey}
					/>
				);
			})}
		</div>
	);
}

export function PassageBlock({ type: inType, lines, highlights }) {
	var type = inType;

	if (lines.length === 1 && lines[0].classes[0] === "break") type = "break";

	if (lines.length === 0) return null;

	if (type === "blockquote") {
		return (
			<blockquote>
				{lines.map((line, lineKey) => {
					return <PassageLine highlights={highlights} line={line} key={lineKey} />;
				})}
			</blockquote>
		);
	} else if (type === "break") {
		return <hr />;
	} else {
		return (
			<p>
				{lines.map((line, lineKey) => {
					return <PassageLine highlights={highlights} line={line} key={lineKey} />;
				})}
			</p>
		);
	}
}

export function PassageLine({ line: lineData, highlights }) {
	var globalData = useContext(DataContext);
	var app = globalData.app;
var state = globalData.state;

	function isActive() {
		return parseInt(state.active_verse_id, 0) === parseInt(lineData.verse_id, 0);
	}

	function isCommentary() {
		return (
			state.commentary_audio_verse_range.indexOf(lineData.verse_id) >= 0 ||
			state.commentary_verse_range.indexOf(lineData.verse_id) >= 0
		);
	}

	function isSelected() {
		return parseInt(state.selected_verse_id, 0) === parseInt(lineData.verse_id, 0);
	}

	if (typeof lineData.classes === "undefined") {
		console.log("ERROR");
		console.log(lineData);
		return null;
	}
	lineData.classes.push("v_" + lineData.verse_id);
	if (isActive()) lineData.classes.push("versebox_highlighted");
	if (isSelected()) lineData.classes.push("versebox_selected");
	if (isCommentary()) lineData.classes.push("versetext_com");

	if (lineData.line == null) return null;
	lineData.line = lineData.line.replace(/[{}]/gi, "");

	var line = <span>{lineData.line}</span>;

	if (highlights !== null && highlights !== undefined) {
		if (highlights.length > 0) {
			var regex = null;
			if (highlights[0] === "partialmatch") {
				regex = new RegExp(
					"(" + highlights.slice(1).join("|").replace(/[^A-z| ]/, "") + ")",
					"ig"
				);
			} else regex = new RegExp("\\b(" + highlights.join("|") + ")\\b", "ig");
			var parts = lineData.line.split(regex);
			line = parts.map((val, key) => {
				if (val === "") return null;
				var classes = [];
				if (key % 2 !== 0) classes.push("word_highlight");
				return (
					<span className={classes.join(" ")} key={key}>
						{val}
					</span>
				);
			});
		}
	}
	return (
		<span
			onMouseEnter={() => {
				app.setActiveVerse(lineData.verse_id);
			}}
			onClick={() => app.selectVerse(lineData.verse_id)}
			onContextMenu={(e) => {
				e.preventDefault();
				app.doubleClickVerse(lineData.verse_id, "versebox");
			}}
			className={lineData.classes.join(" ")}>
			{line}{" "}
		</span>
	);
}

function VersionMeta({ open, toggle }) {
	var globalData = useContext(DataContext);
	var app = globalData.app;
var state = globalData.state;
	var classes = ["meta"];
	if (open) classes.push("visible");

	var entries = state.top_versions.slice(0);
	for (var i in globalData["meta"]["version"])
		if (entries.indexOf(i) < 0) entries.push(i);
	const options = entries.map((shortcode, optionKey) => {
		var option = globalData["meta"]["version"][shortcode];
		return (
			<VersionOption
				option={option}
				optionKey={optionKey}
				key={optionKey}
				toggle={toggle}
			/>
		);
	});

	return (
		<div id="version_meta" className={classes.join(" ")}>
			<h4>Available Versions</h4>
			{options}
		</div>
	);
}

function VersionOption({ option, optionKey, toggle }) {
	var globalData = useContext(DataContext);
	var app = globalData.app;
var state = globalData.state;
	var classes = ["option"];
	if (optionKey === 0) classes.push("first top");
	else if (optionKey < 5) classes.push("top");
	else if (optionKey === 5) classes.push("other firstother");
	else classes.push("other");

	var audioimg = null;
	if (globalData.meta.version[option.shortcode].audio === 1)
		audioimg = <img alt="audio" src={audio} />;

	return (
		<div
			className={classes.join(" ")}
			onClick={() => {
				toggle();
				app.setActiveVersion(option.shortcode);
			}}>
			<img
				alt="Option"
				src={require("../img/versions/" + option.shortcode.toLowerCase() + ".jpg")}
			/>
			<div className={"icon"}>
				{audioimg}
				{option.title}
			</div>
			<span>{option.description}</span>
		</div>
	);
}