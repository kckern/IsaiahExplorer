import React, { useContext, useEffect, useState } from "react";
import { DataContext } from "../DataContext";


export function Hebrew() {
	var globalData = useContext(DataContext);
	var state = globalData.state;
	if(!state.hebrewMode) return null;
	var hebrew = globalData.hebrew.verses[state.active_verse_id];
	var words = hebrew.map((val,key)=>{
		return <HebrewWord  key={key}  val={val} />
	});
	var cls = "";
	if(state.hebrewFax) cls = "fax";
	return (<div id="hebrew" className={cls} dir="rtl"><HebrewFax /><div id="hebrew_text_box" ><div id="hebrew_text" >{words}</div></div></div>)
}

function HebrewFax() {
	var globalData = useContext(DataContext);
	var app = globalData.app;
	var state = globalData.state;
	var [position,setPosition] = useState({ x: 0, y: 0 });

	var defaultPan = () => {
		var pos = globalData.hebrew.fax[state.active_verse_id];
		if(pos===null) return false;
		setPosition({ x: -pos[0]/2, y: -pos[1]/2 });
	};

	var onMouseMove = (e,classname) => {
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
		var y = m_posy-e_posy;

		x = x/bounds.width;
		y = y/bounds.height;

		var size = globalData.hebrew.fax[state.active_verse_id];

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

		setPosition({x:x,y:y});
	};

	var moveNav = (e) => {
		onMouseMove(e,"faxNav");
	};

	var moveZoom = (e) => {
		onMouseMove(e,"faxZoom");
	};

	var resizeViewers = () => {
		if(document.getElementsByClassName("faxNav")[0]===undefined) return false;
		var bounds = document.getElementsByClassName("faxNav")[0].getBoundingClientRect();
		var size = globalData.hebrew.fax[state.active_verse_id];
		if(size===null) return false;
		var multiple = size[0]/bounds.width;
		var h = size[1]/multiple;
		document.getElementsByClassName("faxNav")[0].style.height = h+"px";
		document.getElementsByClassName("faxZoom")[0].style.height = 400-h+"px";
	};

	useEffect(() => {
		resizeViewers();
		defaultPan();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		resizeViewers();
	});

	if(state.hebrewFax===false)
	{
		if(globalData.hebrew.fax[state.active_verse_id]===null) return null;
		return <button type="button" className="linklike" id="seefax" onClick={()=>app.setState({hebrewFax:true})}> Facsimile <span role="img" aria-label="scroll">&#x1F4DC;</span> </button>
	}

	if(globalData.hebrew.fax[state.active_verse_id]===null) return (<div className="faxBox none">
		<div className="faxZoom" > No Facsimile </div>
		<div className="faxNav"> No Facsimile </div>
	</div>)
	//http://old.isaiah.scripture.guide/img/scroll/verses/18658.jpg
	//return null;
	var faxNavStyle = {
	  backgroundImage: "url(https://scripture-guide-assets.s3.us-west-2.amazonaws.com/scroll/"+state.active_verse_id+".jpg)"
	};
	var faxZoomStyle = {
		backgroundPosition: position.x+"px "+position.y+"px",
	  backgroundImage: "url(https://scripture-guide-assets.s3.us-west-2.amazonaws.com/scroll/"+state.active_verse_id+".jpg)"
	};
	return (<div className="faxBox">
		<div className="faxZoom"  onMouseMove={moveZoom}   style={faxZoomStyle}></div>
		<div onMouseMove={moveNav} onMouseLeave={defaultPan} className="faxNav" style={faxNavStyle}></div>
	</div>)
}


function HebrewWord({val}) {
	var globalData = useContext(DataContext);
	var app = globalData.app;
	var state = globalData.state;

	var handleClick = () => {
		if(state.hebrewSearch && val.strong===state.hebrewStrongIndex)
		{
			app.setState({hebrewSearch:false,hebrewStrongIndex:null,searchMode:false},function(){
				app.setActiveVerse(state.active_verse_id,undefined,undefined,undefined,"tag");
			});
			return false;
		}
		app.searchHebrewWord(val.strong)
	};

	var handleMouseEnter = () => {
		if(state.hebrewSearch) return false;
		app.setHebrewWord(val.strong,val.word)
	};

	var handleMouseLeave = () => {
		return app.setState({
			highlighted_tagged_verse_range:[],
		});
	};

	var classes = [];
	if(val.strong===state.hebrewStrongIndex) classes.push("active");
	var punct = null;
	var heb = globalData.hebrew;
	var worddata = null;
	for(var word in heb.verses[state.active_verse_id])
	{
		if(heb.verses[state.active_verse_id][word].strong===val.strong)
		{
			worddata = heb.verses[state.active_verse_id][word];
			break;
		}
	}
	var hebTitle = worddata.eng.replace(/[[\]]/g,"");
	return <span><span key="a" className={classes.join(" ")}
		title={hebTitle}
		aria-label={hebTitle}
		onClick={handleClick}
		onMouseEnter={handleMouseEnter}
		onMouseLeave={handleMouseLeave}
	>{val.orig}</span>{punct}<span key="s" className="space" /></span>
}




export function HebrewSearchHeading() {
	var globalData = useContext(DataContext);
	var state = globalData.state;
	var verses = state.highlighted_verse_range;
	var data = globalData.hebrew.high[state.hebrewStrongIndex];
	var w,p = null;
	if(data!==undefined){w=data.w; p=data.p.normalize('NFD').replace(/[^A-z]/g, "");}
	var count = verses.length;
	return(
		<div className="text_heading search">
		<span className="section_tile" ><StrongLink strong={state.hebrewStrongIndex}/>▽ {count} Matching Verses</span><br />
		<span id="drarrow">⤷</span>▷ 
		<span className="hword">{w}</span><span className="hphon"> • {p}</span>
		</div>
	)
}


export function StrongLink({strong}) {
	var app = useContext(DataContext).app;

	var strongshow = (e) => {
		e.preventDefault();
		app.PopupCenter("https://thekingjam.es/strongs/H"+strong,"Strong's Concordance",1000,750);
		e.stopPropagation();
	};

	if(strong===undefined) return null;
	if(strong===null) return null;
	return (<a className="strong" onClick={strongshow} href={"https://thekingjam.es/strongs/H"+strong}>Strong-{strong}</a>);
}