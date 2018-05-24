import React, { Component } from 'react';
import settings_icon from './img/interface/settings.png';
import video_icon from './img/interface/video.png';
import StructureColumn from './Components/Structure.js';
import SectionColumn from './Components/Section.js';
import PassageColumn from './Components/Passage.js';
import VerseColumn from './Components/Verse.js';
import Settings from './Components/Settings.js';
import {TagFloater} from './Components/Tags.js';
import {globalData} from './globals.js';
import './App.css';

class App extends Component {
	
  floater = {};
  
  state = {
    ready: false,
    globalData: null,
    
    top_versions: [] ,
    top_outlines: [] ,
    top_structures: [] ,
    
    version: null,
    outline: null,
    structure: null,
    spot:null,
    spotHover:false,
    
    settings: null,
    
    selected_verse_id: null,
    active_verse_id: null,
    selected_tag: null,
    showcase_tag: null,
    previewed_tag: null,
    highlighted_heading_index: null,
    highlighted_section_index: null,
    highlighted_tagged_verse_range: [],
    highlighted_tagged_parent_verse_range: [],
    highlighted_verse_range: [],
    highlighted_section_verses: [],
    timeouts: [],
    selected_tag_block_index: null,
    chiasm_letter:null,
    more_tags:false,
    
    infoOpen:false,
    allCollapsed:false,
    tagMode:false,
    searchMode:false,
    comSearchMode:false,
    preSearchMode:false,
    searchQuery: null,
    
    
    commentaryMode: false,
    commentarySource: "gileadi",
    commentaryID: null,
    commentary_verse_id: null,
    commentary_verse_range: [],
    commentary_verse_lookup: [],
    
    
    ui_version_loading: false,
    ui_core_loading: true

  }
  

  load_queue = ["index","meta","outlines","structures","tags","version","com"];
  pull(element) {
    const index = this.load_queue.indexOf(element);
    
    if (index !== -1) {
        this.load_queue.splice(index, 1);
    }
}

  
//preload images
 componentDidMount() {


    var img=new Image();
    img.src=require("./img/interface/book.gif");;
    img.onload = this.initApp();

 }
 
 componentWillMount()
 {
    document.addEventListener("keydown", this.keyDown.bind(this));
 }
 
 saveFloater(key,item)
 {
 	this.floater[key] = item;
 	var fn = this.checkFloater.bind(this);
 	fn();
 }
	
 render() {
 	


	var settingsPanel = null;
	if(this.state.settings===true) settingsPanel = ( [<div key="shader" className='shader' onClick={() => this.closeSettings()}/>,<Settings key="settingbox" app={this}/>] );
	else settingsPanel = null;
	
	
		var classes = [];  
		if(this.state.infoOpen===true)  classes.push("infoOpen"); 
		if(this.state.commentaryMode===true)  classes.push("commentaryMode"); 
		
		var title = (<span>Isaiah Explorer</span>);

 	return (
			<div id="approot" className={classes.join(" ")} onKeyDown={this.keyDown.bind(this)}>
				<h1>
				<img alt="Settings" onClick={() => this.openSettings()} src={settings_icon} className='settings'/>
				{title}
				<img  alt="Video" src={video_icon} className='demo'/>
				</h1>
				<div className="wrapper">
					<StructureColumn  	app={this}/>
					<SectionColumn 		app={this}/>
					<VerseColumn 		app={this}/>
					<PassageColumn 		app={this}/> 
				</div>
				{settingsPanel}
				<TagFloater app={this} floater={this.floater}/>
			</div>
    );
  }
  
  initApp()
  {
  	
  		var settings = localStorage.getItem('settings');
	    try { settings = JSON.parse(settings); } 
	    catch(e) {  settings = {}; }
	    if(settings === null) settings = {};
	    
	    
	    if(settings.top_versions===undefined) 	settings.top_versions = [];
	    if(settings.top_outlines===undefined) 	settings.top_outlines = [];
	    if(settings.top_structures===undefined) settings.top_structures = [];
	    
  		if(settings.top_versions.length !== 5) 		settings.top_versions = ["KJV","HBRS","NRSV","NIV","NASB"];
  		if(settings.top_outlines.length !== 5) 		settings.top_outlines = ["chapters","mev","nrsv","niv","msg"];
  		if(settings.top_structures.length !== 5) 	settings.top_structures = ["whole","bibleproject","bifid","authorship","wikipedia"];
  		
	    if(settings.version===undefined) 	settings.version = settings.top_versions[0];
	    if(settings.outline===undefined) 	settings.outline = settings.top_outlines[0];
	    if(settings.structure===undefined)   settings.structure = settings.top_structures[0];
	    
	    
  		this.setState(settings,function(){
			  this.saveSettings();
			  this.loadCore();
  		});
  }
  
  checkLoaded()
  {
  	if(this.load_queue.length===0)
  	{
  		this.setState({ ready: true, globalData: globalData });
  		this.setActiveVerse(17656);
  		
  	}
  }
  
