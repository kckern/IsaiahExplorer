import React, { Component } from "react";
import { globalData } from "../globals.js";
import close from '../img/interface/close.png';
import Parser from 'html-react-parser';
import { SGLink } from '../App.js';

export class Commentary extends Component {
		

  render() {
  	
  	if(this.props.app.state.commentaryMode===false) 
  	    return (  
  	    <div>
  	    	<div className="heading_subtitle commentary">Commentary<img src={close} alt="close" onClick={this.props.app.clearCommentary.bind(this.props.app)} /></div>
        	<div id="commentary_text"></div>
        </div>)
  
  	    return (
        <div>
	        <div className="heading_subtitle commentary">Commentary<img src={close} alt="close"  onClick={this.props.app.clearCommentary.bind(this.props.app)} /></div>
	        <div id="commentary_text">
	          <CommentaryTabs app={this.props.app} />
	          <CommentaryContent app={this.props.app} />
	        </div>
        </div> );
  
  }
  
}


class CommentaryTabs extends Component {
		
  handleClick(shortcode)
  {
  	var list = globalData.commentary.comIndex[this.props.app.state.commentary_verse_id][shortcode];
  	var id = list[list.length-1];
  	this.props.app.setState({commentarySource:shortcode,commentaryID:id})	
  }
  
  
 mapOrder (array, order, key) {
  array.sort( function (a, b) {
    var A = a[key], B = b[key];
    
    if (order.indexOf(A)===-1 && order.indexOf(B) >=0 )  return 1;
    if (order.indexOf(A) > order.indexOf(B))  return 1;
    return -1;
  });
  return array;
};

 ksort(obj){
  var keys = Object.keys(obj).sort()
    , sortedObj = {};

  for(var i in keys) {
    sortedObj[keys[i]] = obj[keys[i]];
  }

  return sortedObj;
}

	componentDidUpdate()
	{
		this.props.app.saveSettings()
	}

  render() {

  	var comSources = Object.values(globalData.commentary.comSources);

	comSources = this.mapOrder(comSources, this.props.app.state.commentary_order, 'shortcode');

  	var available ={};
  	
  	//order from local storage?
  	var tabs = comSources.map((source,key)=>{
  		if(globalData.commentary.comIndex[this.props.app.state.commentary_verse_id]===undefined) return null;
		if(globalData.commentary.comIndex[this.props.app.state.commentary_verse_id][source.shortcode]===undefined) return null;
		available[source.year+source.shortcode]=source;
		var classes = [];
		if(source.shortcode===this.props.app.state.commentarySource) classes.push("selected");
  		return <span className={classes.join(" ")} key={key} ref={source.shortcode} onClick={()=>this.handleClick(source.shortcode)}>{source.label}</span>;
  	});
  
  	available = Object.values(this.ksort(available)).reverse();
  	return (<div className="src_tabs"><MoreTab app={this.props.app} sources={available}/>{tabs}</div>)
  }
  
}


class MoreTab extends Component {
	
	state = {open:false}

	selectOption(e)
	{
				
		var shortcode = e.target.options[e.target.selectedIndex].attributes.value.value;
	  	var id = globalData.commentary.comIndex[this.props.app.state.commentary_verse_id][shortcode][0]
		
		if(shortcode==="top") return false;
		var new_order = this.props.app.state.commentary_order.slice(0);
	    const index = new_order.indexOf(shortcode);
	    if (index !== -1) {  new_order.splice(index, 1); }
		new_order.unshift(shortcode);
		this.setState({open:false},this.props.app.setState({commentary_order:new_order,commentarySource:shortcode,commentaryID:id},this.props.app.saveSettings()));
	}

	render()
	{
		if(this.state.open)
		{
			
			return (
				<select  onChange={this.selectOption.bind(this)} >
					<option value="top">⋯</option>
					{ this.props.sources.map((source,key)=>{return <option key={key} value={source.shortcode} > ⤷ [{source.year}] {source.name}</option> } ) }
				</select>
				)
		}
		
		return <span className='more' onMouseEnter={()=>this.setState({open:true})}>⋯</span>;
	}
}

class CommentaryContent extends Component {
		
