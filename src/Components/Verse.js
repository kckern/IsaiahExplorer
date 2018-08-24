import React, { Component } from "react";
import { globalData } from "../globals.js";
import { Passage } from "./Passage.js";
import { Hebrew } from "./Hebrew.js";
import Tipsy from 'react-tipsy'
import sprocket_icon from '../img/interface/sprocket.png';
import play_icon from '../img/interface/play.png';
import playing_icon from '../img/interface/audio.gif';
import loading_icon from '../img/interface/audioload.gif';
import comment_icon from '../img/interface/comment.png';
import loading_img from '../img/interface/message.gif';
import heb_png from '../img/interface/hebrew.png';

export default class VerseColumn extends Component {
	
  constructor(props) {
    super(props);
    this.state = {  fullsize: false, spot:null, lastVersions:[]  };
    this.lastVersions = [];
    this.lastVerse = null;
    this.lastTags = [];
  }



 componentDidMount () {
	setTimeout(() => {
		if(this.props.app.state.ready===false)
		{
			this.setState({ fullsize: true });
			this.render();
		}
	}, 450)
 }
 
 
  render() {
  	
		    if(this.props.app.state.ready===false)
		    {
		    	var classes = ["loading"];
		    	if(this.state.fullsize===true) classes.push("fullsize");
		    	return(
			      <div className="col col2">
			        <div className="heading">
			          <div className="heading_subtitle" id="outline_subtitle">Verse Details</div>
			          <div className="heading_title">□{" "}<span id="outline_title">Verse Reference</span></div>
			            <div className="heading_title" id="audio_heading">
			            	<div id='audio_verse' className='active_audio'><img alt="Play Audio" src={loading_icon}/> Play Audio Verse</div>
			            	<div id='audio_commentary'><img alt="Audio Commentary" src={play_icon}/> Play Commentary <img alt="Select" id='com_option' src={sprocket_icon}/></div>
			            	<div  id="commentary"><img alt="Commentary" src={comment_icon} /> Read Commentaries</div>
		
			    		</div>
			        </div>
			        <div id="verse" className={classes.join(" ")}><img alt="Loading" src={loading_img}/><br/> Loading Verse Details...</div>
			      </div>
			    )
		    }
		   if([null,0,undefined].indexOf(this.props.app.state.active_verse_id) > -1) return false;
			
			var heading = "□ "+globalData.index[this.props.app.state.active_verse_id].string;
			
			var versions = this.lastVersions;
			if(!this.props.app.state.spotHover)
			{
				versions = this.props.app.state.top_versions.slice(0);
				var pos = versions.indexOf(this.props.app.state.version);
				if( pos >=0 ) versions.splice(pos,1);
				if(versions.length>4) versions = versions.slice(0,4);
				versions.push(this.props.app.state.version);
				

				
				this.lastVersions = versions;
			}

			var hebimg = null;
			if(this.props.app.state.hebrewReady===true) hebimg =  <img src={heb_png} alt="tag" id="hebIcon" className="tag" onClick={()=>{
				if(this.props.app.state.hebrewMode) return this.props.app.setState({hebrewMode:false},this.props.app.clearTag.bind(this.props.app));
				this.props.app.setState({hebrewMode:true},this.props.app.setUrl.bind(this.props.app));
				
			}}/>
			
			var swap_imgs = versions.map((shortcode,key)=>{
					var classes = [];
					if(shortcode!==this.props.app.state.version) classes.push("alt");
					return (<img alt="spot"
					onMouseEnter={()=>this.props.app.spotVerse(shortcode)}
					onMouseLeave={()=>this.props.app.spotVerse(this.props.app.state.version)}
					onClick={()=>this.props.app.setActiveVersion(shortcode)}
					className={classes.join(" ")}  
					src={require('../img/versions/'+shortcode.toLowerCase()+'.jpg')} 
					key={key} />) 
			});
			var readhide = "Read Commentaries";
			if(this.props.app.state.commentaryMode) readhide = "Hide Commentaries"
		return(
			    <div className="col col2">
			    	<div className="heading">
			            <div className="heading_subtitle">{hebimg}Verse Details</div>
			    		<div className="heading_title" id="detail_heading">{heading}
			    		<div className="swapverse" 
			    		onClick={this.props.app.freezeSwap.bind(this.props.app)}
			    		onMouseLeave={this.props.app.reOrderSwap.bind(this.props.app)}
			    		>
			    			{swap_imgs}
			    		</div>
			    		</div>
			            <div className="heading_title" id="audio_heading">
			            	<AudioVerse app={this.props.app} />
			            	<AudioCommentary app={this.props.app} />
			            	<div  id="commentary"  onClick={()=>this.props.app.setState({commentaryMode:!this.props.app.state.commentaryMode,commentary_verse_range:[],selected_verse_id:null,commentary_verse_id:this.props.app.state.active_verse_id,infoOpen:false},this.props.app.setUrl.bind(this.props.app))}><img alt="Commentary" src={comment_icon}/> {readhide}</div>
		
			    		</div>
			    	</div>
			    	<VersePanel  
				    	app={this.props.app} 
			    	/>
			    </div>
			     
		)
	}
}