  keyDown(e)
  {
  	if (e.keyCode === 27)
  	{
  		this.clearTag();
  		return false;
  	}
  	if(!this.state.preSearchMode && !this.state.searchMode && e.keyCode >= 65 && e.keyCode <= 90)
  	{
  		this.setState({preSearchMode:true});
  	}
  	
  	if(e.keyCode === 37) {e.preventDefault(); return this.left();}
  	if(e.keyCode === 38) {e.preventDefault(); return this.up();}
  	if(e.keyCode === 39) {e.preventDefault(); return this.right();}
  	if(e.keyCode === 38) {e.preventDefault(); return this.down();}
  	
  	//page up/down: cycle versions
  	if(e.keyCode === 33) return this.cycleVersion(-1);
  	if(e.keyCode === 34) return this.cycleVersion(1);
  	//home end: cycle outlines
  	if(e.keyCode === 36) return this.cycleOutline(-1);
  	if(e.keyCode === 35) return this.cycleOutline(1);
  	//ins/del: cycle structures
  	if(e.keyCode === 45) return this.cycleStructure(-1);
  	if(e.keyCode === 46) return this.cycleStructure(1);
  	
  	//tab: move to next section
  	if(e.keyCode === 9) { e.preventDefault(); return this.cycleSection(1);}
  	
  	//tilda opens commentary
  	if(e.keyCode === 192) { e.preventDefault(); return this.clickElementID("commentary");}
  	if(e.keyCode === 187) { e.preventDefault(); return this.clickElementID("tagIcon");}
  	
  }
  
  
  clickElementID(id)
  {
  	var el = document.getElementById(id);
  	if(el===null) return false;
  	el.click();
  }
  
  cycleSection(incr)
  {
  	if(incr===undefined) incr=1;
  	var index = parseInt(this.state.highlighted_section_index,0)+incr;
  	if (index >	globalData["structures"][this.state.structure].length-1) index = 0;
  	var verse = globalData["structures"][this.state.structure][index].verses[0][0];
  	this.setActiveVerse(verse,undefined,undefined,undefined,"versebox");
  }
  cycleHeading(incr)
  {
  	if(incr===undefined) incr=1;
  	var index = parseInt(this.state.highlighted_heading_index,0)+incr;
  	if (index >	globalData["outlines"][this.state.outline].length-1) index = 0;
  	var verse = globalData["outlines"][this.state.outline][index].verses[0][0];
  	this.setActiveVerse(verse,undefined,undefined,undefined,"versebox");
  }
  
  
  left()
  {
  	//if commentary hit next commentary button
  	if(this.state.commentaryMode) return this.clickElementID("com_prev");
  	//if tag, hit next tag button
  	if(this.state.selected_tag!==null) return this.clickElementID("tag_prev");
  	//if search do nothing
  	if(this.state.searchMode) return false;
  	//if normal move outline
  	this.cycleHeading(-1);
  }
  
  up()
  {
  	
  	var index = this.state.highlighted_verse_range.indexOf(this.state.active_verse_id)-1;
  	if(index===-1) index = this.state.highlighted_verse_range.length-1;
  	this.setActiveVerse(this.state.highlighted_verse_range[index],undefined,undefined,undefined,"versebox");
  }
  
  right()
  {
  	//if commentary hit next commentary button
  	if(this.state.commentaryMode) return this.clickElementID("com_next");
  	//if tag, hit next tag button
  	if(this.state.selected_tag!==null) return this.clickElementID("tag_next");
  	//if search do nothing
  	if(this.state.searchMode) return false;
  	//if normal move outline
  	this.cycleHeading(1);
  }
  
  down()
  {
  	var index = this.state.highlighted_verse_range.indexOf(this.state.active_verse_id)+1;
  	if(index===this.state.highlighted_verse_range.length) index = 0;
  	this.setActiveVerse(this.state.highlighted_verse_range[index],undefined,undefined,undefined,"versebox");
  }
  
  setTagBlock(key,verseId)
  {
  	this.setState({ selected_tag_block_index: key },function(){
  		
  		
	 	this.checkFloater();
	 	this.setActiveVerse(verseId);
  		
	});
	
  }
  
  search(query)
  {
  	var regex = new RegExp(''+query+'','igm');
  	var matches = [];
  	for(var x in globalData["text"][this.state.version])
  	{
  		if(globalData["text"][this.state.version][x].text.match(regex))
  		{
  			matches.push(parseInt(x,0));
  		}
  	}
  	
  	this.setState({
  			highlighted_verse_range: matches,
			selected_tag: 		null,
			infoOpen: 		false,
			tagMode: 		false,
    		comSearchMode: false,
    		preSearchMode: false,
			showcase_tag: 		null,
    		previewed_tag: null,
    		
			highlighted_tagged_verse_range: 		[],
			highlighted_tagged_parent_verse_range: [],
			searchMode:true,
			searchQuery:query},
			function(){
				if(matches.length>=1) this.setActiveVerse(matches[0]);
				//something after
  		
  	})
  }
  
  
  	spotVerse(shortcode)
	{
		this.setState({ spot: shortcode },function(){
			
		//	this.spreadVerse();
		});
	}
	spotDone(shortcode)
	{
		this.setState({ spot: null },function(){
			
		//	this.spreadVerse();
		});
	}
	reOrderSwap()
	{
		this.setState({ spotHover: false });
	}
	freezeSwap()
	{
		this.setState({ spotHover: true });
	}
	
	selectVerse(verse_id)
	{
		if(this.state.commentaryMode)
		{
			this.setState(
			{commentaryID: this.loadCommentaryID(),commentary_verse_id:verse_id },
			()=>this.setActiveVerse(verse_id,undefined,undefined,true)
			);
			if(verse_id!==this.state.active_verse_id) return true;
			return true;
		}
		
  		if(this.state.selected_tag !== null && this.state.highlighted_verse_range.indexOf(parseInt(verse_id,0))<0) return ()=>{};
		if(parseInt(this.state.selected_verse_id,0)===parseInt(verse_id,0)) return this.unSelectVerse();
		this.setState(
			{selected_verse_id: verse_id },
			()=>this.setActiveVerse(verse_id,undefined,undefined,true)
		);
	}
	unSelectVerse()
	{
		this.setState({ selected_verse_id: null });
	}
  
