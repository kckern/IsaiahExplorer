import React, { Component } from "react";
import { globalData } from "../globals.js";
import { TaggedVerses, TaggedHeading, TagTree } from "./Tags.js";
import { SearchHeading, SearchResults,SearchBox } from "./Search.js";
import { Commentary } from "./Commentary.js";
import loading_img from '../img/interface/typing.gif';
import loading_version from '../img/interface/version_loading.gif';
import tag_png from '../img/interface/tag.png';
import audio from '../img/interface/audio.png';
import {HebrewSearchHeading} from "./Hebrew.js";



export default class PassageColumn extends Component {
		
  constructor(props) {
    super(props);
    this.state = { metaOpen: false, fullsize: false  };
  }


	handleImageLoaded()
	{
  		this.doneLoading();
	}
	
	toggleDrawer(e)
	{
  		if(typeof e !== "undefined") e.stopPropagation();
		this.setState(prevState => ({ metaOpen: !prevState.metaOpen }))
	}
	
 componentDidMount () {
	setTimeout(() => {
		if(this.props.app.state.ready===false)
		{
			this.setState({ fullsize: true });
			this.render();
		}
	}, 300)
	
	
 }
 componentDidUpdate () {
	
	if(document.getElementById("text")===null) return false;
	document.getElementById("text").removeEventListener('scroll', this.props.app.checkFloater.bind(this.props.app));
	document.getElementById("text").addEventListener('scroll', this.props.app.checkFloater.bind(this.props.app));
	
 }
  render() {
  	
		    if(this.props.app.state.ready===false)
		    {
		    	var classes = ["loading"];
		    	if(this.state.fullsize===true) classes.push("fullsize");
		    	
		    	var hclasses = ["text_heading"];  
		    	
		    	return(
			      <div className="col col3">
			        <div className="heading">
			          <div className="heading_subtitle" > Passage Verses</div>
			          <div className="heading_title">□{" "}<span id="outline_title">Version Text</span></div>
			          <div className={hclasses.join(" ")} >
			            <span className="section_tile" >▽ Section Title</span><br /><span id="drarrow">⤷</span>▷ Heading Title
			            </div>
			        </div>
			        <div id="text" className={classes.join(" ")}><img alt="Loading" src={loading_img}/><br/>Loading Passage Text...</div>
			      </div>
			    )
		    }
  	
  	var toggler = this.toggleDrawer.bind(this);

  	var versionName = globalData.meta.version[this.props.app.state.version].title;
  	var verse_id = this.props.app.state.active_verse_id;
  	var {sectionTitle,headingTitle} = "";
  	var version_img = "";
  	if(verse_id!==null)
  	{
	  	var s_index = globalData['structureIndex'][verse_id.toString()][this.props.app.state.structure];
	  	sectionTitle = globalData["structures"][this.props.app.state.structure][s_index].description;
	  	var h_index = globalData['outlineIndex'][verse_id.toString()][this.props.app.state.outline];
	  	headingTitle = globalData["outlines"][this.props.app.state.outline][h_index].heading;
		version_img = require('../img/versions/'+this.props.app.state.version.toLowerCase()+'.png');
		if(this.props.app.state.ui_version_loading) version_img = loading_version; 
  		
	}
	var title = "Passage Verses";
	var tagimg = null;
    tagimg = <img src={tag_png} alt="tag" id="tagIcon" className="tag" onClick={()=>{
    	if(this.props.app.state.tagMode)  this.props.app.clearTag();
    	else this.props.app.showcaseTag(null);
    }}/>

	hclasses = ["text_heading"];  
	var content = <Passage app={this.props.app} verses={this.props.app.state.highlighted_verse_range} wrapperId="text"/>
	var heading = <div className={hclasses.join(" ")}><span className="section_tile" >▽ {sectionTitle}</span><br /><span id="drarrow">⤷</span>▷ {headingTitle}</div>
	if(this.props.app.state.selected_tag!==null) { content = <TaggedVerses app={this.props.app} />; heading = <TaggedHeading app={this.props.app} />; title = "Tagged Verses"}

	if(this.props.app.state.tagMode===true) { 
	var tagMeta = globalData['tags']['tagIndex'][this.props.app.state.showcase_tag];
	content = <div id="text" className="tagContainer"><div className="tag_meta"> <TagTree app={this.props.app} tagMeta={tagMeta} base="root" /><div className="tagTaxFooter"/></div></div>; 
	heading = <TaggedHeading app={this.props.app} />; title = "Tags"
	}
	if(this.props.app.state.searchMode===true) { 
	content = <SearchResults app={this.props.app}  />; 
	heading = <SearchHeading app={this.props.app} />; 
	title=tagimg=null;
	}
	if(this.props.app.state.hebrewSearch===true) { 
	heading = <HebrewSearchHeading app={this.props.app} />; 
	}
	if(this.props.app.state.preSearchMode===true) { title=tagimg=null;}
	if(this.props.app.state.comSearchMode===true) { title="Referenced Verses";}
	if(this.props.app.state.hebrewSearch===true) { title="Hebrew Word Matches";}
	
    return (
      <div className="col col3">
        <div className="heading">
        <Commentary app={this.props.app}/>
          <div className="heading_subtitle">{tagimg}{title}<SearchBox app={this.props.app}/></div>
          <div className="heading_title"  onClick={this.props.app.cycleVersion.bind(this.props.app,1)}> 
            □ <span id="heading_title">{versionName}
             <img alt="Version"  src={version_img}  onClick={toggler}  /></span>
          </div>
          {heading}
        </div>
        {content}
        <VersionMeta app={this.props.app} open={this.state.metaOpen} toggle={toggler} />
      </div>
    );
  }
}