class AudioVerse extends Component {

	startPlaying()
	{
		
			this.props.app.setState({    
				audioState:"loading",
				audioPointer:0,
				selected_verse_id:null,  
				commentary_audio_verse_range:[],
	    		commentaryAudioMode:false},this.props.app.setUrl.bind(this.props.app))
	}

	handleClick()
	{
		if(globalData.meta.version[this.props.app.state.version].audio!==1) return false;
		if(this.props.app.state.audioState!==null)
		{
			this.props.app.setState({  audioState:null },function(){
				if(this.props.app.state.commentaryAudioMode)	this.startPlaying();
				this.props.app.setUrl();
			}.bind(this))
		}
		else
		{
			this.startPlaying();
			this.props.app.setUrl();
		}
	}



	render()
	{
		var classes = [];
		
		if(globalData.meta.version[this.props.app.state.version].audio!==1 && this.props.app.state.hebrewMode===false) classes.push("noaudio");
		
		
		var icon = play_icon;
		var text = "Play Audio Verse";
		if(this.props.app.state.commentaryAudioMode===false)
		{
			if(this.props.app.state.audioState==="loading") { icon=loading_icon; text="Loading Audio Verse"; classes.push("active_audio")}
			if(this.props.app.state.audioState==="playing") { icon=playing_icon; text="Pause Audio Verse"; classes.push("active_audio")}
		}
		
		return (<div className={classes.join(" ")} onClick={this.handleClick.bind(this)} id='audio_verse'><img alt="Play Audio" src={icon}/> {text}</div>)
	}
	
}

class AudioCommentary extends Component {

	state= {options:false}
	
	startPlaying(shortcode)
	{
		
		this.props.app.setState({    
			audioState:"loading",
			audioPointer:0,
			tagMode:false,
			selected_verse_id:null,  
			commentaryAudio:shortcode,
    		commentaryAudioMode:true})
	}

	handleClick(e)
	{
		if(e===undefined) return false;
		if(e.target.id!=="audio_commentary") return false;
		if(this.props.app.state.audioState!==null)
		{
			this.props.app.setState({  audioState:null, commentary_audio_verse_range:[] },function(){
				if(!this.props.app.state.commentaryAudioMode)
				{
					this.startPlaying(this.props.app.state.commentaryAudio);
				}else
				{
					this.props.app.setState({commentaryAudioMode:false },
					this.props.app.setActiveVerse.bind(this.props.app,this.props.app.state.active_verse_id,undefined,undefined,undefined,"audio"));
				}
			}.bind(this))
		}
		else
		{
			this.startPlaying(this.props.app.state.commentaryAudio);
		}
	}
		