	openSettings()
	{
		this.setState({ settings: true });
	}
	closeSettings()
	{
		this.setState({ settings: false });
	}
  
  	saveSettings()
  	{
  		localStorage.setItem('settings', JSON.stringify({
  			version:this.state.version,
  			outline:this.state.outline,
  			structure:this.state.structure,
  			top_versions:this.state.top_versions,
  			top_outlines:this.state.top_outlines,
  			top_structures:this.state.top_structures}));
  	}
  	
  	setNewTop(list,value,new_index)
  	{
  			var tops = this.state[list].slice(0);
  			var old_index = tops.indexOf(value);
  			if(old_index>=0) tops.splice(old_index,1);
  			var saveme = {};
  			tops.splice(new_index,0,value);
  			saveme[list] = tops.slice(0,5);
  			this.setState(saveme,function(){
  				this.saveSettings();
  			});
  			
  	}
  
  spreadVerse()
  {
  	var text = document.getElementById("verse_text");
 	if(text===null) return false;
	var container = document.getElementById("verse").querySelectorAll(".verse_container")[0];
 	var box_height = container.offsetHeight;
 	var line_height=0.9;
 	text.style.lineHeight = line_height+"em";
 	while(box_height-text.offsetHeight>15) 
 	{
 		var incr = 0.1;
 		if(box_height-text.offsetHeight<0) incr = -0.1;
 		line_height = line_height + incr;
 		text.style.lineHeight = line_height+"em";
 		if(line_height>3) break;
 	}
  }
  
  spreadOutline()
  {
  	
	var outline = document.getElementById("outline");
	var grids = outline.querySelectorAll(".heading_grid");
	if(grids[0]===undefined) return false;
	var count = grids.length;
	var sum_height = 0; for (var i=0; i < count; i++) { sum_height +=grids[i].offsetHeight}
	var box_height = outline.getBoundingClientRect().height;
	var val = (box_height-sum_height-10)/count;
	if(box_height<sum_height){	val=0;	}
    for (i=0; i < count; i++) { grids[i].style.marginBottom = val+"px";}
  }
  
  tagOverflow()
  {
  	if(this.state.more_tags===true)return false;
  	var text = document.getElementById("verse");
 	if(text===null) return false;
  	var tagbox = text.querySelectorAll(".verse_info_box.tags")[0];
 	if(tagbox===undefined) return false;
 	
  	
  	tagbox.className = "verse_info_box tags";
  	if(tagbox.offsetHeight>100)
  	{
  		tagbox.className = "verse_info_box tags oversize";
  	}
  	else
  	{
  		tagbox.className = "verse_info_box tags regular";
  	}
  	
  }
  
  moreTags()
  {
  	if(this.state.more_tags===true)return false;
  	var text = document.getElementById("verse");
 	if(text===null) return false;
  	var tagbox = text.querySelectorAll(".verse_info_box.tags")[0];
 	if(tagbox===undefined) return false;
  	tagbox.className = "verse_info_box tags";
  	this.setState({more_tags:true});
  }
  