export  class Passage extends Component {
	
	
		processSubs(text,verse_id,sub)
		{
			if(sub===undefined) return text;
			if(sub[verse_id]===undefined) return text;
			var letter_str = sub[verse_id];
			var letters = [];
			for (var i = 0; i < letter_str.length; i++) {
			    letters.push(letter_str.charAt(i));
			}
			
			var format = text.format;
			var otext = text.text+"";
			text = text.text;
			text = text.replace(/^[^a-z]/ig,"");
			text = text.replace(/\/_/g," ");
			
			var array = [];
			if(text.includes("/") && text.split(/[/¶]+/g).length<=5) array = text.split(/[/¶]+/g)
			else
			{
				 var tmp = text.split(/([,;.:?!]+)/g);
				 for(i = 0; i<=tmp.length; i=i+2) array.push(tmp[i]+tmp[i+2]+" ");
				//if too short merge lines
			}
			
			//Divide text by letters
			var lines = [];
			for(var x in letters)
			{
				var key = letters[x].charCodeAt(0) - 97;
				lines.push(array[key]);
			}
			text = lines.join("/");
			
			if(text.match(/[a-z]/ig)===null) text = otext;
			
			var r = {
				format:format,
				text: text
			};
			return r;
		}
	
	
	  render() {


		var range = this.props.verses;
		if (typeof range !== 'object') range = [range];
  		var block_index = -1;
  		var last_format = null;
  		var last_verse_id = null;
  		var PassageBlocks = [];
  		var thisVersion = this.props.app.state.version;
  		if(typeof this.props.version==="string") thisVersion = this.props.version;
  		if(typeof this.props.app.state.spot === "string" && this.props.spottable) thisVersion = this.props.app.state.spot;
	  	for(var x in range)
	  	{
  			var source = globalData["text"][thisVersion];
	  		if(typeof source === "undefined"){
	  			source = globalData["meta"]["version"][thisVersion].sample;
	  		}
	  		var verse_id = range[x];
	  		var verseObj = this.processSubs(source[verse_id.toString()],verse_id.toString(),this.props.sub);
	  		
	  		
  				
	  		if(typeof verseObj==="undefined") continue;
	  		var format = verseObj.format;
	  		var text = "▫"+verseObj.text;
	  		if(format!==last_format && (this.props.plain!==1 || block_index===-1)){ 
	  			block_index++;
	  			PassageBlocks[block_index] = {};
	  			PassageBlocks[block_index].lines=[]; 
	  			PassageBlocks[block_index].type = "p"; 
	  		}
	  		
	  		if(this.props.plain===1)
	  		{
	  			text = "▫"+text.replace(/([§¶/_▼▲►▫{} ]+)/gi," ");
	  			format = "prose";
	  		}
	  		if(format==="poetry") PassageBlocks[block_index].type = "blockquote";
	  		
	  		var parts = text.split(/([§¶/_▼▲►▫]+)/gi);
	  		for(var y in parts)
	  		{
	  			if(y % 2 !== 0)
	  			{
	  				//Block level
	  				if(parts[y].indexOf("▼")>=0) format = "poetry";
	  				if(parts[y].indexOf("►")>=0) format = "prose";
	  				if(parts[y].indexOf("¶")>=0) { 
	  					block_index++; 
	  					PassageBlocks[block_index] = {};
	  					if(format==="poetry") 	PassageBlocks[block_index].type = "blockquote";
	  					if(format==="prose") 	PassageBlocks[block_index].type = "p";
	  					PassageBlocks[block_index].lines = [];
	  				}
	  				//Line Level
	  				var classes = ["verse",format];
	  				
	  				if(parts[y].indexOf("/")>=0) classes.push("linebreak");
	  				if(parts[y].indexOf("_")>=0) classes.push("indent");
	  				
	  				//Ready: block_index with type, format, classes
	  			}
	  			else
	  			{
	  				if(parts[y]==="") continue;
	  				
	  				
	  				//Break between non consecutive verses
	  				if(parseInt(verse_id,0)!==last_verse_id && parseInt(verse_id,0)!==last_verse_id+1 && last_verse_id!==null)
	  				{
	  					block_index++;
	  					PassageBlocks[block_index] = {};
	  					PassageBlocks[block_index].lines = [{verse_id:null, classes:["break"],line:null}];
	  					block_index++;
	  					PassageBlocks[block_index] = {};
	  					PassageBlocks[block_index].lines = [];
	  				}
	  				
	  				PassageBlocks[block_index].lines.push({verse_id:verse_id, classes:classes,line:parts[y]});
	  				last_verse_id = parseInt(verse_id,0);
	  			}
	  		}
	  		last_format = format;
	  	}
	  	
	  	
	  	classes = [];
	  	if(typeof this.props.wrapperClass === "string") classes.push(this.props.wrapperClass); 
	  	if(this.props.app.state.ui_version_loading) classes.push("greyed_out");
	  	
	  	return(
	  		<div id={this.props.wrapperId} className={classes.join(" ")}>
	          {PassageBlocks.map(
	            (block, blockKey) => {
		  			return (<PassageBlock app={this.props.app} highlights={this.props.highlights} type={block.type} lines={block.lines} key={blockKey}/>)
	            }
	          )}
	  		</div>
	  		)	
	  }
	
}