	handleOptions()
	{
		this.props.app.setState({  audioState:null },function(){this.setState({options:true});}.bind(this));
	}
	selectOption(e)
	{
		var shortcode = e.target.options[e.target.selectedIndex].attributes.shortcode.value;
		
		if(shortcode==="top") return false;
		
		this.startPlaying(shortcode);
			this.setState({options:false});
		
	}

	render()
	{
		
		if(this.state.options)
		{
			var options = null;
			var items = [<option key="top" shortcode="top">Make a selection:</option>];
			
			for(var i in globalData.meta.audiocom)
			{
				var it = globalData.meta.audiocom[i];
				items.push(<option key={it.shortcode} shortcode={it.shortcode}> ⤷ {it.title}</option>);
			}
			
			options = (<select onChange={this.selectOption.bind(this)} id="com_selector">{items}</select>)
			
		return (<div id='audio_commentary'  onClick={this.handleClick.bind(this)} >{options}</div>)
		}
		
		
		var classes = [];
		var icon = play_icon;
		var text = "Play Commentary";
		if(this.props.app.state.commentaryAudioMode)
		{
			if(this.props.app.state.audioState==="loading") { icon=loading_icon; text="Loading Commentary"; classes.push("active_audio")}
			if(this.props.app.state.audioState==="playing") { icon=playing_icon; text="Pause Commentary"; classes.push("active_audio")}
		}
		
		return (<div className={classes.join(" ")}  id='audio_commentary'  onClick={this.handleClick.bind(this)} ><img alt="Audio Commentary" src={icon}/> {text} <img onClick={this.handleOptions.bind(this)} alt="Select" id='com_option' src={sprocket_icon}/></div>)
	}
	
}


class VersePanel extends Component {
	
		
  constructor(props) {
    super(props);
    this.state = { passagesMore: false, sectionsMore: false  };
  }
  
  seeMorePassages(){this.setState( {passagesMore: true});}
  seeMoreSections(){this.setState( {sectionsMore: true});}
  reset(){this.setState({ tagsMore: false, passagesMore: false, sectionsMore: false });}
  resetTags(){this.setState({ tagsMore: false});}

  
  componentDidMount()
  {
  	this.props.app.spreadVerse();
  }
  componentDidUpdate()
  {
  	this.props.app.spreadVerse();
  }
  
	render()  {
		
	var highlights = [null];
	if(this.props.app.state.hebrewMode && this.props.app.state.hebrewStrongIndex !== null && this.props.app.state.hebrewReady)
	{
		var tmp = globalData.hebrew.high;
		if(tmp[this.props.app.state.hebrewStrongIndex]!==undefined)
		highlights = tmp[this.props.app.state.hebrewStrongIndex].h;
	}

  	var seeMorePassages = this.seeMorePassages.bind(this);
  	var seeMoreSections = this.seeMoreSections.bind(this);
  	
		return <div id="verse" >
		<Hebrew app={this.props.app}  />
    <div className="verse_container">
        <Passage app={this.props.app}  verses={this.props.app.state.active_verse_id}  highlights={highlights}   spottable={true} wrapperId="verse_text"/>
    </div>
    <ExtraVersions  app={this.props.app}  highlights={highlights} />
	<TagBox   app={this.props.app} />
    <SeeMoreTags  app={this.props.app} />
    <PassagesBox  app={this.props.app} showFull={this.state.passagesMore} resetter={this.reset.bind(this)} />
    <SeeMore clicker={seeMorePassages} clicked={this.state.passagesMore} />
	<SectionsBox  app={this.props.app} showFull={this.state.sectionsMore} resetter={this.reset.bind(this)} />
    <SeeMore clicker={seeMoreSections} clicked={this.state.sectionsMore} />
</div>
	}
}

class ExtraVersions extends Component {
	