  loadCore()
  {
  	
  	this.lastTags = [];
  	this.lastVerseId = null;
  	
  	fetch("/core/meta.json").then(response => response.json()).then(data => {
      	globalData["meta"] = data;
      	this.pull("meta");
      	this.checkLoaded();
      	//Image Preloading
	 	(new Image()).src = require('./img/interface/version_loading.gif');
		Object.keys(globalData["meta"]["version"]).map(version => {
		  return  (new Image()).src = require('./img/versions/'+version.toLowerCase()+'.jpg');
		});
     });
     
  	fetch("/text/verses_"+this.state.version.toUpperCase()+".json").then(response => response.json()).then(data => {
      	globalData["text"][this.state.version] = data;
      	this.pull("version");
      	this.checkLoaded();
     });
  	fetch("/core/index.json").then(response => response.json()).then(data => {
      	globalData["index"] = data;
      	this.pull("index");
      	this.checkLoaded();
     });
  	fetch("/core/tags.json").then(response => response.json()).then(data => {
      	globalData["tags"] = data;
      	for(var x in globalData["tags"]["verseTagIndex"]) globalData["tags"]["verseTagIndex"][x] = this.shuffle(globalData["tags"]["verseTagIndex"][x]);
      	this.pull("tags");
      	this.checkLoaded();
     });

  	fetch("/core/structures.json").then(response => response.json()).then(data => {
      	globalData["structures"] = data;
		var structures = globalData["structures"];
		for (var structure_id in structures) {
		  for (var i in structures[structure_id]) {
		    for (var seg in structures[structure_id][i].verses) {
		      for (var j in structures[structure_id][i].verses[seg]) {
		        var verse = structures[structure_id][i].verses[seg][j];
		        if (!(verse in globalData["structureIndex"])) {
		          globalData["structureIndex"][verse] = {};
		        }
		        globalData["structureIndex"][verse][structure_id] = i;
		      }
		    }
		  }
		}
      	this.pull("structures");
      	this.checkLoaded();
     });
  	fetch("/core/outlines.json").then(response => response.json()).then(data => {
      	globalData["outlines"] = data;
		var outlines = globalData["outlines"];
		for (var outline_id in outlines) {
		  for (var i in outlines[outline_id]) {
		    for (var seg in outlines[outline_id][i].verses) {
		      for (var j in outlines[outline_id][i].verses[seg]) {
		        var verse = outlines[outline_id][i].verses[seg][j];
		        if (!(verse in globalData["outlineIndex"])) {
		          globalData["outlineIndex"][verse] = {};
		        }
		        globalData["outlineIndex"][verse][outline_id] = i;
		      }
		    }
		  }
		}
      	this.pull("outlines");
      	this.checkLoaded();
     });
     
     
  	fetch("/core/commentary.json").then(response => response.json()).then(data => {
      	globalData["commentary"] = data;
      	globalData.commentary['idIndex'] = {};
		var comIndex = globalData.commentary.comIndex;
		
		for (var verse_id in comIndex) {
		  for (var source in comIndex[verse_id]) {
		    for (var i in comIndex[verse_id][source]) {
		    	var thisid = comIndex[verse_id][source][i];
		    	if(globalData.commentary.idIndex[thisid] === undefined) globalData.commentary.idIndex[thisid] = {source:null,verse_ids:[]};
		    	globalData.commentary.idIndex[thisid]["source"] = source;
		    	globalData.commentary.idIndex[thisid].verse_ids.push(parseInt(verse_id,0));
		    }
		  }
		}
      	
      	this.pull("com");
      	this.checkLoaded();
     });

	//Load ALT
	setTimeout(function() { 
		for(var x in this.state.top_versions )
		{
			var ver = this.state.top_versions[x];
			if(ver===this.state.version) continue;
			const const_ver = ver;
				fetch("/text/verses_"+const_ver.toUpperCase()+".json").then((response) => response.json()).then((data) => {
			      	globalData["text"][const_ver] = data;
			     });
		}
	}.bind(this), 3000);
	
  }
  
  

  
  loadVersion(shortcode)
  {
  	  	this.setState({ ui_version_loading: true });	   
  		let image = new Image()
	    image.src = require('./img/versions/'+shortcode.toLowerCase()+'.jpg');
  		return fetch("/text/verses_"+shortcode+".json")
	      .then(response => response.json())
	      .then(data => {
	      	globalData["text"][shortcode] = data;
	      	this.setState({ version: shortcode, ui_version_loading: false, spot:null },
	      	function(){
			this.saveSettings();
	      	this.setActiveVerse(this.state.active_verse_id);
			if(this.state.searchMode) this.search(this.state.searchQuery);
	      	});
	      });
  }
  


  cycleStructure(incr)
  {
  	if(incr===undefined) incr = 1;
    var list = this.state.top_structures.slice(0);
    for(var key in globalData["structures"]) { if(list.indexOf(key)<0) list.push(key); }
    var pos = incr+list.indexOf( this.state.structure);
    if(pos >= list.length) pos=0;
    if(pos < 0) pos=list.length-1;
  	this.setActiveStructure(list[pos]);
  }
  cycleOutline(incr)
  {
  	if(incr===undefined) incr = 1;
    var list = this.state.top_outlines.slice(0);
    for(var key in globalData["meta"]["outline"]) { if(list.indexOf(key)<0) list.push(key); }
    var pos = incr+list.indexOf( this.state.outline);
    if(pos >= list.length) pos=0;
    if(pos < 0) pos=list.length-1;
  	this.setActiveOutline(list[pos]);
  }
  cycleVersion(incr)
  {
  	if(incr===undefined) incr = 1;
    var list = this.state.top_versions.slice(0);
    for(var key in globalData["meta"]["version"]) { if(list.indexOf(key)<0) list.push(key); }
    var pos = incr+list.indexOf( this.state.version);
    if(pos >= list.length) pos=0;
    if(pos < 0) pos=list.length-1;
  	this.setActiveVersion(list[pos]);
  }
  
  setActiveVerse(verse_id,structure,outline,force,source)
  {
  	if(this.state.selected_verse_id !== null && force===undefined) return ()=>{};
  	if(this.state.selected_tag !== null && this.state.highlighted_verse_range.indexOf(verse_id)<0) return ()=>{};
  	if(this.state.searchMode && this.state.highlighted_verse_range.indexOf(verse_id)<0 && source!=="newversion") return ()=>{};
  	
  	var searchMode = this.state.searchMode;
  	if(source==="closeSearch") searchMode=false;
  	
  	var allCollapsed = this.state.allCollapsed;
  	if(source==="versebox") allCollapsed=false;
  	else this.floater = {};
  	
  	
  	outline 	= outline 	=== undefined ? this.state.outline 		: outline;
  	structure 	= structure === undefined ? this.state.structure 	: structure;
	this.setState({ 
		active_verse_id: verse_id,
		more_tags: false,
		searchMode: searchMode,
    	previewed_tag: null,
		allCollapsed: allCollapsed,
		
		highlighted_verse_range: 		this.getHighlightedVerseRange(verse_id,outline,source),
		highlighted_section_verses: 	this.getSectionVerses(verse_id,structure),
		
		highlighted_heading_index: 		this.getHeadingIndex(verse_id,outline),
		highlighted_section_index: 		this.getSectionIndex(verse_id,structure),
		highlighted_tagged_verse_range: this.getTagHighlightRange(verse_id,source)
	},function(){
		//	this.spreadVerse();
			this.tagOverflow();
			this.scrollOutline(false,source);
			this.scrollText(false,source);
			this.checkFloater();
			if(this.state.searchMode && source==="newversion")
			{
				
				this.search(this.state.searchQuery);
			}
	});
  }
  
  
  scrollText(reset,source)
  {
  			if(source!=="versebox" && source!=="tag") return false;
  			
  			var time = 200;
  			if(source==="tag") time=0;
  	
			var container = document.getElementById("text");
			var element = container.querySelectorAll(".versebox_highlighted")[0];
			if(element===undefined) return false;
			if(container===undefined) return false;
			
			if(this.state.selected_tag!==null)
			if(globalData['tags']['tagIndex'][this.state.selected_tag].meta==="parallel")
			{
				element = element.parentNode.parentNode.parentNode.parentNode.previousSibling.previousSibling;
			}
			
			if(this.checkInView(container,element)===true) return false;
			
			var parent = container.childNodes[0].getBoundingClientRect().y;
			var child = element.getBoundingClientRect().y;
			const to = child-parent-200;
			if(reset===true) container.scrollTop=0;
			this.scrollBoxTo("text",container,to,time);
  }
  