export  class PassageBlock extends Component {
	
	  render() {
	  	var type = this.props.type;
	  	var lines = this.props.lines;
	  	
	  	if(lines.length===1 && lines[0].classes[0]==="break") type="break";
	  	
	  	//console.log(type,lines);
	  	if(lines.length===0) return null;
	  	
	  	if(type==="blockquote")
	  	{
	  		return(
	  		<blockquote>
	          {lines.map(
	            (line, lineKey) => {
		  			return (<PassageLine app={this.props.app} highlights={this.props.highlights} line={line} key={lineKey}/>)
	            }
	          )}
	  		</blockquote>
	  		)
	  		
	  	}else if(type==="break")
	  	{
	  		return(
	  		<hr/>
	  		)
	  		
	  	}else
	  	{
	  		return(
	  		<p>
	          {lines.map(
	            (line, lineKey) => {
		  			return (<PassageLine app={this.props.app} highlights={this.props.highlights} line={line} key={lineKey}/> )
	            }
	          )}
	  		</p>
	  		)
	  	}
  			
	  }
	
}
export  class PassageLine extends Component {
	
	  isActive() {
	    return parseInt(this.props.app.state.active_verse_id,0) === parseInt(this.props.line.verse_id,0);
	  }
	  isCommentary() {
	    return (this.props.app.state.commentary_audio_verse_range.indexOf(this.props.line.verse_id)>=0 ||
	    this.props.app.state.commentary_verse_range.indexOf(this.props.line.verse_id)>=0)
	  }
	  isSelected() {
	    return  parseInt(this.props.app.state.selected_verse_id,0) === parseInt(this.props.line.verse_id,0);
	  }
	  
	  
  
