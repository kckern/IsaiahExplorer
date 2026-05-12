import React, { useContext, useEffect, useRef, useState } from "react";
import {DataContext} from '../DataContext';
import { Passage } from "./Passage.js";  

import tag_png from '../img/interface/tag.png';


export function TagFloater({ floater }) {
	var globalData = useContext(DataContext);
	var app = globalData.app;
var state = globalData.state;

	useEffect(() => {
		var fn = app.checkFloater.bind(app);
		fn();
	});

	var tag = state.selected_tag;
	if (tag === null) return null;
	var tagMeta = globalData["tags"]["tagIndex"][tag];
	if (tagMeta.type === "chiasm" || tagMeta.type === "parallel") return null;
	var strc = globalData["tags"]["tagStructure"][tag];
	var floaters = floater;
	var key = null;
	var index = state.selected_tag_block_index;
	var keys = Object.keys(floaters);

	if (keys.length === 1) key = keys[0];
	if (key === null) key = tag + index;

	if (floaters[key] === undefined) {
		for (var i in strc) {
			var j = strc[i].verses.indexOf(state.active_verse_id);
			if (j === -1) continue;
			index = j;
		}
		key = keys[0];
	}

	var floaterContent = floaters[key];

	return <div id="floater" style={{ display: "block" }}>{floaterContent}</div>;
}

export function TaggedVerses() {
	var globalData = useContext(DataContext);
	var app = globalData.app;
var state = globalData.state;
	var tagMeta = globalData["tags"]["tagIndex"][state.selected_tag];

	if (tagMeta.type === "chiasm") return <TagChiasm />;
	if (tagMeta.type === "parallel") return <TagParallel />;
	return <TagBlocks />;
}

export function TaggedHeading() {
	var globalData = useContext(DataContext);
	var app = globalData.app;
var state = globalData.state;

	function setTag(newTag) {
		var tagData = app.getTagData(newTag);
		if (typeof tagData !== "undefined") {
			app.setActiveTag(newTag, null, true);
		}
	}

	function openTagMeta(e) {
		if (state.tagMode === true) return false;
		if (e.target.parentElement.className === "leaf") return false;
		if (e.target.parentElement.className === "branch") return false;
		app.setState({ infoOpen: true, commentaryMode: false }, function() {
			setTimeout(this.scrollTagTree.bind(this), 1000);
		}.bind(app));
	}

	var key_tag = state.selected_tag;
	if (state.showcase_tag !== null) key_tag = state.showcase_tag;
	if (state.tagMode && key_tag === null) key_tag = state.previewed_tag;

	var rawTagMeta = globalData["tags"]["tagIndex"][key_tag];
	var tagMeta = rawTagMeta !== undefined
		? Object.assign({}, rawTagMeta, { tagName: key_tag })
		: undefined;

	var tagBox = null;
	if (key_tag === null) {
		tagBox = null;
		key_tag = "Tag Taxonomy";
	} else if (state.infoOpen !== true)
		tagBox = [<ParentLinks tagMeta={tagMeta} key={1} />, <div className="taglink" key={2}>{key_tag}</div>];
	else
		tagBox = [
			<div className="tagTax" key={3}>Tag Taxonomy</div>,
			<TagTree tagMeta={tagMeta} base="root" key={4} />,
			<div key={5} className="tagTaxFooter"></div>
		];

	var classes = ["tag_meta"];
	var hclasses = ["text_heading"];

	var prevnext = [];
	if (tagMeta !== undefined) {
		if (tagMeta.next !== undefined)
			prevnext.push(<div key={1} className="nexttag" id="tag_next" onClick={() => setTag(tagMeta.next)}>»</div>);
		if (tagMeta.prev !== undefined)
			prevnext.push(<div key={2} className="prevtag" id="tag_prev" onClick={() => setTag(tagMeta.prev)}>«</div>);
	}

	return (
		<div className={hclasses.join(" ")}>
			<div className={classes.join(" ")} onClick={(e) => openTagMeta(e)}>
				{tagBox}
			</div>
			{prevnext}
			<div className="tagtitle">
				<img src={tag_png} alt="tag" />
				<span>{key_tag}</span>
			</div>
		</div>
	);
}