  state= {loaded:null}
  
  render() {
  	
  	var id = this.props.app.state.commentaryID; //loadCommentaryID();
  	var item = globalData.commentary.comData[id];

  	if(item===undefined || item===null) return <CommentaryContentLoading app={this.props.app} container={this} item={item} />
  	return <CommentaryContentLoaded app={this.props.app}  container={this} item={item}/>

  }
}


class CommentaryContentLoaded extends Component {


	componentWillMount()
	{
		this.postAction();
	}
	
	componentWillUpdate(nextProps)
	{
		if(this.props.item.id===nextProps.item.id) return false;
		this.postAction();
	}


	  postAction()
	  {
	  	if(this.props.item===undefined) return this.props.container.setState({loaded:false});
		this.props.container.setState({loaded:true},this.setCommentaryRange.bind(this));
	  	this.preloadNext();
	  }
	  
	  setCommentaryRange()
	  {
	  	var item = this.props.item;
	  	var range = [];
	  	for(var i = item.verse_id; i<item.verse_id+item.verse_count; i++ ) range.push(i);
	  	this.props.app.setState({commentary_verse_range:range});
	  	
	  }
	  
	  preloadNext()
	  {
	  	
	  		//Pre Load Next
	  		var item = this.props.item;

			
			var thisid = item.id;
			var list = Object.keys(globalData.commentary.idIndex);
			var index = list.indexOf(thisid);
			var new_id = list[index+1];
			
			if(list.indexOf(new_id)===-1) return false;
			if(globalData.commentary.comData[new_id]!==undefined) return false;
			globalData.commentary.comData[new_id] = null;
			
			var src = globalData.commentary.idIndex[new_id].source;
			
			var jsoner = function(response){ 
				  if (response.ok) {
				    return response.json();
				  } else {
				    debugger;
				    return null
				  }
			};
			var setter = function(data){
		      	globalData.commentary.comData[data.id] = data;
			};
			
		  	fetch(this.props.app.state.rootURL+"./com/"+src+"."+new_id+".json")
		  	.then(jsoner)
		  	.then(setter)
		  	.then(this.props.app.setUrl.bind(this.props.app));
	  }
	  
	  
		move(val)
		{
			var thisid = this.props.app.state.commentaryID;
			var list = Object.keys(globalData.commentary.idIndex).map(Number);
			var index = list.indexOf(thisid);
			var new_id = list[index+val];
			if(list.indexOf(new_id)===-1) new_id = list[0];
			if(globalData.commentary.comData[new_id]===null) return false;
			
			var item = globalData.commentary.idIndex[new_id];
		  	var range = [];
		  	for(var i = item.verse_id; i<item.verse_id+item.verse_count; i++ ) range.push(i);
		  	if(range.length===0) range = this.props.app.state.commentary_verse_range;
			var comData = globalData.commentary.comData[new_id];
			this.props.app.setState({
				commentaryID:new_id,
				selected_verse_id: null,
				commentary_verse_range:range,
				commentarySource:item.source,
				commentary_verse_id:item.verse_ids[0]
			},this.props.container.setState.bind(this.props.container,{loaded:comData!==undefined}))
		}
		
	  render() {
  	
	  	var item = globalData.commentary.comData[this.props.app.state.commentaryID];
	  	var title = null;
	  	if(item.title.length>0) title = <div className="title">{item.title}</div>;
	  	var range = []; 	for(var i = item.verse_id; i<item.verse_id+item.verse_count; i++ ) range.push(i);
	  	
	  	if(item===undefined) return null;
	  	if(item.html===undefined) return null;
	  	
	  	return (
	  		<div>
		  		 <h3>
			  		 <div className="prev" id="com_prev" onClick={this.move.bind(this,-1)}>⇦</div>
			  		 <div className="next" id="com_next" onClick={this.move.bind(this,1)}>⇨</div>
			  		 <CommentaryTagLink reference={"Isaiah "+item.reference} verses={range} app={this.props.app}/>
		  		 </h3>
		  		 <img alt="source"  className="ver" src={require("../img/commentaries/"+item.source+".jpg")} />
		          {title}
			      {Parser(item.html,{
					    replace: function(domNode) {
					    	if(domNode===undefined) return domNode;
					        if (domNode.name && domNode.name === 'a') {
					        
					        	if(domNode.children[0]===undefined) return null;
					        	if(domNode.attribs.class==="ref") return <SGLink reference={domNode.children[0].data} app={this.props.app}/>;
					        
					        	if(domNode.attribs.class==="isa")
					        	{
						        	var range = [];
						        	if(domNode.attribs.verses!==undefined)
						        	{
						        		var obj = JSON.parse(atob(domNode.attribs.verses));
						        		range = this.props.app.verseDatatoArray(obj);
						        	}
					        		return <CommentaryTagLink reference={domNode.children[0].data} verses={range} app={this.props.app}/>;
					        	}
					        }
					    }.bind(this)
					})}
	        </div>
	          )
  	}
  
}
	
	
class CommentaryTagLink extends Component {