	  render() {
	  	if(typeof this.props.line.classes === "undefined")
	  	{
	  		console.log("ERROR");
	  		console.log(this);
	  		return null
	  	}
	  	this.props.line.classes.push("v_"+this.props.line.verse_id)
	  	 if (this.isActive()) this.props.line.classes.push("versebox_highlighted");
	  	 if (this.isSelected()) this.props.line.classes.push("versebox_selected");
	  	 if (this.isCommentary()) this.props.line.classes.push("versetext_com");
	
	  	if(this.props.line.line==null) return null;
		this.props.line.line =this.props.line.line.replace(/[{}]/gi,"");
		
		var line = <span>{this.props.line.line}</span>;
		
		if(this.props.highlights!==null && this.props.highlights!==undefined)
		{
			if(this.props.highlights.length>0)
			{
				var regex = null
				if(this.props.highlights[0]==="partialmatch")
				{
					regex = new RegExp("("+this.props.highlights.slice(1).join("|").replace(/[^A-z| ]/,"")+")",'ig');
				}else regex = new RegExp("\\b("+this.props.highlights.join("|")+")\\b",'ig');
				var parts = this.props.line.line.split(regex);
				line = parts.map((val,key)=>{
					if(val==="") return null;
					var classes = [];
					if(key % 2 !== 0  ) classes.push("word_highlight");
					return (<span className={classes.join(" ")} key={key}>{val}</span> )
				});
			}
			
		}
		    	return(
		  			<span 
              		onMouseEnter={() => {  this.props.app.setActiveVerse(this.props.line.verse_id) }}
              		onClick={() => this.props.app.selectVerse(this.props.line.verse_id)}
              		onContextMenu={(e) => { e.preventDefault(); this.props.app.doubleClickVerse(this.props.line.verse_id,"versebox")}}
		  			className={this.props.line.classes.join(" ")}>
		  			{line}{' '}</span>
		  		)
	  		
	  }
	
}



class VersionMeta extends Component {
	
	render()
	{
		var classes = ["meta"];
		if(this.props.open) classes.push("visible"); 
		
	
		var entries = this.props.app.state.top_versions.slice(0); for(var i in globalData["meta"]["version"]) if(entries.indexOf(i)<0) entries.push(i);
	    const options = entries.map(
	      (shortcode,optionKey ) => {
	      	var option = globalData["meta"]["version"][shortcode];
	      	return(<VersionOption  app={this.props.app} option={option} optionKey={optionKey} key={optionKey}  toggle={this.props.toggle} />)
	      }
	    );
		
		return(
			<div id="version_meta" className={classes.join(" ")} >
				<h4>Available Versions</h4>
				{options}
			</div>
		)
	}
	
}

class VersionOption extends Component 
{
	render()
	{
		var classes = ["option"];
		if(this.props.optionKey===0) classes.push("first top"); 
		else if(this.props.optionKey<5) classes.push("top"); 
		else if(this.props.optionKey===5) classes.push("other firstother"); 
		else classes.push("other"); 
		
		var audioimg = null
		if(globalData.meta.version[this.props.option.shortcode].audio===1) audioimg = <img alt="audio" src={audio} />
		

    	return ( <div className={classes.join(" ")} onClick={() => {
    	this.props.toggle();
    	this.props.app.setActiveVersion(this.props.option.shortcode)
    		
    	}}>
			<img alt="Option" src={require('../img/versions/'+this.props.option.shortcode.toLowerCase()+'.png')} />
		    <div className={"icon"}>{audioimg}{this.props.option.title}</div> 
		    <span>{this.props.option.description}</span> 
		</div> )
	}
	
	
}