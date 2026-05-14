import React, { useContext, useEffect, useRef } from "react";
import { DataContext } from "../DataContext";

import { Passage } from "./Passage.js";  



export function SearchBox() {
	var globalData = useContext(DataContext);
	var app = globalData.app;
	var state = globalData.state;
	var initialized = useRef(false);

	var search = (event) => {
		var query = event.target.value;
		var keycode = event.keyCode;
		if(keycode===8 && query.length<3) { return app.clearTag();}
		if(query.length<3 && state.refSearch!==true) {return false}

		//sanitize query for regex
		query = query.replace(/(\|.{0,2})+$/,"");
		query = query.replace(/\\[^b]/,"");

		//query
		if(query.trim()===state.searchQuery) return false;
		app.search(query.trim());
	};

	var searchModeOn = () => {
		app.setState({preSearchMode:true, selected_tag:null, selected_verse_id:null});
	};

	useEffect(() => {
		var searchbox = document.getElementById("searchbox");
		if(searchbox!==null) searchbox.focus();
		if(initialized.current) return;
		initialized.current = true;
		if(searchbox===null) return;
		if(searchbox.value.length>1) return;
		var q = state.searchQuery;
		if(q===null) return;
		searchbox.value = q;
	});

	// Reset search state when there are no results and nothing active to display.
	// Uses highlighted_verse_range.length as the "result_count" proxy (computed in detail below).
	// A selected tag (or tag-browsing mode) IS something active to display — the
	// guard must skip those, or this effect clobbers a tag selected via deep-link
	// during init (when highlighted_verse_range is briefly empty) and calls
	// clearTag, dropping the user back to the plain verse view.
	var hasResults = state.highlighted_verse_range && state.highlighted_verse_range.length > 0;
	useEffect(() => {
		if(hasResults || state.searchQuery!==null || state.commentaryAudioMode || state.hebrewSearch) return;
		if(state.selected_tag!==null || state.tagMode) return;
		app.setState(
		{
			searchMode:false,
			preSearchMode:false,
			highlighted_verse_range:[],
			highlighted_tagged_verse_range:[]
		},
		app.clearTag.bind(app));
	}, [hasResults, app, state.searchQuery, state.commentaryAudioMode, state.hebrewSearch, state.selected_tag, state.tagMode]);

	if(state.comSearchMode) return null;
	var val = state.searchQuery;
	if(val===null) val = "";
	val = val.replace(/([\\]b|[｢｣])/g,"/");
	if(state.urlSearch!==true) val="";

	if((state.preSearchMode || state.searchMode ) && !state.hebrewSearch) {
		return(
			<input defaultValue={val} id="searchbox" type="text" onKeyUp={search} onClick={search}   />
		)
	}

	return(
		<span onClick={searchModeOn} className="mag" role="img" aria-label="search">&#128270;</span>
	)
}

export function SearchResults() {
	var globalData = useContext(DataContext);
	var app = globalData.app;
	var state = globalData.state;

	var unique = (a) => {
		var arr = [];
		for (var i=0;i<a.length;i++) if (arr.indexOf(a[i])===-1)arr.push(a[i]);
		return arr;
	};

		var last_h = 0;
		var j=0;
		var groups = [];
		var verses = state.highlighted_verse_range;
		//if(state.commentaryAudioMode) verses = state.highlighted_tagged_verse_range;
		for(var i in verses)
		{
			var verse_id = verses[i];
			var hindex = app.getHeadingIndex(verse_id,state.outline);
			if(hindex!==last_h) { groups.push([]); j++;}
			groups[j-1].push(verse_id);
			last_h = hindex;
		}
		var results = [];// eslint-disable-next-line
		for(let gr in groups)
		{
			var h_index = app.getHeadingIndex(groups[gr][0],state.outline);
			var h_text = null;
			if(h_index===-1) h_text = "No Heading"
			else h_text = globalData["outlines"][state.outline][h_index].heading;

			
			var heading = null;
			if(groups[gr].length===1) heading = globalData['index'][groups[gr][0]].string;
			else heading = app.getReference(groups[gr]);
			var q = state.searchQuery;
			if(q===null) q = "";
			q = q.replace(/[\\]b/g,"");
			q = q.split("|");
			var highlights = ["partialmatch"].concat(q);
			
			if(state.hebrewMode && state.hebrewStrongIndex !== null && state.hebrewSearch)
			{
				var tmp = globalData.hebrew.high;
				if(tmp[state.hebrewStrongIndex]!==undefined)
				highlights = tmp[state.hebrewStrongIndex].h;
			}
			
			if(state.refSearch===true) highlights = null;
			
			
	      	results.push([<h3 key={1}>{heading}&emsp;<span onClick={()=>app.clearTag(null,groups[gr][0])}>{h_text}</span></h3>],
      		[<Passage
      			  key={2}
				 
				  verses={unique(groups[gr])}
				  highlights={highlights}
				/>]);
		}
		var reference = null;
		var result_count = results.length;
		var nores = "";
		if(results.length===0){ nores = " nores"; results = <div className="noresults"> No Matching Verses </div>; }
		else
		{
			reference = app.getReference(verses);
			reference = <div className="SearchReference">{reference}</div>

			if(groups.length===1) reference=null;
			if(verses.length>100) reference=null;
		}

    return (

      		<div id="text" className={"search"+nores} >
      		{reference}
      		{results}
			</div>
		)
}




export function SearchHeading() {
	var globalData = useContext(DataContext);
	var app = globalData.app;
	var state = globalData.state;
	var verses = state.highlighted_verse_range;
	//if(state.commentaryAudioMode) verses = state.highlighted_tagged_verse_range;
		var count = verses.length;
		
		var disQ = state.searchQuery;
		if(disQ===null) disQ = "";
		
		disQ = disQ.replace(/[-]+/g,"–");
		disQ = disQ.replace(/[;]+/g,"; ");
		disQ = disQ.replace(/[\\]b([a-z])/g,"｢$1");
		disQ = disQ.replace(/([a-z])[\\]b/g,"$1｣");
		
		if(state.comSearchMode && state.commentaryAudioMode && state.audioState!==null)
		{
			var name = "Multi‑verse Audio Commentary"
			
		return (
			<div className="text_heading search"><span className="section_tile" >▽ {name}</span><br /><span id="drarrow">⤷</span>▷ {count} Referenced Verses</div>
			)
		}
		if(state.comSearchMode)
		{
			name = "";
			var title  = globalData.commentary.comSources[state.commentarySource];
			if(title===undefined) name = "Commentary Lookup";
			else name = title.name
			
		return (
			<div className="text_heading search"><span className="section_tile" >▽ {name}</span><br /><span id="drarrow">⤷</span>▷ {count} Referenced Verses</div>
			)
		}
		
		return (
			<div className="text_heading search"><span className="section_tile" >▽ {count} Search Results</span><br /><span id="drarrow">⤷</span>▷ “<span className='q'>{disQ}</span>”</div>
			)
}