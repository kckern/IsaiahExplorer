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
		
		this.props.app.search(query.trim());
	}
	
	searchModeOn()
	{
		this.props.app.setState({preSearchMode:true});
	}
	
	componentDidUpdate()
	{
		if(document.getElementById("searchbox")!==null)
		document.getElementById("searchbox").focus();
	}
		
  render()
  {
  	if(this.props.app.state.comSearchMode) return null;
  	if(this.props.app.state.preSearchMode || this.props.app.state.searchMode )
  	return(
  		<input defaultValue="" id="searchbox" type="text" onKeyUp={this.search.bind(this)} onClick={this.search.bind(this)}  />
  		)
  		
  	return(
  		<span onClick={this.searchModeOn.bind(this)} className="mag" role="img" aria-label="search">&#128270;</span>
  		)
  }

}

export class SearchResults extends Component {

	render()
	{
		var last_h = 0;
		var j=0;
		var groups = [];
		for(var i in this.props.app.state.highlighted_verse_range)
		{
			var verse_id = this.props.app.state.highlighted_verse_range[i];
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
			
      		results.push([<h3 key={1}>{heading}&emsp;<span onClick={()=>this.props.app.setActiveVerse(groups[k][0],undefined,undefined,undefined,"closeSearch")}>{h_text}</span></h3>],[<Passage
      			  key={2}
				  app={this.props.app}
				  verses={groups[k]}
				  highlights={["partialmatch",this.props.app.state.searchQuery]}
				/>]);
		}
		
		

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
		var count = this.props.app.state.highlighted_verse_range.length;
		
		if(this.props.app.state.comSearchMode)
		{
			var name = "";
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