	render()
	{
		var cells = [];
		var heads = [];
		var num = this.props.app.state.version_views;
		for(var i in this.props.app.state.top_versions)
		{
			if(i>=num) continue;
			var ver = this.props.app.state.top_versions[i];
			
			if(globalData["text"][ver]===undefined) 	cells.push(<td  key={i}>Loading...</td>);
			else cells.push(<td  key={i}>
				<Passage 
				app={this.props.app}  
				plain={1}
				verses={this.props.app.state.active_verse_id} 
				version={ver} 
				highlights={this.props.highlights} />
				</td>);
			heads.push(<td key={i}>{<img alt="Passage Version" src={require('../img/versions/'+ver.toLowerCase()+'.jpg')} />}</td>);
		}
		
		var extra = null;
		var heading = null;
		
		if(num>1)
		{
		extra = <div key={2} className={"extraversions count"+num}>
			<table><tbody><tr className="head">{heads}</tr><tr className="cells">{cells}</tr></tbody></table>
		</div>;
		heading = <h4 key={3}>{num} Side-by-side Translations</h4>;
		}
		return [
			<Tipsy  key={1} content="Number of side-by-side translations" placement="left" trigger="hover focus touch" className="sbs">
			<span   key={4} onClick={this.props.app.cycleVersionViews.bind(this.props.app)} className="vernum">{num}</span></Tipsy>,
			heading,
			extra
			]
	}
	
}

class SeeMoreTags extends Component {
	

	
	render()
	{
		if(this.props.clicked) return null;
		return(<div className="readmore" onClick={this.props.app.moreTags.bind(this.props.app)}>See More Tags...</div>)
		
	}
	
}


class TagBox extends Component{ 
	
	
  constructor(props) {
    super(props);
     this.state = { oversize: null };
     this.tags = [];
  }

	
	 componentDidUpdate() {

	 	const height = this.divElement.clientHeight;
	 	if(height>90 )
	 	{
	 	//	this.setState({oversize:true});
	 	}
	 	else if(height<=90)
	 	{
	 	//	this.setState({oversize:false});
	 	}
	 	 
	 }
	
	
	render()
	{

		this.tags = this.props.app.getVerseTags(this.props.app.state.active_verse_id);
		var tagLinks = this.tags.map((tagName,key)=>{
			return (<TagLink tagName={tagName}  app={this.props.app}  key={key}/>) 
		});
		
		var classes = ["verse_info_box","tags"];
		

		return(    
		<div className={classes.join(" ")} ref={ (divElement) => this.divElement = divElement} >
			<h4>Verse Tags</h4>
			{tagLinks}
        </div>)
	}
}

class TagLink extends Component{

	render()
	{

    	var classes = ["taglink"];
    	if(this.props.app.state.selected_tag===this.props.tagName) classes.push("tag_highlighted");
    	var tagData = this.props.app.getTagData(this.props.tagName);
    	var content = (<div><div className="pedigree"><span>{tagData.parents.filter(v => v !== 'root').reverse().join(" » ")}</span></div><div>{tagData.description.trim().replace(/\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)$/g,"\u00a0$1\u00a0$2\u00a0$3")}</div></div>);
    	
		return(
			<Tipsy content={content} placement="top" trigger="hover focus touch" className="tagtip">
			<div 
			className={classes.join(" ")}
			onMouseEnter={()=>this.props.app.setPreviewedTag(this.props.tagName)}
			onMouseLeave={()=>this.props.app.setPreviewedTag(null)}
			onClick={()=>this.props.app.setActiveTag(this.props.tagName)}
			>{this.props.tagName}</div></Tipsy>
		)
	}
}


class PassagesBox extends Component{
	