  scrollOutline(reset,source)
  {
  	
  			if(source!=="versebox" || source!=="closeSearch") return false;
  	
			var container = document.getElementById("outline");
			var element = container.querySelectorAll(".heading_grid_highlighted")[0];
			if(element===undefined) return false;
			if(container===undefined) return false;
			
			if(this.checkInView(container,element)===true) return false;
			
			var parent = container.childNodes[0].getBoundingClientRect().y;
			var child = element.getBoundingClientRect().y;
			const to = child-parent-200;
			if(reset===true) container.scrollTop=0;
			this.scrollBoxTo("outline",container,to,200);
  }
  
  scrollTagTree(reset,source)
  {
  		
  			if(document.getElementsByClassName("tag_meta").length===0) return false;
  		
			var container = document.getElementsByClassName("tag_meta")[0];
			var element = container.querySelectorAll(".leaf.highlight")[0];
			
			if(element===undefined) return false;
			if(container===undefined) return false;
			
			if(this.checkInView(container,element)===true) return false;
			
			var parent = container.childNodes[0].getBoundingClientRect().y;
			var child = element.getBoundingClientRect().y;
			const to = child-parent-150;
			if(reset===true) container.scrollTop=0;
			this.scrollBoxTo("tag_meta",container,to,500);
  }
  
  checkInView(container, element, p) {
  	
  	if(container===undefined || element===undefined) return null;
	var partial = false;
	if(p===true) partial = true;
    //Get container properties
    let cTop = container.scrollTop;
    let cBottom = cTop + container.clientHeight;

    //Get element properties
    let eTop = element.getBoundingClientRect().y-container.getBoundingClientRect().y+cTop; // change here
    let eBottom = eTop + element.getBoundingClientRect().height;

    //Check if in view    
    let isTotal = (eTop >= cTop && eBottom <= cBottom);
    let isPartial = partial && (
      (eTop < cTop && eBottom > cTop) ||
      (eBottom > cBottom && eTop < cBottom)
    );
	
	//Return outcome
    return  (isTotal  || isPartial);
  }
  
  getTagHighlightRange(verse_id,source)
  {
  	verse_id = parseInt(verse_id,0);
  	//todo get range from verse id
	var tagStructure = globalData['tags']['tagStructure'][this.state.selected_tag];
	var tagMeta = globalData['tags']['tagIndex'][this.state.selected_tag];
	
	for(var x in tagStructure)
	{
	 var verses = tagStructure[x].verses.map(Number);
	 if(verses.indexOf(verse_id)>=0)
	 {
		if(tagMeta.type==="chiasm")
		{
			verses = [];
			var letter = x.replace(/[0-9]+/g,'');
			var keys = this.filtering(tagStructure,letter);
			for(var y in keys) verses = verses.concat(tagStructure[keys[y]].verses.map(Number));
			if(source==="versebox") this.setActiveChiasm(letter,verses);
			
		}
		if(tagMeta.type==="")
		{
			if(source==="versebox") this.setState({selected_tag_block_index:null});
		}
	 	return verses;
	 }
	}
	return [];
  }
  
  filtering(tagStructure,letter)
  {
  	  Object.keys(tagStructure).filter(val => val.replace(/[0-9]+/g,'')===letter);
  }
  
