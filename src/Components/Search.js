import React, { Component } from "react";
import { globalData } from "../globals.js";

import { Passage } from "./Passage.js";  



export  class SearchBox extends Component {
	
	search(event)
	{
		var query = event.target.value;
		var keycode = event.keyCode;
		if(keycode===8 && query.length<3) { return this.props.app.clearTag();}
		if(query.length<3 && this.props.app.state.refSearch!==true) {return false};
		
    
		
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
  	var val = this.props.app.state.searchQuery;
  	if(val===null) val = "";
  	val = val.replace(/([\\]b|[｢｣])/g,"/");
  	if(this.props.app.state.urlSearch!==true) val="";
  	
  	if((this.props.app.state.preSearchMode || this.props.app.state.searchMode ) && !this.props.app.state.hebrewSearch)
  	return(
  		<input defaultValue={val} id="searchbox" type="text" onKeyUp={this.search.bind(this)} onClick={this.search.bind(this)}   />
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
		var results = [];// eslint-disable-next-line
		for(let gr in groups)
		{
			var h_index = this.props.app.getHeadingIndex(groups[gr][0],this.props.app.state.outline);
			var h_text = null;
			if(h_index===-1) h_text = "No Heading"
			else h_text = globalData["outlines"][this.props.app.state.outline][h_index].heading;

			
			var heading = null;
			if(groups[gr].length===1) heading = globalData['index'][groups[gr][0]].string;
			else heading = this.props.app.getReference(groups[gr]);
			var q = this.props.app.state.searchQuery;
			if(q===null) q = "";
			q = q.replace(/[\\]b/g,"");
			q = q.split("|");
			var highlights = ["partialmatch"].concat(q);
			
			if(this.props.app.state.hebrewMode && this.props.app.state.hebrewStrongIndex !== null && this.props.app.state.hebrewSearch)
			{
				var tmp = globalData.hebrew.high;
				if(tmp[this.props.app.state.hebrewStrongIndex]!==undefined)
				highlights = tmp[this.props.app.state.hebrewStrongIndex].h;
			}
			
			if(this.props.app.state.refSearch===true) highlights = null;
			
			
      		results.push([<h3 key={1}>{heading}&emsp;<span onClick={()=>this.props.app.clearTag(null,groups[gr][0])}>{h_text}</span></h3>],
      		[<Passage
      			  key={2}
				  app={this.props.app}
				  verses={this.unique(groups[gr])}
				  highlights={highlights}
				/>]);
		}
		var reference = null;
		this.result_count = results.length;
		var nores = "";
		if(results.length===0){ nores = " nores"; results = <div className="noresults"> No Matching Verses </div>; }
		else
		{
			reference = this.props.app.getReference(verses);
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
	
}




export class SearchHeading extends Component {
	
	render()
	{
		var verses = this.props.app.state.highlighted_verse_range;
		//if(this.props.app.state.commentaryAudioMode) verses = this.props.app.state.highlighted_tagged_verse_range;
		var count = verses.length;
		
		var disQ = this.props.app.state.searchQuery;
		if(disQ===null) disQ = "";
		
		disQ = disQ.replace(/[-]+/g,"–");
		disQ = disQ.replace(/[;]+/g,"; ");
		disQ = disQ.replace(/[\\]b([a-z])/g,"｢$1");
		disQ = disQ.replace(/([a-z])[\\]b/g,"$1｣");
		
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
			<div className="text_heading search"><span className="section_tile" >▽ {count} Search Results</span><br /><span id="drarrow">⤷</span>▷ “<span className='q'>{disQ}</span>”</div>
			)
	}
	
}