	render()
	{
		if(this.props.app.state.active_verse_id===null) return null;
	    var entries = this.props.app.state.top_outlines.slice(0); for(var i in globalData["meta"]["outline"]) if(entries.indexOf(i)<0) entries.push(i); 
	    const Passagelist = entries.map(
	      (option, optionKey) => {
	      	
	      	var shortcode = option;
	      	var index = parseInt(globalData["outlineIndex"][this.props.app.state.active_verse_id][shortcode],0);
	      	var outline = globalData["outlines"][shortcode];
	      	
	      	if(typeof outline[index] === "undefined") return null;

	      	
	      	var heading = outline[index];
	      	
	      	var classes = []; //active first
	      	if(shortcode===this.props.app.state.outline) classes.push("active");
	      	
	      	var item = {};
	      	item['classes']  	= classes;
	      	item['shortcode']  	= shortcode;
	      	item['heading']  	= heading.heading;
	      	
	        return (
	          <PassagesLink
	            key={optionKey}
	            item={item}
	            app={this.props.app}
	            resetter={this.props.resetter}
	          />
	        );
	      }
	    );
	    var classes = ["verse_info_box","outline"];
	    if(!this.props.showFull) classes.push("top5");
		return(    
		    <div className={classes.join(" ")}>
        <h4>Encompassing Passages</h4>
        <div>{Passagelist}</div>
    </div>)
	}
}

class PassagesLink extends Component{
	render()
	{
		
		return(
		 <div 
		 onClick={() => { this.props.app.setActiveOutline(this.props.item.shortcode); this.props.resetter(); }}
			onMouseEnter={()=>this.props.app.setPreviewedPassage(this.props.item.shortcode)}
			onMouseLeave={()=>this.props.app.setPreviewedPassage(null)}
		 >
            <div  className={this.props.item.classes.join(" ")} >
            
            <img   alt="Passage Version" src={require('../img/versions/'+this.props.item.shortcode+'.jpg')} /> <span>{this.props.item.heading}</span> </div>
        </div>
		)
	}
}


class SectionsBox extends Component{
	
	render()
	{
		if(this.props.app.state.active_verse_id===null) return null;
	    
	    var entries = this.props.app.state.top_structures.slice(0); for(var i in globalData["meta"]["structure"]) if(entries.indexOf(i)<0) entries.push(i); 
	    const Sectionlist = entries.map(
	      (option, optionKey) => {
	      	var shortcode = option;
	      	var index = parseInt(globalData["structureIndex"][this.props.app.state.active_verse_id][shortcode],0);
	      	var structure = globalData["structures"][shortcode];
	      	var section = structure[index];
	      	var count = "⦗"+(index+1)+"/"+structure.length+"⦘";
	      	
	      	var classes = []; //active first
	      	if(shortcode===this.props.app.state.structure) classes.push("active");
	      	
	      	var item = {};
	      	item['classes']  	= classes;
	      	item['title']  		= globalData["meta"]["structure"][shortcode].title;
	      	item['shortcode']  	= shortcode;
	      	item['section']  	= count+" "+section.description;
	      	
	        return (
	          <SectionsLink
	            key={optionKey}
	            item={item}
	            app={this.props.app}
	            resetter={this.props.resetter}
	            
	          />
	        );
	      }
	    );

	    var classes = ["verse_info_box","structure"];
	    if(!this.props.showFull) classes.push("top5");
		return(    
		    <div className={classes.join(" ")}>
	        <h4>Corresponding Structural Sections</h4>
	        <div>{Sectionlist}</div>
	    </div>)
	}
}

class SectionsLink extends Component{
	render()
	{
		return(
	        <div 
	        onClick={() => { this.props.app.setActiveStructure(this.props.item.shortcode); this.props.resetter(); }}
			onMouseEnter={()=>this.props.app.setPreviewedSection(this.props.item.shortcode)}
			onMouseLeave={()=>this.props.app.setPreviewedSection(null)}
	        >
	            <div  className={this.props.item.classes.join(" ")} >
	                <div className="icon">{this.props.item.title}</div> 
	                <span><img alt="Logo"  src={require('../img/structures/'+this.props.item.shortcode+'.png')}  />{this.props.item.section}</span> </div>
	        </div>
		)
	}
}



class SeeMore extends Component {
	
	render()
	{
		
		if(this.props.clicked) return null;
		return(<div className="readmore" onClick={this.props.clicker}>See More...</div>)
		
	}
	
}