function ParentLinks({ tagMeta }) {
	var globalData = useContext(DataContext);
	var app = globalData.app;
var state = globalData.state;

	if (tagMeta === undefined) {
		return null;
	}
	var i = 0;
	var items = tagMeta.parents.slice(0).reverse().map((val) => {
		if (val === "root") return null;
		i++;
		return (
			<span key={i}>
				<div
					className="taglink"
					onMouseEnter={() => app.setPreviewedTag(val, true, tagMeta.tagName)}
					onMouseLeave={() => app.setPreviewedTag(null)}>{val}</div>
				<span>»</span>
			</span>
		);
	});

	return <span>{items}</span>;
}

export function TagTree({ base }) {
	var globalData = useContext(DataContext);
	var app = globalData.app;
var state = globalData.state;
	const [open, setOpen] = useState(false);

	function clickBranch(tag) {
		setOpen((prevOpen) => {
			if (!prevOpen) {
				app.showcaseTag(tag);
			} else {
				app.setState({ showcase_tag: null });
			}
			return !prevOpen;
		});
	}

	function openTree() {
		if (open === true) return false;
		if (base === "Recently Viewed Tags" && state.tagMode) {
			setOpen(true);
			return true;
		}
		if (globalData["tags"]["tagIndex"][state.selected_tag] !== undefined) {
			if (globalData["tags"]["tagIndex"][state.selected_tag].parents.indexOf(base) >= 0) {
				setOpen(true);
				return true;
			}
		}
		if (globalData["tags"]["tagIndex"][state.showcase_tag] !== undefined) {
			if (globalData["tags"]["tagIndex"][state.showcase_tag].parents.indexOf(base) >= 0) {
				setOpen(true);
				return true;
			}
		}
		if (state.showcase_tag === base) {
			setOpen(true);
			return true;
		}
	}

	useEffect(() => {
		openTree();
		// openTree closes over base; the relevant changes are tracked below
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state.selected_tag, state.showcase_tag, state.tagMode, base]);

	var meta = globalData["tags"]["tagIndex"][base];
	var desc = "";
	if (meta !== undefined) desc = meta.description;
	var children = globalData["tags"]["parentTagIndex"][base];
	if (children === undefined) return <TagTreeLeaf tag={base} desc={desc} />;
	var childrenComp = children.map((val, key) => {
		return <TagTree key={key} base={val} />;
	});
	var classes = ["branch"];
	if (open) classes.push("open");
	if (open === false) childrenComp = null;
	if (base === state.showcase_tag) classes.push("highlight");
	if (globalData["tags"]["tagIndex"][state.showcase_tag] !== undefined)
		if (globalData["tags"]["tagIndex"][state.showcase_tag].parents.indexOf(base) >= 0)
			classes.push("highlight");
	return (
		<div className={"tagtree base_" + base.replace(/[^A-Z]/gi, "")}>
			<div
				className={classes.join(" ")}
				onClick={() => clickBranch(base)}
				onMouseEnter={() => app.setPreviewedTag(base, true)}
				onMouseLeave={() => app.setPreviewedTag(null)}>
				<div className="taglink parentTag">{base}</div>
				<div className="tagDesc">{desc}</div>
			</div>
			{childrenComp}
		</div>
	);
}

function TagTreeLeaf({ tag, desc }) {
	var globalData = useContext(DataContext);
	var app = globalData.app;
var state = globalData.state;

	function handleClick() {
		if (tag === state.selected_tag) return false;
		var tag_verses = globalData["tags"]["tagIndex"][tag].verses;
		var verse = app.active_verse_id;
		if (tag_verses.indexOf(verse) === -1) verse = tag_verses[0];
		app.setState({ active_verse_id: verse, selected_verse_id: null }, function(tag) {
			this.setActiveTag(tag);
		}.apply(app, [tag]));
	}

	var classes = ["leaf"];
	if (tag === state.selected_tag) classes.push("highlight");
	if (tag === state.showcase_tag) classes.push("highlight");

	return (
		<div className={classes.join(" ")}>
			<div
				className="taglink"
				onMouseEnter={() => app.setPreviewedTag(tag)}
				onMouseLeave={() => app.setPreviewedTag(null)}
				onClick={handleClick}>{tag}</div>
			<div className="tagDesc">{desc}</div>
		</div>
	);
}

