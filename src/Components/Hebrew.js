import React, { Component } from "react";
import { globalData } from "../globals.js";
import Tipsy from 'react-tipsy';


export  class Hebrew extends Component {

	render()
	{
		if(!this.props.app.state.hebrewMode) return null;
		var hebrew = globalData.hebrew.verses[this.props.app.state.active_verse_id];
		var words = hebrew.map((val,key)=>{
			return <HebrewWord  key={key}  app={this.props.app} val={val} />
		});
		return (<div key={1} id="hebrew" dir="rtl"><div id="hebrew_text">{words}</div></div>)
	}
	
}



class HebrewWord extends Component {

	handleClick()
	{
		if(this.props.app.state.hebrewSearch && this.props.val.strong===this.props.app.state.hebrewStrongIndex)
		{
			this.props.app.setState({hebrewSearch:false,hebrewStrongIndex:null,searchMode:false});
			return false;
		}
		this.props.app.searchHebrewWord(this.props.val.strong)
	}

	handleMouseEnter()
	{
		if(this.props.app.state.hebrewSearch) return false;
		this.props.app.setHebrewWord(this.props.val.strong,this.props.val.word)
		
	}
	handleMouseLeave()
	{
		  	//get verse ids
	
	  	return this.props.app.setState({
		    highlighted_tagged_verse_range:[],
	  	});
	}

	render()
	{
		var classes = [];
		if(this.props.val.strong===this.props.app.state.hebrewStrongIndex) classes.push("active");
		var punct = null;
		var heb = globalData.hebrew;
		var worddata = null;
		for(var word in heb.verses[this.props.app.state.active_verse_id])
		{
			if(heb.verses[this.props.app.state.active_verse_id][word].strong===this.props.val.strong)
			{
				worddata = heb.verses[this.props.app.state.active_verse_id][word];
				break;
			}
		}
		return [<Tipsy content={worddata.eng.replace(/[\[\]]/g,"")} placement="top" trigger="hover focus touch" className="hebdef">
			<span key="v" className={classes.join(" ")}
			onClick={this.handleClick.bind(this)}
			onMouseEnter={this.handleMouseEnter.bind(this)}
			onMouseLeave={this.handleMouseLeave.bind(this)}
		>{this.props.val.orig}</span></Tipsy>,punct,<span key="s" className="space" />]
	}
	
}

class HebrewDef extends Component {
	
	
	render()
	{
		return null;
		var heb = globalData.hebrew;
		var worddata = null;
		for(var word in heb.verses[this.props.app.state.active_verse_id])
		{
			if(heb.verses[this.props.app.state.active_verse_id][word].strong===this.props.app.state.hebrewStrongIndex)
			{
				worddata = heb.verses[this.props.app.state.active_verse_id][word];
				break;
			}
		}
		
		if(worddata===undefined || worddata===null) return null;
		
		return <div className="HebrewDef"><span>{worddata.eng.replace(/[\[\]]/g,"")}</span></div>;
		
	}
	
}


export class HebrewSearchHeading extends Component {
	
	render()
	{
		var verses = this.props.app.state.highlighted_verse_range;
		var data = globalData.hebrew.high[this.props.app.state.hebrewStrongIndex];
		var w,p = null;
		if(data!==undefined){w=data.w; p=data.p;}
		var count = verses.length;
		return(
			<div className="text_heading search">
			<span className="section_tile" ><StrongLink app={this.props.app} strong={this.props.app.state.hebrewStrongIndex}/>▽ {count} Matching Verses</span><br />
			<span id="drarrow">⤷</span>▷ 
			<span className="hword">{w}</span><span className="hphon"> • {p}</span>
			</div>
		)
	}
}


export class StrongLink extends Component {
	
	  
	strongshow(e){ 
		e.preventDefault();
		this.props.app.PopupCenter("https://thekingjam.es/strongs/H"+this.props.strong,"Strong's Concordance",1000,750);
		e.stopPropagation();
	}  
    
	render()
	{
		if(this.props.strong===undefined) return null;
		if(this.props.strong===null) return null;
		return (<a className="strong" onClick={this.strongshow.bind(this)} href={"https://thekingjam.es/strongs/H"+this.props.strong}>Strong-{this.props.strong}</a>);
	}
}
