import React, { Component } from "react";
import { globalData } from "../globals.js";

import { Passage } from "./Passage.js";  



export  class SearchBox extends Component {
	
	search(event)
	{
		var query = event.target.value;
		var keycode = event.keyCode;
		if(keycode===8 && query.length<3) { return this.props.app.clearTag();}
		if(query.length<3) {return false};
		
    
		
		//sanitize query for regex
		query = query.replace(/(\|.{0,2})+$/,"");
		query = query.replace(/\\[^b]/,"");
		
		//query
		if(query.trim()===this.props.app.state.searchQuery) return false;
		this.props.app.search(query.trim());
	}
	
	searchModeOn()
	{
		this.props.app.setState({preSearchMode:true, selected_tag:null, selected_verse_id:null});
	}
	
	componentDidUpdate()
	{
		if(document.getElementById("searchbox")!==null)
		document.getElementById("searchbox").focus();
	}
	
	componentDidMount()
	{
		if(document.getElementById("searchbox")===null) return false;
		if(document.getElementById("searchbox").value.length>1) return false;
		var q = this.props.app.state.searchQuery;
		if(q===null) return false;
		document.getElementById("searchbox").value = q;
	}
		
  render()
  {
  	if(this.props.app.state.comSearchMode) return null;
  	if((this.props.app.state.preSearchMode || this.props.app.state.searchMode ) && !this.props.app.state.hebrewSearch)
  	return(
  		<input defaultValue="" id="searchbox" type="text" onKeyUp={this.search.bind(this)} onClick={this.search.bind(this)}   />
  		)
  		
  	return(
  		<span onClick={this.searchModeOn.bind(this)} className="mag" role="img" aria-label="search">&#128270;</span>
  		)
  }

}

export class SearchResults extends Component {

	result_count = 0;
	componentDidUpdate()
	{
		if(this.result_count>0 || this.props.app.state.searchQuery!==null || this.props.app.state.commentaryAudioMode || this.props.app.state.hebrewSearch) return false;
		this.props.app.setState(
		{
			searchMode:false,
			preSearchMode:false,
			highlighted_verse_range:[],
			highlighted_tagged_verse_range:[]
		},
		this.props.app.clearTag.bind(this.props.app));
	}
	
	unique(a){
	  var arr = [];
	  for (var i=0;i<a.length;i++) if (arr.indexOf(a[i])===-1)arr.push(a[i]);
	  return arr;
	}


	render()
	{
		var last_h = 0;
		var j=0;
		var groups = [];
		var verses = this.props.app.state.highlighted_verse_range;
		//if(this.props.app.state.commentaryAudioMode) verses = this.props.app.state.highlighted_tagged_verse_range;
		for(var i in verses)
		{
			var verse_id = verses[i];
			var hindex = this.props.app.getHeadingIndex(verse_id,this.props.app.state.outline);
			if(hindex!==last_h) { groups.push([]); j++;}
			groups[j-1].push(verse_id);
			last_h = hindex;
		}
		var results = [];
		for(const k in groups)
		{
			var h_index = this.props.app.getHeadingIndex(groups[k][0],this.props.app.state.outline);
			var h_text = null;
			if(h_index===-1) h_text = "No Heading"
			else h_text = globalData["outlines"][this.props.app.state.outline][h_index].heading;

			
			var heading = null;
			if(groups[k].length===1) heading = globalData['index'][groups[k][0]].string;
			else heading = this.props.app.getReference(groups[k]);
			
			var highlights = ["partialmatch",this.props.app.state.searchQuery];
			
			if(this.props.app.state.hebrewMode && this.props.app.state.hebrewStrongIndex !== null && this.props.app.state.hebrewSearch)
			{
				var tmp = globalData.hebrew.high;
				if(tmp[this.props.app.state.hebrewStrongIndex]!==undefined)
				highlights = tmp[this.props.app.state.hebrewStrongIndex].h;
			}
			
      		results.push([<h3 key={1}>{heading}&emsp;<span onClick={()=>this.props.app.setActiveVerse(groups[k][0],undefined,undefined,undefined,"closeSearch")}>{h_text}</span></h3>],
      		[<Passage
      			  key={2}
				  app={this.props.app}
				  verses={this.unique(groups[k])}
				  highlights={highlights}
				/>]);
		}
		
		this.result_count = results.length;

    return (

      		<div id="text" className="search" >
      		{results}
			</div>
		)
	}
	
}




export class SearchHeading extends Component {
	
	render()
	{
		var verses = this.props.app.state.highlighted_verse_range;
		//if(this.props.app.state.commentaryAudioMode) verses = this.props.app.state.highlighted_tagged_verse_range;
		var count = verses.length;
		
		if(this.props.app.state.comSearchMode && this.props.app.state.commentaryAudioMode && this.props.app.state.audioState!==null)
		{
			var name = "Multi‑verse Audio Commentary"
			
		return (
			<div className="text_heading search"><span className="section_tile" >▽ {name}</span><br /><span id="drarrow">⤷</span>▷ {count} Referenced Verses</div>
			)
		}
		if(this.props.app.state.comSearchMode)
		{
			name = "";
			var title  = globalData.commentary.comSources[this.props.app.state.commentarySource];
			if(title===undefined) name = "Commentary Lookup";
			else name = title.name
			
		return (
			<div className="text_heading search"><span className="section_tile" >▽ {name}</span><br /><span id="drarrow">⤷</span>▷ {count} Referenced Verses</div>
			)
		}
		
		return (
			<div className="text_heading search"><span className="section_tile" >▽ {count} Search Results</span><br /><span id="drarrow">⤷</span>▷ “<span className='q'>{this.props.app.state.searchQuery}</span>”</div>
			)
	}
	
}