import React, { useContext, useEffect, useState } from "react";
import { DataContext } from "../DataContext";
import { VerseBox } from "./VerseBox.js";
import loading_img from '../img/interface/loadingwave.gif';

export default function SectionColumn() {
	var globalData = useContext(DataContext);
	var app = globalData.app;
	var state = globalData.state;
	var [metaOpen,setMetaOpen] = useState(false);
	var [fullsize,setFullsize] = useState(false);

	var toggleDrawer = (e) => {
		if(typeof e !== "undefined") e.stopPropagation();
		setMetaOpen((prevState) => !prevState);
	};

	useEffect(() => {
		var timer = setTimeout(() => {
			if(state.ready===false)
			{
				setFullsize(true);
			}
		}, 150);

		return () => clearTimeout(timer);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	if(state.ready===false)
	{
		var classes = ["loading"];
		if(fullsize===true) classes.push("fullsize");
		return(
			<div className="col col2b">
				<div className="heading">
					<div className="heading_subtitle" id="outline_subtitle"> Section Passages</div>
					<div className="heading_title">□{" "}<span id="outline_title">Outline Headings</span></div>
				</div>
				<div id="outline" className={classes.join(" ")}><img src={loading_img} alt="loading"/><br/>Loading Available Outlines...</div>
			</div>
		)
	}

	return (
		<div className="col col2b">
			<div className="heading">
				<div className="heading_subtitle" id="outline_subtitle">
					Section Passages
				</div>
				<div className="heading_title"  onClick={app.cycleOutline.bind(app,1)}>
					□ <span id="outline_title">
					<img alt="outline_logo" src={require('../img/versions/'+state.outline.toLowerCase()+'.jpg')}  onClick={toggleDrawer}  />
					{globalData["meta"]["outline"][state.outline].short_title}</span>
				</div>
			</div>
			<Outline   />
			<OutlineMeta open={metaOpen} toggle={toggleDrawer} />
		</div>
	);
}

function Outline() {
	var globalData = useContext(DataContext);
	var app = globalData.app;
	var state = globalData.state;

	var isInSection = (heading) => {
		if(state.searchMode) return true;
		if(state.selected_tag!==null) return true;
		var section_verses = state.highlighted_section_verses;
		var heading_verses = heading.verses;
		var isec = heading_verses.filter(function(n) { return section_verses.indexOf(n) !== -1; });
		return isec.length > 0;
	};

	var isInTagRange = (heading) => {
		if(state.searchMode) return true;
		if(state.selected_tag===null) return true;
		var tagged_verses = state.highlighted_verse_range;
		var heading_verses = heading.verses;
		var isec = heading_verses.filter(function(n) { return tagged_verses.indexOf(n) !== -1; });
		return isec.length > 0;
	};

	var isInSearchRange = (heading) => {
		//if(state.commentaryAudioMode===true) return true;
		if(state.searchMode===false  && !state.comSearchMode) return true;
		var tagged_verses = state.highlighted_verse_range;
		var heading_verses = heading.verses;
		var isec = heading_verses.filter(function(n) { return tagged_verses.indexOf(n) !== -1; });
		return isec.length > 0;
	};

	useEffect(() => {
		//Spread Out Outlines
		app.spreadOutline();
	});

	var outline = globalData["outlines"][state.outline];
	var sections = globalData["structures"];
	var section_index =  globalData["structureIndex"];
	var headings = [];
	var lastheading = null;
	var lastunit = null;
	for(var x in outline)
	{
		var heading = outline[x];
		if(isInSection(heading) && isInTagRange(heading) && isInSearchRange(heading))
		{
			var section_i = parseInt(section_index[heading.verses[0]][state.structure],0);
			var section = sections[state.structure][section_i];
			if(section_i!==lastheading)
			{
				headings.push(<h4 key={"h"+x}>{section.description}</h4>);
				lastunit = null;
			}

			if(section.verses.length>1)
			{
				for(var y in section.verses)
				{
					if(section.verses[y].indexOf(heading.verses[0]) >= 0  && y!==lastunit)
					{
						headings.push(<h5 key={"u"+x}>Unit {parseInt(y,0)+1}</h5>);
						lastunit = y;
					}
				}

			}

			headings.push(<Heading
				heading={heading}
				id={x}
				key={x}
			/>);

			lastheading = section_i+0;
		}
	}

	if(headings.length===0)
	{
		for(x in outline)
		{
			heading = outline[x];
			headings.push(<Heading
				heading={heading}
				id={x}
				key={x}
			/>);
		}
	}

	return (
		<div id="outline"   >
			<div className="overviewcontainer"> {headings} </div>
		</div>
	);
}

function Heading({heading, id}) {
	var globalData = useContext(DataContext);
	var app = globalData.app;
	var state = globalData.state;

	var isActive = () => {
		//console.log(parseInt(state.highlighted_heading_index,0),id);
		return (
		//	heading.verses[0].indexOf(state.active_verse_id) >= 0
			parseInt(state.highlighted_heading_index,0) === parseInt(id,0)
		);
	};

	const index = globalData["index"];
	var classes = ["heading_grid"];
	if (isActive()) classes.push("heading_grid_highlighted");

	var ref = app.getReference(heading.verses).replace(/^Isaiah /i,"");

	return (
		<div
			className={classes.join(" ")}
			onMouseEnter={() =>
				{
					var dark_blue = state.highlighted_verse_range;
					var whole_row = heading.verses;

					for(var i in whole_row)
					{
						if(dark_blue.indexOf(whole_row[i])>=0) return app.setActiveVerse(whole_row[i],undefined,undefined,undefined,"versebox");
					}
					return app.setActiveVerse(whole_row[0],undefined,undefined,undefined,"versebox");

				}
			}
		>
		<span className="ref">{ref}</span>
			<h3
			onClick={() =>
				{
					var whole_row = heading.verses;
					app.clearTag();
					app.setActiveVerse(whole_row[0],undefined,undefined,undefined,"versebox");
				}
			}>{heading.heading}</h3>
			<div className="verse_grid">
				{heading.verses.map((verse_id, verseKey) => {
					var box_num = index[verse_id.toString()].verse;
					var verseClasses = ["versebox", "v_" + verse_id];
					if (box_num === 1) {
						box_num = index[verse_id.toString()].chapter;
						verseClasses.push("chapter");
					}
					return (
						<VerseBox
							key={verseKey}
							class={verseClasses}
							verse_id={verse_id}
							title={index[verse_id.toString()].title}
							box_num={box_num}
						/>
					);
				})}
			</div>
		</div>
	);
}




function OutlineMeta({open, toggle})
{
	var globalData = useContext(DataContext);
	var state = globalData.state;
	var classes = ["meta"];
	if(open) classes.push("visible");

	var entries = state.top_outlines.slice(0); for(var i in globalData["meta"]["outline"]) if(entries.indexOf(i)<0) entries.push(i);
	const options = entries.map(
		(shortcode,optionKey ) => {
			return(<OutlineOption  option={globalData["meta"]["outline"][shortcode]} optionKey={optionKey} key={optionKey}  toggle={toggle} />)
		}
	);

	return(
		<div id="outline_meta" className={classes.join(" ")}>
			<h4>Available Outlines</h4>
			{options}
		</div>
	)
}

function OutlineOption({option, optionKey, toggle})
{
	var app = useContext(DataContext).app;
	var classes = ["option"];
	if(optionKey===0) classes.push("first top");
	else if(optionKey<5) classes.push("top");
	else if(optionKey===5) classes.push("other firstother");
	else classes.push("other");

	return ( <div className={classes.join(" ")} onClick={() => {
		toggle();
		app.setActiveOutline(option.shortcode)

	}}>
			<img alt="Option" src={require('../img/versions/'+option.shortcode.toLowerCase()+'.jpg')} />
			<div className={"icon"}>{option.title}</div>
			<span>{option.description}</span>
		</div>
	);
}