  setPreviewedTag(tagName,parent,leaf)
  {
  	this.clearTimeouts("tag_meta");
  	if(tagName===null){
		this.setState({ 
			showcase_tag:null,
			highlighted_tagged_verse_range:[],
			highlighted_tagged_parent_verse_range:[]
		});
  	}else
  	{
	  	var tagData = this.getTagData(tagName);
	  	if(tagData.verses===undefined) tagData.verses = [];
	  	
	  	if(parent===true && leaf!==undefined) this.setState({ showcase_tag:leaf, previewed_tag:leaf, highlighted_tagged_parent_verse_range: tagData.verses});
	  	else if(parent===true) {this.setState({ previewed_tag:tagName, highlighted_tagged_parent_verse_range: tagData.verses});}
		else this.setState({ previewed_tag:tagName, highlighted_tagged_verse_range: tagData.verses});
  	}
  }
  
  
  highlightTaggedVerses(verses)
  {
  	this.setState({ highlighted_tagged_verse_range: verses});
  }
  
  
  setPreviewedSection(shortcode)
  {
  	if(shortcode===null)
  	{
		this.setState({ highlighted_tagged_verse_range:[],highlighted_tagged_parent_verse_range:[]});
  	}else
  	{

		this.setState({ highlighted_tagged_parent_verse_range:[],
		highlighted_tagged_verse_range: this.getHighlightedVerseSectionRange(this.state.active_verse_id,shortcode) });
  	}
  }
  setPreviewedPassage(shortcode)
  {
  	if(shortcode===null)
  	{
		this.setState({ highlighted_tagged_verse_range:[],highlighted_tagged_parent_verse_range:[]});
  	}else
  	{
		
		this.setState({ highlighted_tagged_parent_verse_range:[], highlighted_tagged_verse_range: this.getHighlightedVerseRange(this.state.active_verse_id,shortcode) },function(){
			//this.spreadVerse();
		});
  	}
  	
  }
  
  
  setActiveChiasm(letter,verses)
  {
  	this.clearTimeouts();
  	if(verses===null || verses===undefined) verses = [];
	this.setState({ chiasm_letter: letter, highlighted_tagged_verse_range: verses },function(){
		var l = this.state.chiasm_letter;
		var list = [
			"left"+l+"1",
			"left"+l+"2",
			"left"+l,
			"right"+l+"1",
			"right"+l+"2",
			"right"+l]
		
		for(var y in list)
		{
			const x = y;
			if(document.getElementById(list[x])===null) continue;
			//document.getElementById(list[x]).scrollIntoView();
			
			var element = document.getElementById(list[x]);
			var container = element.parentNode;
			
			//Highlight readmore if not visible and active
			/*
			if(half.indexOf(parseInt(this.state.active_verse_id,0))>-1)
			{
				
		    	var allreads = document.getElementById("text").querySelectorAll(".readmore");
		    	for(var i in allreads) if(/active/.exec(allreads[i].className)) allreads[i].className = "readmore";
		    	var content = document.getElementById(list[x]+"content");
				var active = document.getElementById("text").querySelectorAll(".v_"+this.state.active_verse_id)[0];
		    	if(!this.checkInView(content,active))
		    	{
		    		var readmore = document.getElementById(list[x]+"readMore");
		    		console.log([content,active,readmore])
		    		if(readmore!==null) readmore.className = "readmore active";
		    	}
			}*/
			
			var parent = container.childNodes[0].getBoundingClientRect().y;
			var child = element.getBoundingClientRect().y;
			const to = child-parent-200;
			if(child>1000) { container.scrollTop = to; continue;}
			this.scrollBoxTo("chiasm",container,to,200);
			
			
		}
	});

  }
  
  
  
  scrollBoxTo(scope,element,to,duration)
  {
  	if(duration===0) { element.scrollTop = to; return true; }
	if(globalData["timeouts"][scope]===undefined) globalData["timeouts"][scope] = [];
	Math.easeInOutQuad = function (t, b, c, d) {
	  t /= d/2;
		if (t < 1) return c/2*t*t + b;
		t--;
		return -c/2 * (t*(t-2) - 1) + b;
	};
	

	    var start = element.scrollTop,
	        change = to - start,
	        currentTime = 0,
	        increment = 20;
	        
	        
	    var animateScroll = function(){ 
	        currentTime += increment;
	        var val = Math.easeInOutQuad(currentTime, start, change, duration);
	        element.scrollTop = val;
	        if(currentTime < duration) {
	        	
				if(globalData["timeouts"][scope]===undefined) globalData["timeouts"][scope] = [];
	            globalData["timeouts"][scope].push(setTimeout(animateScroll, increment));
	            this.checkFloater();
	        }
	    }.bind(this);
	    animateScroll();
}

 clearTimeouts(scope)
 {
 	for(var x in globalData["timeouts"][scope]) clearTimeout(globalData["timeouts"][x]);
 	globalData["timeouts"] = [];
 }
 

    PopupCenter(e, n, t, i) {
	 	var o =  window.screenLeft,
	 		d = window.screenTop,
	 		c = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth,
	 		w = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight,
	 		r = c / 2 - t / 2 + o,
	 		h = w / 2 - i / 2 + d,
	 		s = window.open(e, n, "scrollbars=yes, width=" + t + ", height=" + i + ", top=" + h + ", left=" + r);
	 	return window.focus && s.focus()
	 }
	 
  
	sgshow(e){ 
		e.preventDefault();
		this.props.app.PopupCenter("http://scripture.guide/"+this.props.reference.replace(/\s+/g,".").toLowerCase(),"Scripture Guide",1000,750);
		e.stopPropagation();
		}  
    
    
	addLinks(string)
	{
		var blocks = [];
		var items = string.split(/[{}]/);
		for(var i=0; i<items.length; i++)
		{
			if(i%2) blocks.push(<SGLink key={i} reference={items[i]} app={this} />);
			else blocks.push(<span key={i}>{items[i]}</span>);
		}
		return blocks;
	}
	
	checkFloater()
	{
		if(this.state.selected_tag===null) return false;
		var container = document.getElementById("text");
		if(container===null) return false;
		var h = container.querySelectorAll(".tag_desc_highlighted");
		if(h.length<1)
		{
			if(document.getElementById("floater")===null) return false;
			document.getElementById("floater").style.display = "none";
			return false;
		}
		var element = h[0];
		
		var blueBarisVisible = this.checkInView(container,element);
		var textNotVisible = !this.checkInView(container,element.nextSibling,true);
		
		if(document.getElementById("floater")===undefined) return false;
		if(document.getElementById("floater")===null) return false;
		if(blueBarisVisible || textNotVisible || this.state.allCollapsed)
		{
			document.getElementById("floater").style.display = "none";
		}
		else
		{
			document.getElementById("floater").style.display = "block";
		}
	}
	
