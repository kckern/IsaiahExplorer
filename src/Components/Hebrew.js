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
		var cls = "";
		if(this.props.app.state.hebrewFax) cls = "fax";
		return (<div id="hebrew" className={cls} dir="rtl"><HebrewFax app={this.props.app} /><div id="hebrew_text_box" ><div id="hebrew_text" >{words}</div></div></div>)
	}
	
}

class HebrewFax extends Component{
	
  constructor(props) {
    super(props);
    this.state = { x: 0, y: 0 };
  }
  
  defaultPan()
  {
  	
	var pos = globalData.hebrew.fax[this.props.app.state.active_verse_id];
	if(pos===null) return false;
 
    this.setState({ x: -pos[0]/2, y: -pos[1]/2 });
  }
  
  moveNav(e)
  {
  	this._onMouseMove(e,"faxNav");
  }
  
  moveZoom(e)
  {
  	this._onMouseMove(e,"faxZoom");
  }
  

  _onMouseMove(e,classname) {
  	var bounds = document.getElementsByClassName(classname)[0].getBoundingClientRect();
  	
    var m_posx = 0, m_posy = 0, e_posx = 0, e_posy = 0,
           obj = document.getElementsByClassName(classname)[0];
    //get mouse position on document crossbrowser
    if (!e){e = window.event;}
    if (e.pageX || e.pageY){
        m_posx = e.pageX;
        m_posy = e.pageY;
    } else if (e.clientX || e.clientY){
        m_posx = e.clientX + document.body.scrollLeft
                 + document.documentElement.scrollLeft;
        m_posy = e.clientY + document.body.scrollTop
                 + document.documentElement.scrollTop;
    }
    //get parent element position in document
    if (obj.offsetParent){
        do { 
            e_posx += obj.offsetLeft;
            e_posy += obj.offsetTop;
        // eslint-disable-next-line
        } while (obj = obj.offsetParent);
    }
    
    var x = m_posx-e_posx;
    var y = m_posy-e_posy
    
    x = x/bounds.width;
    y = y/bounds.height;
    
    var size = globalData.hebrew.fax[this.props.app.state.active_verse_id];
    
    if(classname==="faxNav")
    {
	    x = -x * size[0];
	    y = -y * size[1];
	    
    	bounds = document.getElementsByClassName("faxZoom")[0].getBoundingClientRect();
	    x = x + (bounds.width/2);
	    y = y + (bounds.height/2);
    }
    else
    {	
	    x = -x * (size[0]-bounds.width);
	    y = -y * (size[1]-bounds.height);
    }
    
    this.setState({x:x,y:y});
    
  }
  
  resizeViewers()
  {
  	if(document.getElementsByClassName("faxNav")[0]===undefined) return false;
  	var bounds = document.getElementsByClassName("faxNav")[0].getBoundingClientRect();
  	var size = globalData.hebrew.fax[this.props.app.state.active_verse_id];
  	if(size===null) return false;
  	var multiple = size[0]/bounds.width;
  	var h = size[1]/multiple;
  	document.getElementsByClassName("faxNav")[0].style.height = h+"px";
  	document.getElementsByClassName("faxZoom")[0].style.height = 400-h+"px";
  }
  
  componentDidMount()
  {
  	this.resizeViewers();
	this.defaultPan();

  }
	
  componentDidUpdate()
  {
  	this.resizeViewers();
  }
	
	render()
	{
		if(this.props.app.state.hebrewFax===false)
		{
			if(globalData.hebrew.fax[this.props.app.state.active_verse_id]===null) return null;
			return <div id="seefax" onClick={()=>this.props.app.setState({hebrewFax:true})}> Facsimile <span role="img" aria-label="scroll">&#x1F4DC;</span> </div>
		}
		
		
		if(globalData.hebrew.fax[this.props.app.state.active_verse_id]===null) return (<div className="faxBox none">
			<div className="faxZoom" > No Facsimile </div>
			<div className="faxNav"> No Facsimile </div>
		</div>)
		//http://old.isaiah.scripture.guide/img/scroll/verses/18658.jpg
		//return null;
		var faxNavStyle = {
		  backgroundImage: "url(https://scripture-guide-assets.s3.us-west-2.amazonaws.com/scroll/"+this.props.app.state.active_verse_id+".jpg)"
		};
		var faxZoomStyle = {
			backgroundPosition: this.state.x+"px "+this.state.y+"px",
		  backgroundImage: "url(https://scripture-guide-assets.s3.us-west-2.amazonaws.com/scroll/"+this.props.app.state.active_verse_id+".jpg)"
		};
		return (<div className="faxBox">
			<div className="faxZoom"  onMouseMove={this.moveZoom.bind(this)}   style={faxZoomStyle}></div>
			<div onMouseMove={this.moveNav.bind(this)} onMouseLeave={this.defaultPan.bind(this)} className="faxNav" style={faxNavStyle}></div>
		</div>)
	}
}


class HebrewWord extends Component {

	handleClick()
	{
		if(this.props.app.state.hebrewSearch && this.props.val.strong===this.props.app.state.hebrewStrongIndex)
		{
			this.props.app.setState({hebrewSearch:false,hebrewStrongIndex:null,searchMode:false},function(){
				this.props.app.setActiveVerse(this.props.app.state.active_verse_id,undefined,undefined,undefined,"tag");
			}.bind(this));
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
		return <span><Tipsy  key="a" content={worddata.eng.replace(/[[\]]/g,"")} placement="top" trigger="hover focus touch" className="hebdef">
			<span className={classes.join(" ")}
			onClick={this.handleClick.bind(this)}
			onMouseEnter={this.handleMouseEnter.bind(this)}
			onMouseLeave={this.handleMouseLeave.bind(this)}
		>{this.props.val.orig}</span></Tipsy>{punct}<span key="s" className="space" /></span>
	}
	
}




export class HebrewSearchHeading extends Component {
	
	render()
	{
		var verses = this.props.app.state.highlighted_verse_range;
		var data = globalData.hebrew.high[this.props.app.state.hebrewStrongIndex];
		var w,p = null;
		if(data!==undefined){w=data.w; p=data.p.normalize('NFD').replace(/[^A-z]/g, "");}
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