	previewVerses()
	{
		this.props.app.setState({highlighted_tagged_verse_range:this.props.verses});
	}
	
	clearVerses()
	{
		this.props.app.setState({highlighted_tagged_verse_range:[]});
	}
	
	lookupVerses()
	{
		if(this.props.verses.length===0)  return false;
		
		if(this.props.verses.length===1) //or consecutive?
		{
			this.props.app.setState({
				searchMode:false,
				selected_tag:null,
				selected_verse_id:null,
				highlighted_tagged_verse_range:[],
				comSearchMode:false},
				this.props.app.setActiveVerse.bind(this.props.app,this.props.verses[0],undefined,undefined,undefined,"versebox"));
		}
		else
		{
			
		this.props.app.setState({
			searchMode:true,
			selected_tag:null,
			selected_verse_id:null,
			searchQuery:null,
			comSearchMode:true,
			highlighted_tagged_verse_range:[],
			highlighted_verse_range:this.props.verses},
			this.props.app.setActiveVerse.bind(this.props.app,this.props.verses[0],undefined,undefined,undefined,"versebox"));
		}
		
	}
	
	render()
	{
		return (<span className="isa"
		onMouseEnter={this.previewVerses.bind(this)} 
		onMouseLeave={this.clearVerses.bind(this)} 
		onClick={this.lookupVerses.bind(this)} 
		>{this.props.reference}</span>);
	}

}
	
class CommentaryContentLoading extends Component {
	
	
	loadContent()
	{
			var comid = this.props.app.state.commentaryID;
			if(comid===null) comid = this.props.app.loadCommentaryID();
			if(this.props.item!==undefined) return false;
			if(globalData.commentary.comData[comid]!==undefined) return false;
			globalData.commentary.comData[comid] = null;
			
			var jsoner = function(response){ 
				
				  if (response.ok) {
				    return response.json();
				  } else {
				    debugger;
				    return null
				  }
				
			};
			var setter = function(data){
		      	globalData.commentary.comData[data.id] = data;
		      	this.props.container.setState({loaded:true},this.props.app.setState.bind(this.props.app,{commentaryID:data.id}));
				
		      	
			}.bind(this);
			if(globalData.commentary.idIndex[comid]===undefined) return false;
			var src = globalData.commentary.idIndex[comid].source;
		  	fetch(this.props.app.state.rootURL+"./com/"+src+"."+comid+".json")
		  	.then(jsoner)
		  	.then(setter)
		  	.then(this.props.app.setUrl.bind(this.props.app));
		  	
		  	
			
	}
	
	componentDidMount()
	{
		this.loadContent.apply(this)
		this.props.app.setState({commentary_verse_range:[]},this.loadContent.bind(this))
		
	}
	componentDidUpdate(nextProps)
	{
		if(this.props.app.state.commentaryID===nextProps.app.state.commentaryID) return false;
		this.props.app.setState({commentary_verse_range:[]},this.loadContent.bind(this))
	}
	
	 render() {
	 	
	 	
  	return (
  		<div>
  		 <h3>Loading...</h3>
          <div className="title"><img alt="source"  className="loading" src={require("../img/interface/book.gif")} /></div>
          </div>
          )
  }
	
	
}