	clearCommentary()
	{
		this.setState({ 
		    commentaryMode: false,
		    selected_verse_id: null,
		    commentarySource: null,
		    commentary_verse_id: null,
		    commentaryID: null,
		    searchMode: false,
		    comSearchMode: false,
		    commentary_verse_range: []
		},this.clearTag.bind(this));
	}
	
  showcaseTag(tagName)
  {
		if(this.state.selected_tag !== null && (tagName===null || tagName===undefined)) tagName = this.state.selected_tag;

  		if(tagName===null || tagName===undefined) tagName = "Structures";
	  	var tagData = this.getTagData(tagName);
	  	if(tagData===undefined) return false;
	  	
	  	var newVerseId = this.state.active_verse_id;
	  	if(tagData.verses[0]!==undefined) 	newVerseId = tagData.verses[0];
	  	
	    this.setState({ 
			active_verse_id: 		newVerseId,
			selected_tag: 		null,
			infoOpen: 		false,
			tagMode: 		true,
    		searchMode: false,
    		comSearchMode: false,
    		preSearchMode: false,
    		previewed_tag: null,
    		showcase_tag: tagName,
    		selected_tag_block_index: null,
			highlighted_verse_range: [],
			highlighted_tagged_verse_range: 		[],
			highlighted_tagged_parent_verse_range: tagData.verses
		},function(){
			//this.scrollText(true,"tag");
			
		});
  }
	
	
  setRecentTag(tagName)
  {
  	//add to root
  	if(globalData["tags"]["parentTagIndex"]["root"].indexOf("Recently Viewed Tags")<0)
  	globalData["tags"]["parentTagIndex"]["root"].unshift("Recently Viewed Tags");
  	
  	//creat new tag
  	if(globalData["tags"]["parentTagIndex"]["Recently Viewed Tags"]===undefined)
  	globalData["tags"]["parentTagIndex"]["Recently Viewed Tags"] = [];
  	
  	//add tag as child
  	if(globalData["tags"]["parentTagIndex"]["Recently Viewed Tags"].indexOf(tagName)<0)
  	globalData["tags"]["parentTagIndex"]["Recently Viewed Tags"].push(tagName);
  	
  }
	
  setActiveTag(tagName)
  {
  		if(tagName===null) return false;
	  	var tagData = this.getTagData(tagName);
	  	if(tagData===undefined) return false;
	  	if(tagData.verses===undefined) return false;
	  	
	  	if(tagName===this.state.selected_tag) return this.clearTag();
	  	
	  this.floater = {};
	  
	  this.setRecentTag(tagName);
	  	
	  	var newVerseId = this.state.active_verse_id;
	  	if(tagData.verses.indexOf(newVerseId)<0 && (this.selected_verse_id===null || this.selected_verse_id===undefined)) newVerseId = Math.min.apply(null, tagData.verses);


		    
		this.setState({ 
			
			active_verse_id: 		newVerseId,
			selected_tag: 		tagName,
			infoOpen: 		false,
			allCollapsed: 		false,
			tagMode: 		false,
    		showcase_tag: null,
    		previewed_tag: null,
    		searchMode: false,
    		comSearchMode: false,
    		preSearchMode: false,
    		selected_tag_block_index: null,
			highlighted_verse_range: 		tagData.verses,
			highlighted_tagged_verse_range: 		[],
			chiasm_letter: 		null
		},function(){
			this.scrollText(true,"tag");
			
		});
  }
  
  
  
  
  clearTag()
  {
  		
	  if(this.state.selected_tag===null && this.state.tagMode===false &&  this.state.searchMode===false &&  this.state.preSearchMode===false) return false;
	  this.floater = {};
		this.setState({ 
			selected_tag: 		null,
			infoOpen: 		false,
			tagMode: 		false,
    		searchMode: false,
    		preSearchMode: false,
    		comSearchMode: false,
			showcase_tag: 		null,
    		previewed_tag: null,
			highlighted_verse_range: 		[],
			commentary_verse_range: [],
			highlighted_tagged_verse_range: 		[],
			highlighted_tagged_parent_verse_range: []
		},function(){
			this.setActiveVerse(this.state.active_verse_id,undefined,undefined,true,"tag");
    
		});
  }
  clearTagIndex()
  {
		this.setState({ 
			selected_tag_block_index: 		null
		});
  	
  }
  setActiveStructure(shortcode)
  {
	this.setState({ 
		structure: shortcode,
		highlighted_section_index: 		this.getSectionIndex(this.state.active_verse_id,shortcode)
		},
		function(){
		this.saveSettings();
		this.setActiveVerse(this.state.active_verse_id,shortcode)
		}
	);
	
  }
  setActiveOutline(shortcode)
  {
	this.setState({ 
		outline: shortcode,
		highlighted_heading_index: 		this.getHeadingIndex(this.state.active_verse_id,shortcode)
		},
		function(){
			this.saveSettings();
			this.setActiveVerse(this.state.active_verse_id,undefined,shortcode);
			this.scrollOutline(null,"versebox");
		}
	);
  }
  

  
  setActiveVersion(shortcode)
  {
  	if(typeof globalData['text'][shortcode] === "undefined")
  	{
  		//set state to loading....
		this.loadVersion(shortcode);
  		
  	}else
  	{
		this.setState({ version: shortcode },
		
		function(){
		this.saveSettings();
		this.setActiveVerse(this.state.active_verse_id,undefined,undefined,undefined,"newversion");
		this.spotDone();
		});
		

  	}
  }
  