function getAllIndexes(arr, val) {
	var indexes = [];
	var i = -1;
	while ((i = arr.indexOf(val, i + 1)) !== -1) {
		indexes.push(i);
	}
	return indexes;
}

function TagBlocks() {
	var globalData = useContext(DataContext);
	var app = globalData.app;
var state = globalData.state;
	const activeBlockIndex = useRef(null);

	function handleDescClick(verseId, classes, index, count) {
		if (classes.indexOf("active") < 0) {
			app.setState({ allCollapsed: false, selected_verse_id: null }, app.setTagBlock(index, verseId));
		} else if (count > 1) {
			app.setState(
				{ allCollapsed: true, selected_verse_id: null, selected_tag_block_index: null },
				app.checkFloater.bind(app)
			);
		}
	}

	useEffect(() => {
		// No deps array: activeBlockIndex.current is updated during render at line
		// ~355 (entries.map callback). This effect must fire after every render
		// to forward the latest ref value to checkFloater.
		app.checkFloater({ active_block_index: activeBlockIndex.current });
	});

	useEffect(() => {
		// Mount-only initialisation. Two statements replace a setState(arg, cb)
		// call whose callback slot was being passed setTagBlock's return value
		// (undefined) — the original intent was "do A, then B".
		app.setState({
			allCollapsed: false,
			selected_tag_block_index: activeBlockIndex.current
		});
		app.setTagBlock(activeBlockIndex.current, state.active_verse_id);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	var tagMeta = globalData["tags"]["tagIndex"][state.selected_tag];
	var entries = [];
	for (var i in globalData["tags"]["tagStructure"][state.selected_tag])
		entries.push(globalData["tags"]["tagStructure"][state.selected_tag][i]);

	var count = entries.length;

	var subscript = null;
	var details = null;
	var cite_str = null;
	if (typeof tagMeta.cite === "string" && tagMeta.cite !== "") cite_str = <div className="cite">{tagMeta.cite}</div>;
	if (tagMeta.subscript !== undefined) subscript = <div className="detail sub">{tagMeta.subscript}</div>;
	var details_str = null;
	if (typeof tagMeta.details === "string" && tagMeta.details !== "") details_str = <div>{app.addLinks(tagMeta.details)}</div>;
	var descr_str = null;
	var desc = tagMeta.description.trim().replace(/\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)$/g, "\u00a0$1\u00a0$2\u00a0$3");
	if (typeof tagMeta.description === "string" && tagMeta.description !== "") descr_str = <h4>{app.addLinks(desc)}</h4>;
	if (details_str !== null || descr_str !== null || cite_str !== null)
		details = <div className="detail">{descr_str}{details_str}{cite_str}</div>;
	var done = false;

	var pointerTagBlockIndex = null;
	if (app.arrowPointer !== null && app.arrowPointer !== undefined) {
		var inblocks = [];
		for (var x in entries) {
			if (entries[x].verses.indexOf(state.active_verse_id) > -1) inblocks.push(parseInt(x, 0));
		}
		var all_verses = state.highlighted_verse_range;
		var verse_indeces = getAllIndexes(all_verses, state.active_verse_id);
		var pointer = app.arrowPointer;
		var instanceIndex = verse_indeces.indexOf(pointer);
		if (instanceIndex === -1) instanceIndex = 0;
		pointerTagBlockIndex = inblocks[instanceIndex];
	}
	const forceIndex = pointerTagBlockIndex;

	var blocks = entries.map((entry, key) => {
		var classes = ["verses"];
		var desc_classes = ["desc"];
		var isFloater = false;

		var heading = null;
		var detail = null;
		var post_details = null;

		var selected_tag_block_index = state.selected_tag_block_index;
		if (forceIndex !== null) selected_tag_block_index = forceIndex;

		var conditions =
			selected_tag_block_index === key ||
			(entry.verses.indexOf(state.active_verse_id) > -1 && selected_tag_block_index === null);

		if (entry.heading !== undefined) heading = <h3 className="tag_head" key={"h" + key}>{entry.heading}</h3>;
		if (state.allCollapsed !== true && done === false) {
			if (conditions) {
				done = true;
				activeBlockIndex.current = key;
				classes.push("active");
				desc_classes.push("tag_desc_highlighted");
				isFloater = true;
				if (entry.details !== undefined) detail = <div className="detail">{app.addLinks(entry.details)}</div>;
				if (entry.post_details !== undefined) post_details = <div className="post_detail">{app.addLinks(entry.post_details)}</div>;
			}
		}

		var showdesc = entry.desc;
		var highlights = null;
		if (entry.highlight !== undefined) highlights = entry.highlight;

		var label = null;
		var match = /\s*\[(.*?)\]\s*(.*)/g.exec(entry.desc);
		if (match !== null && label === null) {
			label = <span className="label">{match[1]}</span>;
			showdesc = match[2];
		}

		showdesc = app.addLinks(showdesc);

		var item = [
			heading,
			<div
				key={"item" + key}
				className={desc_classes.join(" ")}
				onMouseEnter={() => app.highlightTaggedVerses(entry.verses.map(Number))}
				onClick={() => handleDescClick(entry.verses.map(Number)[0], classes, key, count)}>
				<div className="tagref">{entry.ref}</div>
				{label}
				{showdesc}
			</div>
		];
		if (count === 1 && entry.desc === "") {
			item = <div className="SearchReference">{entry.ref}</div>;
			isFloater = false;
		} else if (count === 1) {
			classes.push("active");
		}
		if (isFloater) app.saveFloater(state.selected_tag + key, item);

		return (
			<div className="taggedblock" key={key} onMouseEnter={() => app.setState({ mouseBlockIndex: key })}>
				{item}
				{detail}
				<Passage
					verses={entry.verses}
					sub={entry.sub}
					highlights={highlights}
					wrapperId={null}
					wrapperClass={classes.join(" ")}
				/>
				{post_details}
			</div>
		);
	});

	var blockClasses = ["blocks", "tagged"];
	return (
		<div id="text" className={blockClasses.join(" ")}>
			{details}
			{blocks}
			{subscript}
		</div>
	);
}

function TagParallel() {
	var globalData = useContext(DataContext);
	var app = globalData.app;
var state = globalData.state;

	function readMore(i) {
		var tagstr = state.selected_tag.toLowerCase().replace(/[^a-z]/g, "");
		var element = document.getElementById(i + "readMore" + tagstr);
		element.style.display = "none";
		document.getElementById(i + "content" + tagstr).className = "row fullrow";
	}

	useEffect(() => {
		var textNode = document.getElementById("text");
		if (textNode === null) return;

		var tagstr = state.selected_tag.toLowerCase().replace(/[^a-z]/g, "");
		if (textNode.querySelectorAll(".versebox_highlighted").length === 0) return;

		var tagMeta = globalData["tags"]["tagIndex"][state.selected_tag];
		if (tagMeta.verses[0] !== state.active_verse_id)
			textNode
				.querySelectorAll(".versebox_highlighted")[0]
				.parentNode.parentNode.parentNode.parentNode.previousSibling.previousSibling.scrollIntoView();
		for (var i = 1; i <= document.querySelectorAll("#parTable .row").length; i++) {
			var row = document.getElementById(i + "content" + tagstr);
			if (row === null) continue;

			var cells = row.querySelectorAll("td>div");
			var left = cells[0].offsetHeight;
			var right = cells[1] === undefined ? 0 : cells[1].offsetHeight;

			if (left < 150 && right < 150) readMore(i);
			else row.className = "row minirow";
		}
	}, []);

	var tagstr = state.selected_tag.toLowerCase().replace(/[^a-z]/g, "");
	var tagMeta = globalData["tags"]["tagIndex"][state.selected_tag];
	var tagStructure = globalData["tags"]["tagStructure"][state.selected_tag];
	const items = [];
	let keys = Object.keys(tagStructure);
	for (var k in keys) {
		let alpha = keys[k].replace(/\d+/g, "");
		if (alpha !== "A") continue;
		let i = keys[k].replace(/\D+/g, "");

		var left_label = null;
		var l_desc = tagStructure[i + "A"].desc;
		var match = /\s*\[(.*?)\]\s*(.*)/g.exec(l_desc);
		if (match !== null) {
			left_label = <div className="meta">{match[1]}</div>;
			l_desc = match[2];
		}

		var right_label = null;
		var classes = ["meta"];
		const index = i;
		var l_highlights = null;
		if (tagStructure[i + "A"].highlight !== undefined) l_highlights = tagStructure[i + "A"].highlight;

		let heading = null;
		if (tagStructure[i + "A"].heading !== undefined)
			heading = <tr key={11} className="heading"><td colSpan={2}>{tagStructure[i + "A"].heading}</td></tr>;

		let verses = tagStructure[i + "A"].verses;
		if (verses.indexOf(parseInt(state.active_verse_id, 0)) >= 0) classes.push("parameta_highlighted");

		if (typeof tagStructure[i + "B"] === "undefined") {
			items.push([
				heading,
				<tr className="metaref" id={i + "i" + tagstr} key={i + "i"} onMouseEnter={() => { app.highlightTaggedVerses(verses); app.setActiveVerse(verses[0]); }}>
					<td colSpan={2}>
						{left_label}
						<div className="ref">{tagStructure[i + "A"].ref}</div>
					</td>
				</tr>,
				<tr className={classes.join(" ")} id={i + "ii" + tagstr} key={i + "ii"} onMouseEnter={() => { app.highlightTaggedVerses(verses); app.setActiveVerse(verses[0]); }}>
					<td colSpan={2}>{l_desc}</td>
				</tr>,
				<tr id={i + "content" + tagstr} className="row" key={i + "iii"} onMouseEnter={() => app.highlightTaggedVerses(verses)}>
					<td colSpan={2}>
						<Passage wrapperId={i + "AA" + tagstr} plain={1} verses={tagStructure[i + "A"].verses} sub={tagStructure[i + "A"].sub} highlights={l_highlights} />
					</td>
				</tr>,
				<tr key={i + "iv" + tagstr} id={i + "readMore" + tagstr} className="readmore" onClick={() => readMore(index)}><td colSpan={2}>Read More...</td></tr>
			]);
			continue;
		}

		var r_desc = tagStructure[i + "B"].desc;
		match = /\s*\[(.*?)\]\s*(.*)/g.exec(r_desc);
		if (match !== null) {
			right_label = <div className="meta">{match[1]}</div>;
			r_desc = match[2];
		}
		verses = tagStructure[i + "A"].verses.concat(tagStructure[i + "B"].verses).map(Number);

		if (tagStructure[i + "A"].heading !== undefined && tagStructure[i + "B"].heading !== undefined)
			heading = <tr className="heading"><td>{tagStructure[i + "A"].heading}</td><td>{tagStructure[i + "B"].heading}</td></tr>;
		if (tagStructure[i + "A"].heading === undefined && tagStructure[i + "B"].heading !== undefined)
			heading = <tr className="heading"><td colSpan={2}>{tagStructure[i + "B"].heading}</td></tr>;

		if (verses.indexOf(parseInt(state.active_verse_id, 0)) >= 0) classes.push("parameta_highlighted");

		var r_highlights = null;
		if (tagStructure[i + "B"].highlight !== undefined) r_highlights = tagStructure[i + "B"].highlight;

		items.push([
			heading,
			<tr className="metaref" id={i + "i" + tagstr} key={i + "i"} onMouseEnter={() => { app.highlightTaggedVerses(verses); app.setActiveVerse(verses[0]); }}>
				<td>
					{left_label}
					<div className="ref">{tagStructure[i + "A"].ref}</div>
				</td>
				<td>
					{right_label}
					<div className="ref">{tagStructure[i + "B"].ref}</div>
				</td>
			</tr>,
			<tr className={classes.join(" ")} id={i + "ii" + tagstr} key={i + "ii"} onMouseEnter={() => { app.highlightTaggedVerses(verses); app.setActiveVerse(verses[0]); }}>
				<td>{l_desc}</td>
				<td>{r_desc}</td>
			</tr>,
			<tr id={i + "content" + tagstr} className="row" key={i + "iii"} onMouseEnter={() => app.highlightTaggedVerses(verses)}>
				<td>
					<Passage wrapperId={i + "AA" + tagstr} plain={1} verses={tagStructure[i + "A"].verses} sub={tagStructure[i + "A"].sub} highlights={l_highlights} />
				</td>
				<td>
					<Passage wrapperId={i + "BB" + tagstr} plain={1} verses={tagStructure[i + "B"].verses} sub={tagStructure[i + "B"].sub} highlights={r_highlights} />
				</td>
			</tr>,
			<tr key={i + "iv" + tagstr} id={i + "readMore" + tagstr} className="readmore" onClick={() => readMore(index)}><td colSpan={2}>Read More...</td></tr>
		]);
	}

	var details = null;
	var cite_str = null;
	if (typeof tagMeta.cite === "string" && tagMeta.cite !== "") cite_str = <div className="cite">{tagMeta.cite}</div>;
	var details_str = null;
	if (typeof tagMeta.details === "string" && tagMeta.details !== "") details_str = <div>{app.addLinks(tagMeta.details)}</div>;
	var descr_str = null;
	if (typeof tagMeta.description === "string" && tagMeta.description !== "") descr_str = <h4>{app.addLinks(tagMeta.description)}</h4>;

	if (details_str !== null || descr_str !== null || cite_str !== null)
		details = <div className="detail">{descr_str}{details_str}{cite_str}</div>;

	var containerClasses = ["no_top_padding", "tagged"];

	return (
		<div id="text" className={containerClasses.join(" ")} style={{ overflowY: "scroll" }}>
			{details}
			<table className="parallel" id="parTable">
				<tbody id={tagstr}>
					{items}
				</tbody>
			</table>
		</div>
	);
}

function ChiasticBlock({ content, letter_verses, side, index }) {
	var globalData = useContext(DataContext);
	var app = globalData.app;
var state = globalData.state;

	function readMore(i) {
		var element = document.getElementById(i + "readMore");
		element.parentNode.removeChild(element);
		document.getElementById(i + "content").className = "verses";
	}

	useEffect(() => {
		var textNode = document.getElementById("text");
		if (textNode === null) return;

		var allreads = textNode.querySelectorAll(".readmore");
		for (var i in allreads) if (/active/.exec(allreads[i].className)) allreads[i].className = "readmore";

		var id = side + "" + index + "content";
		var container = document.getElementById(id);
		if (container === null) return;

		var h = container.offsetHeight;
		if (h > 203) container.className = "verses chiastic_mini";
		else readMore(side + "" + index);
		if (content.verses.map(Number).indexOf(state.active_verse_id) === -1) return;
		var matches = container.querySelectorAll(".versebox_highlighted");
		if (matches.length < 1) return;
		var element = matches[0];

		if (!app.checkInView(container, element)) {
			var readmore = document.getElementById(side + "" + index + "readMore");
			if (readmore !== null) readmore.className = "readmore active";
		}
	}, []);

	var label = null;
	var desc = content.desc;
	var highlights = null;
	if (content.highlight !== undefined) highlights = content.highlight;

	var myRegexp = /\s*\[(.*?)\]\s*(.*)/g;
	var match = myRegexp.exec(desc);
	if (match !== null) {
		label = <div className="label">{match[1]}</div>;
		desc = match[2];
	}

	var letter = index.replace(/\d+/, "");
	var classes = ["meta", "c_" + index];
	if (state.chiasm_letter === letter) classes.push("activeChiasm");

	return (
		<div
			id={side + "" + index}
			onMouseEnter={() => { app.highlightTaggedVerses(letter_verses); app.setActiveVerse(content.verses[0]); }}
			onClick={() => app.setActiveChiasm(letter, letter_verses)}>
			<div className="chimeta">
				<div className="seqcircle">{index}</div>
				{label}
				<div className="tagref">{content.ref}</div>
			</div>
			<div className={classes.join(" ")}>{desc}</div>
			<div id={side + index + "content"} className="verses">
				<Passage highlights={highlights} plain={1} verses={content.verses} sub={content.sub} />
			</div>
			<div id={side + index + "readMore"} className="readmore" onClick={() => readMore(side + "" + index)}>Read More...</div>
		</div>
	);
}

function TagChiasm() {
	var globalData = useContext(DataContext);
	var app = globalData.app;
var state = globalData.state;

	function getActiveLetter() {
		var tagStructure = globalData["tags"]["tagStructure"][state.selected_tag];

		for (var x in tagStructure) {
			if (tagStructure[x].verses.map(Number).indexOf(state.active_verse_id) >= 0) {
				x = x.replace(/[0-9]+/, "");
				return x;
			}
		}
		return null;
	}

	function getLetterVerses(letter, tagStructure) {
		var verses = [];
		for (var x in tagStructure) {
			if (x.indexOf(letter) >= 0) verses = verses.concat(tagStructure[x].verses);
		}
		return verses.map(Number);
	}

	useEffect(() => {
		var letter = getActiveLetter();
		var verses = getLetterVerses(letter, globalData["tags"]["tagStructure"][state.selected_tag]);
		app.setActiveChiasm(letter, verses);
	}, []);

	useEffect(() => {
		if (state.chiasm_letter !== null) return;
		var letter = getActiveLetter();
		var verses = getLetterVerses(letter, globalData["tags"]["tagStructure"][state.selected_tag]);
		app.setActiveChiasm(letter, verses);
	});

	var tagMeta = globalData["tags"]["tagIndex"][state.selected_tag];
	var tagStructure = globalData["tags"]["tagStructure"][state.selected_tag];

	var chiastic_labels = [[], []];
	var keys = Object.keys(tagStructure);
	var width = 100 / keys.length;
	var left_items = [];
	var right_items = [];

	for (var i in keys) {
		i = keys[i];
		const letter = i.replace(/\d+/, "");
		const number = /2/.test(i) ? 1 : 0;
		const letter_verses = getLetterVerses(letter, tagStructure);
		if (!i.match(/1$/)) right_items.push(<ChiasticBlock content={tagStructure[i]} letter_verses={letter_verses} key={i} side="right" index={i} />);
		if (!i.match(/2$/)) left_items.push(<ChiasticBlock content={tagStructure[i]} letter_verses={letter_verses} key={i} side="left" index={i} />);

		var classes = ["chiastic_block", "c_" + i];
		if (letter === state.chiasm_letter) classes.push("chiastic_block_hover");
		chiastic_labels[number].push(
			<div
				onMouseEnter={() => app.setActiveChiasm(letter, letter_verses)}
				onClick={() => {
					app.setActiveChiasm(letter, letter_verses);
					app.setActiveVerse(letter_verses[0]);
				}}
				className={classes.join(" ")}
				key={i}
				style={{ width: width + "%" }}>
				{i}
			</div>
		);
	}
	right_items.reverse();
	if (chiastic_labels[1][0] && /A/.test(chiastic_labels[1][0].key)) chiastic_labels[1].reverse();

	var head = null;
	var cite_str = null;
	if (typeof tagMeta.cite === "string" && tagMeta.cite !== "") cite_str = <div className="cite">{tagMeta.cite}</div>;
	var details_str = null;
	if (typeof tagMeta.details === "string" && tagMeta.details !== "") details_str = <div>{app.addLinks(tagMeta.details)}</div>;
	var descr_str = null;
	if (typeof tagMeta.description === "string" && tagMeta.description !== "") descr_str = <h4>{app.addLinks(tagMeta.description)}</h4>;

	if (details_str !== null || descr_str !== null || cite_str !== null) {
		head = <div className="head"><div className="detail">{descr_str}{details_str}{cite_str}</div></div>;
	}

	var classes = ["chiasm", "tagged"];

	return (
		<div id="text" className={classes.join(" ")}>
			<div className="box">
				{head}
				<div className="growing-area">
					<div id="chiastic_blocks">{chiastic_labels}</div>
					<div>
						<div className="chiastic_column left">
							<div className="buffer" />
							<div className="buffer" />
							<div className="buffer" />
							{left_items}
							<div className="buffer" />
							<div className="buffer" />
							<div className="buffer" />
						</div>
						<div className="chiastic_column right">
							<div className="buffer" />
							<div className="buffer" />
							<div className="buffer" />
							{right_items}
							<div className="buffer" />
							<div className="buffer" />
							<div className="buffer" />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}