  getSectionVerses(verse_id,structure)
  {
  	var Verses = [];
  	var VerseArray = globalData["structures"][structure][this.getSectionIndex(verse_id,structure)].verses;
  	Verses = VerseArray[0];
  	if(VerseArray.length===2) Verses = Verses.concat(VerseArray[1]);
  	return  Verses.map(Number);
  }
  
  getSectionIndex(verse_id,structure)
  {
  	if(verse_id===undefined) return -1;
  	var r = globalData['structureIndex'][verse_id.toString()][structure];
  	if(r===undefined) return -1;
  	return r;
  }

  getHeadingIndex(verse_id,outline)
  {
  	if(verse_id===undefined) return -1;
  	var r = globalData['outlineIndex'][verse_id.toString()][outline];
  	if(r===undefined) return -1;
  	return r;
  }
  
  getHighlightedVerseRange(verse_id,outline,source)
  {
  	if(verse_id===undefined) return [];
  	if(this.state.selected_tag!==null) return this.state.highlighted_verse_range;
  	if(this.state.searchMode && source!=="closeSearch") return this.state.highlighted_verse_range;
  	
  	if(globalData['outlineIndex'][verse_id.toString()]===undefined) { debugger; return []; }
  	
  	
  	return globalData['outlines'][outline][globalData['outlineIndex'][verse_id.toString()][outline]].verses[0].map(Number);
  }
  getHighlightedVerseSectionRange(verse_id,structure)
  {
  	if(verse_id===undefined) return [];
  	var item =  globalData['structures'][structure][globalData['structureIndex'][verse_id.toString()][structure]];
	var output = item.verses[0].map(Number);
	if(item.verses.length>1)
	{	
		output = output.concat(item.verses[1].map(Number));
	}
  	return output;
  }
  
  getStructureTitle(structure)
  {
  	return  globalData["meta"]["structure"][structure].title
  }
  
  getSectionTitle(verse_id,structure)
  {
  	return  globalData["structures"][structure][this.getSectionIndex(verse_id,structure)].title
  }
  
  getheadingTitle(verse_id,outline)
  {
  	return globalData["outlines"][outline][this.getHeadingIndex(verse_id,outline)].title
  }
  
  getVerseTags(verse_id)
  {
  	if(this.lastVerseId===verse_id) return this.lastTags;
  	var output =  globalData["tags"]["verseTagIndex"][verse_id.toString()];
  	this.lastTags = output;
  	this.lastVerseId = verse_id;
  	return this.lastTags;
  }
  getTagData(tagName)
  {
  	var g =  globalData["tags"]["tagIndex"][tagName];
  	if(g===undefined) return {
            "parents": [],
            "description": "All Tags",
            "details": "",
            "type": "",
            "slug": "alltags",
            "verses": globalData["tags"]["superRefs"]["Structures"]
            
        };
  	if(g.verses===undefined) g.verses = globalData["tags"]["superRefs"][tagName];
  	if(g.verses===undefined)
  	{
  		
  		g.verses = [];
  		var children = globalData["tags"]["tagChildren"][tagName];
  		var keys = Object.keys(children);
  		for(var i in keys)
  		{
  			var childTag = children[keys[i]];
  			var childObj = globalData["tags"]["tagIndex"][childTag];
  			g.verses = g.verses.concat(childObj.verses);
  		}
  	}
  	
  	return g;
  	
  	
  	//Add Parents, etc
  }
  
  shuffle (arr){
    let newArr = arr.slice();
    for (var i = newArr.length - 1; i > 0; i--) {
        var rand = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[rand]]=[newArr[rand], newArr[i]];
    }
    return newArr;
}

	getReference(verses)
	{
		var min = Math.min.apply(null, verses);
		var max = Math.max.apply(null, verses);
		
		var ref = globalData['index'][min].string;
		
		//var last_verse = 0;
		//for(var i in verses)
		//{
			//figure our complex
		//}
		
		ref = ref + "–" + globalData['index'][max].verse;
		return ref;
	}
	
   loadCommentaryID()
  {
  	if(globalData.commentary.comIndex[this.state.active_verse_id]===undefined) return this.state.commentaryID;

  	var id = null;
  	if(globalData.commentary.comIndex[this.state.active_verse_id][this.state.commentarySource]===undefined)
  	{
  		var sources = Object.keys(globalData.commentary.comIndex[this.state.active_verse_id]);
  		id = globalData.commentary.comIndex[this.state.active_verse_id][sources[0]][0];
  	}
  	if(id===null) id = globalData.commentary.comIndex[this.state.active_verse_id][this.state.commentarySource][0];
  	return id

  }
  
}

export default App;


export class SGLink extends Component {
	
	render()
	{
		if(this.props.reference===undefined) return null;
		var link = this.props.reference.replace(/\s+/g,".").toLowerCase();
		return (<a className="ref" onClick={this.props.app.sgshow.bind(this)} href={"http://scripture.guide/"+link}>{this.props.reference}</a>);
	}
}
