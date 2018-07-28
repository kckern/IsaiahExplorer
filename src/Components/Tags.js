import React, { Component } from "react";
import {globalData} from '../globals.js';
import { Passage } from "./Passage.js";  

import tag_png from '../img/interface/tag.png';


export class TagFloater extends Component {
	
 componentDidUpdate () {
	
	var fn = this.props.app.checkFloater.bind(this.props.app);
	fn();
 }
	render()
	{	
		var tag = this.props.app.state.selected_tag;
		if(tag===null) return null;
		var tagMeta = globalData['tags']['tagIndex'][tag];
		if(tagMeta.type==="chiasm" || tagMeta.type==="parallel") return null;
		var strc = globalData['tags']['tagStructure'][tag];
		var floaters = this.props.floater;
		var key = null;
		var index = this.props.app.state.selected_tag_block_index;
		var keys = Object.keys(floaters);
		
		
		if(keys.length===1) key = keys[0];
		if(key===null) key = tag+index;
		
		if(floaters[key]===undefined)
		{
			for(var i in strc)
			{
				var j = strc[i].verses.indexOf(this.props.app.state.active_verse_id);
				if(j===-1) continue;
				//if(visible)
				index = j;
			}
			key = keys[0];
		}
		
		
		
		var floater = floaters[key];
	
		 return (  <div id="floater" style={{display: 'block'}} >{floater}</div> );
	}
	
}


export class TaggedVerses extends Component {
	
	render()
	{
		var tagMeta = globalData['tags']['tagIndex'][this.props.app.state.selected_tag];
		
		if(tagMeta.type==="chiasm") return ( <TagChiasm app={this.props.app} /> )
		if(tagMeta.type==="parallel") return ( <TagParallel app={this.props.app} /> )
		return ( <TagBlocks app={this.props.app} /> )
		
		
	}
	
}

export class TaggedHeading extends Component {
	

	
	setTag(newTag)
	{
		var tagData = this.props.app.getTagData(newTag);
		if(typeof tagData !== "undefined")
		{
			this.props.app.setActiveTag(newTag);
		}
	}
	
	openTagMeta(e)
	{
		//debugger;
		if(this.props.app.state.tagMode===true) return false;
		if(e.target.parentElement.className==="leaf") return false;
		if(e.target.parentElement.className==="branch") return false;
		this.props.app.setState({infoOpen:true,commentaryMode:false},function(){ setTimeout(this.scrollTagTree.bind(this),1000)}.apply(this.props.app));
	}
	
	
	render()
	{
		var key_tag = this.props.app.state.selected_tag;
		if(this.props.app.state.showcase_tag!==null)  key_tag = this.props.app.state.showcase_tag;
		if(this.props.app.state.tagMode && key_tag===null) key_tag = this.props.app.state.previewed_tag;

		var tagMeta = globalData['tags']['tagIndex'][key_tag];
		if(tagMeta!==undefined) tagMeta["tagName"] = key_tag;
		

		var tagBox = null;
		if(key_tag===null){ tagBox = null; key_tag = "Tag Taxonomy";}
		else if(this.props.app.state.infoOpen!==true) tagBox = [<ParentLinks tagMeta={tagMeta} key={1}  app={this.props.app} />,<div className="taglink"  key={2}>{key_tag}</div>]
		else  tagBox = [<div className="tagTax" key={3}>Tag Taxonomy</div>,<TagTree tagMeta={tagMeta}  app={this.props.app} base="root"  key={4}/>,<div key={5} className="tagTaxFooter"></div>]

		var classes = ["tag_meta"];
		var hclasses = ["text_heading"];  
		
		var prevnext = [];
		if(tagMeta!==undefined){
		if(tagMeta.next!==undefined) prevnext.push(<div key={1} className="nexttag" id="tag_next" onClick={()=>this.setTag(tagMeta.next)}>»</div>);
		if(tagMeta.prev!==undefined) prevnext.push(<div key={2}  className="prevtag" id="tag_prev"  onClick={()=>this.setTag(tagMeta.prev)}>«</div>);}
		
		
		return (
			<div className={hclasses.join(" ")}>
				<div className={classes.join(" ")} onClick={(e)=>this.openTagMeta(e)}>
					{tagBox}
				</div>
				{prevnext}
				<div className="tagtitle">
					<img src={tag_png} alt="tag"/>
					<span>{key_tag}</span>
				</div>
			</div>
			)
	}
	
}

class ParentLinks extends Component {

	render()
	{
		if(this.props.tagMeta===undefined){
		return null;	
		} 
		return this.props.tagMeta.parents.slice(0).reverse().map((val,key)=>{
			
			if(val==="root") return null;
			return ([<div className="taglink"
			onMouseEnter={()=>this.props.app.setPreviewedTag(val,true,this.props.tagMeta.tagName)} 
			onMouseLeave={()=>this.props.app.setPreviewedTag(null)}
			key={key}>{val}</div>,<span key={key+2}>»</span>])
			
		})
	}

}


export class TagTree extends Component {

	state = {open:false}

	clickBranch(tag)
	{
		//toggle children
		this.setState({open:!this.state.open})
		//if children
		if(globalData['tags'].tagChildren[tag].indexOf(this.props.app.state.selected_tag)>=0)
		{
			this.props.app.showcaseTag(globalData['tags'].tagIndex[tag].parents[0]);
		}else
		{
			
			this.props.app.setState({showcase_tag:null});
		}
	}
	
	
	openTree()
	{
		if(this.state.open===true) return false;
		if(this.props.base==="Recently Viewed Tags" && this.props.app.state.tagMode)
		{
			this.setState({open:true});
			return true;
		}
		if(globalData['tags']['tagIndex'][this.props.app.state.selected_tag]!==undefined)
		{
			if(globalData['tags']['tagIndex'][this.props.app.state.selected_tag].parents.indexOf(this.props.base)>=0)
			{
				this.setState({open:true});
				return true;
			}
		}
		if(globalData['tags']['tagIndex'][this.props.app.state.showcase_tag]!==undefined)
		{
			if(globalData['tags']['tagIndex'][this.props.app.state.showcase_tag].parents.indexOf(this.props.base)>=0)
			{
				this.setState({open:true});
				return true;
			}
		}
		if(this.props.app.state.showcase_tag===this.props.base)
		{
			this.setState({open:true});
			return true;
		}
	}
	
	componentWillMount()
	{
		this.openTree();
	}
	
	
	componentWillUpdate()
	{
		this.openTree();
	}

	
	render()
	{
		var meta = globalData['tags']['tagIndex'][this.props.base];
		var desc = ""; if(meta!==undefined) desc = meta.description;
		var children = globalData['tags']['parentTagIndex'][this.props.base];
		if(children===undefined) return <TagTreeLeaf tag={this.props.base} app={this.props.app}  desc={desc} />
		var childrenComp =  children.map((val,key)=>{return <TagTree key={key} base={val} app={this.props.app} />});
		var classes = ["branch"];
		if(this.state.open) classes.push("open");
		if(this.state.open===false) childrenComp = null; 
		if(this.props.base===this.props.app.state.showcase_tag) classes.push("highlight");
		if(globalData['tags']['tagIndex'][this.props.app.state.showcase_tag]!==undefined)
		if(globalData['tags']['tagIndex'][this.props.app.state.showcase_tag].parents.indexOf(this.props.base)>=0) classes.push("highlight");
		return (
		<div className={"tagtree base_"+this.props.base.replace(/[^A-Z]/gi,"")}>
			<div 
				className={classes.join(" ")}
				onClick={()=>this.clickBranch(this.props.base)} 
				onMouseEnter={()=>this.props.app.setPreviewedTag(this.props.base,true)} 
				onMouseLeave={()=>this.props.app.setPreviewedTag(null)} >
				<div className="taglink parentTag" >{this.props.base}</div>
				<div className="tagDesc">{desc}</div>
			</div>
			{childrenComp}
		</div>);
		
	}

}


class TagTreeLeaf extends Component {
	
	handleClick(e)
	{
		if(this.props.tag===this.props.app.state.selected_tag) return false;
		var tag_verses = globalData['tags']['tagIndex'][this.props.tag].verses
		var verse = this.props.app.active_verse_id;
		if(tag_verses.indexOf(verse)===-1) verse = tag_verses[0];
		this.props.app.setState({active_verse_id:verse,selected_verse_id:null},function(tag){
			this.setActiveTag(tag);
		}.apply(this.props.app,[this.props.tag]));
	}
	
	render()
	{
		var classes = ["leaf"]
		if(this.props.tag===this.props.app.state.selected_tag) classes.push("highlight");
		if(this.props.tag===this.props.app.state.showcase_tag) classes.push("highlight");
		
		return(<div className={classes.join(" ")}>
				<div className="taglink"
				onMouseEnter={()=>this.props.app.setPreviewedTag(this.props.tag)}
				onMouseLeave={()=>this.props.app.setPreviewedTag(null)}
				onClick={this.handleClick.bind(this)}>{this.props.tag}</div>
				<div className="tagDesc">{this.props.desc}</div>
			</div>); 
	}
}

class TagBlocks extends Component {
	


	handleDescClick(verseId,classes,index)
	{
		if(classes.indexOf("active")<0)
		{
			//collapse
			this.props.app.setState({allCollapsed:false},this.props.app.setTagBlock(index,verseId));
		}
		else
		{
			
			this.props.app.setState({allCollapsed:true}, this.props.app.checkFloater.bind(this.props.app));
		}
	}
	
	componentDidUpdate()
	{
		
		var fn = this.props.app.checkFloater.bind(this.props.app);
		fn();
	}
	

	render()
	{
		var tagMeta = globalData['tags']['tagIndex'][this.props.app.state.selected_tag];
		var entries = []; for(var i in globalData['tags']['tagStructure'][this.props.app.state.selected_tag])  entries.push(globalData['tags']['tagStructure'][this.props.app.state.selected_tag][i]); 
		
		var count = entries.length;

		var details = null;
		var cite_str = null;
		if(typeof tagMeta.cite === "string" && tagMeta.cite !== "") cite_str = <div className='cite'>{tagMeta.cite}</div>;
		var details_str = null;
		if(typeof tagMeta.details === "string" && tagMeta.details !== "") details_str = <div>{this.props.app.addLinks(tagMeta.details)}</div>;
		var descr_str = null;
		if(typeof tagMeta.description === "string" && tagMeta.description !== "") descr_str = <h4>{this.props.app.addLinks(tagMeta.description)}</h4>;
		if(details_str!==null || descr_str!==null || cite_str!==null)
		details = (<div className="detail">{descr_str}{details_str}{cite_str}</div>);
 		const app = this.props.app;
		var blocks = entries.map((entry,key)=>{
			
			var classes=["verses"];
			var desc_classes=["desc"]; 
			var isFloater = false;
			
			var details = null;
			if(app.state.allCollapsed!==true){
				if(app.state.selected_tag_block_index===key || (
					entry.verses.indexOf(app.state.active_verse_id)>-1 && app.state.selected_tag_block_index===null
					)){
						classes.push("active"); 	desc_classes.push("tag_desc_highlighted"); isFloater=true;
						if(entry.details !== "" && entry.details !== 0)  details = (<div className="detail" >{app.addLinks(entry.details)}</div>)
				}	
			}
			
			var showdesc = entry.desc;
			var highlights = null;
			if(entry.highlight!==undefined) highlights = entry.highlight;
			var label = null;
			var match = /\s*\[(.*?)\]\s*(.*)/g.exec(entry.desc);
			if(match!==null && label===null)
			{
				label = (<span className="label">{match[1]}</span>);
				showdesc = match[2];
			}
			
			showdesc = this.props.app.addLinks(showdesc);
			
			
			
			var item = (
			        <div 
			        className={desc_classes.join(" ")} 
			        onMouseEnter={()=>this.props.app.highlightTaggedVerses(entry.verses.map(Number))}
			        onClick={()=>this.handleDescClick(entry.verses.map(Number)[0],classes,key) }
			        ><div className="tagref">{entry.ref}</div>{label}{showdesc}</div>
			   	);
			   	
			   if(count===1) { item = null; isFloater = false;}
			   if(isFloater) this.props.app.saveFloater(this.props.app.state.selected_tag+key,item);
			   
			   
			   	
			 return (
			    <div className="taggedblock" key={key} index={key}>
			        {item}{details}
			        <Passage app={this.props.app} verses={entry.verses} sub={entry.sub} highlights={highlights} wrapperId={null} wrapperClass={classes.join(" ")}/>
			    </div>
			   	);
		});
		
				
		var classes = ["blocks","tagged"];
		
    return (

      		<div id="text" className={classes.join(" ")} >
				{details}
				{blocks}
			</div>
		)
	}
	
}

class TagParallel extends Component {
	
		
	componentDidMount(){
		
		if(document.getElementById("text").querySelectorAll(".versebox_highlighted").length===0) return false;
    	document.getElementById("text").querySelectorAll(".versebox_highlighted")[0].parentNode.parentNode.parentNode.parentNode.previousSibling.previousSibling.scrollIntoView();

    	for(var i=1; i<=[document.getElementById("parTable").getAttribute('count')].map(Number)[0]; i++ )
    	{
    		var left 	=	document.getElementById(i+"content").querySelectorAll("td>div")[0].offsetHeight;
    		var right 	=	document.getElementById(i+"content").querySelectorAll("td>div")[1].offsetHeight;
    		if(left>144 || right>144)  document.getElementById(i+"content").className = "row parallel_mini";
    		else this.readMore(i)
    	}
	}
	
	//todo scroll to active verseid
	
	//highlight heading in blue
	
	//read more if hidden
 
 	readMore(i)
 	{
 		var element = document.getElementById(i+"readMore");
 		element.parentNode.removeChild(element);
 		document.getElementById(i+"content").className = "row";
 	}
 
	render()
	{
		var tagMeta = globalData['tags']['tagIndex'][this.props.app.state.selected_tag];
		var tagStructure = globalData['tags']['tagStructure'][this.props.app.state.selected_tag];
		var items = [];
		for(var i = 1; i<=Object.keys(tagStructure).length/2; i++ )
		{

			var left_label = null;
			if(typeof tagStructure[i+"A"]==="undefined") debugger;
			var l_desc = tagStructure[i+"A"].desc;
			var match = /\s*\[(.*?)\]\s*(.*)/g.exec(l_desc);
			if(match!==null)
			{
				left_label = (<div className="meta">{match[1]}</div>);
				l_desc = match[2];
			}
	
			var right_label = null;
			if(typeof tagStructure[i+"B"]==="undefined") debugger;
			var r_desc = tagStructure[i+"B"].desc;
			match = /\s*\[(.*?)\]\s*(.*)/g.exec(r_desc);  
			if(match!==null)
			{
				right_label = (<div className="meta">{match[1]}</div>);
				r_desc = match[2];
			}
			const verses = tagStructure[i+"A"].verses.concat(tagStructure[i+"B"].verses).map(Number);
			var classes = ["meta"];
			
			if(verses.indexOf(parseInt(this.props.app.state.active_verse_id,0))>=0) classes.push("parameta_highlighted");
			const index = i;
			
			
			var l_highlights = null;
			var r_highlights = null;
			if(tagStructure[i+"A"].highlight!==undefined) l_highlights = tagStructure[i+"A"].highlight;
			if(tagStructure[i+"B"].highlight!==undefined) r_highlights = tagStructure[i+"B"].highlight;
			
			
			items.push([
		            <tr className="metaref" key={i+"i"} onMouseEnter={()=>{this.props.app.highlightTaggedVerses(verses);this.props.app.setActiveVerse(verses[0]);}}>
		              <td>
		              	{left_label}
		                <div className="ref">{tagStructure[i+"A"].ref}</div>
		              </td>
		              <td>
		              	{right_label}
		                <div className="ref">{tagStructure[i+"B"].ref}</div>
		              </td>
		            </tr>,
		            <tr className={classes.join(" ")} key={i+"ii"}  onMouseEnter={()=>{this.props.app.highlightTaggedVerses(verses);this.props.app.setActiveVerse(verses[0]);}}>
		              <td>{l_desc}</td>
		              <td>{r_desc}</td>
		            </tr>
		            ,
		            <tr id={i+"content"} className="row" key={i+"iii"} onMouseEnter={()=>this.props.app.highlightTaggedVerses(verses)}>
		              <td>
						<Passage plain={1} app={this.props.app} verses={tagStructure[i+"A"].verses} sub={tagStructure[i+"A"].sub} highlights={l_highlights} />
					  </td>
		              <td>
						<Passage plain={1} app={this.props.app} verses={tagStructure[i+"B"].verses} sub={tagStructure[i+"B"].sub} highlights={r_highlights} />
					  </td>
		            </tr>,
		            <tr key={i+"iv"} id={i+"readMore"} className="readmore" onClick={()=>this.readMore(index)}><td colSpan={2}>Read More...</td></tr>
				]);
		}

		var details = null;
		var cite_str = null;
		if(typeof tagMeta.cite === "string" && tagMeta.cite !== "") cite_str = <div className='cite'>{tagMeta.cite}</div>;
		var details_str = null;
		if(typeof tagMeta.details === "string" && tagMeta.details !== "") details_str = <div>{this.props.app.addLinks(tagMeta.details)}</div>;
		var descr_str = null;
		if(typeof tagMeta.description === "string" && tagMeta.description !== "") descr_str = <h4>{this.props.app.addLinks(tagMeta.description)}</h4>;
		
		if(details_str!==null || descr_str!==null || cite_str!==null)
		details = (<div className="detail">{descr_str}{details_str}{cite_str}</div>);

		
		classes = ["no_top_padding","tagged"];
		
		return (

		      <div id="text" className={classes.join(" ")} style={{overflowY: 'scroll'}}>
		        {details}
		        <table className="parallel" id="parTable" count={items.length}>
		          <tbody>
		            {items}
		          </tbody>
		        </table>
		      </div>
		    );
	}
	
}

class ChiasticBlock extends Component {
	
			
	componentDidMount(){
    	
    	var allreads = document.getElementById("text").querySelectorAll(".readmore");
    	for(var i in allreads) if(/active/.exec(allreads[i].className)) allreads[i].className = "readmore";
    	
    	var id = this.props.side+""+this.props.index+"content";
    	var container = document.getElementById(id);
    	var h = container.offsetHeight;
    	if(h>203)  container.className = "verses chiastic_mini";
    	else this.readMore(this.props.side+""+this.props.index)
    	if(this.props.content.verses.map(Number).indexOf(this.props.app.state.active_verse_id)===-1) return false;
    	var element = container.querySelectorAll(".versebox_highlighted")[0];
    	
    	if(!this.props.app.checkInView(container,element))
    	{
    		var readmore = document.getElementById(this.props.side+""+this.props.index+"readMore");
    		if(readmore!==null) readmore.className = "readmore active";
    	}
	}
	
	
 	readMore(i)
 	{
 		var element = document.getElementById(i+"readMore");
 		element.parentNode.removeChild(element);
 		document.getElementById(i+"content").className = "verses";
 	}
 	

 
 
	
	render()
	{
		var label = null;
		var desc = this.props.content.desc;
		var highlights = null;
		if(this.props.content.highlight!==undefined) highlights = this.props.content.highlight;
			
		var myRegexp = /\s*\[(.*?)\]\s*(.*)/g;
		var match = myRegexp.exec(desc);
		if(match!==null)
		{
			label = (<div className="label">{match[1]}</div>);
			desc = match[2];
		}
		
		var letter = this.props.index.replace(/\d+/,"");
		var letter_verses = this.props.letter_verses;
		var classes = ["meta","c_"+this.props.index];
		if(this.props.app.state.chiasm_letter===letter) classes.push("activeChiasm")
			
		return( <div  id={this.props.side+""+this.props.index} 
				onMouseEnter={()=>{this.props.app.highlightTaggedVerses(letter_verses);this.props.app.setActiveVerse(this.props.content.verses[0]);}}
				onClick={()=>this.props.app.setActiveChiasm(letter,letter_verses)}>
				<div className="chimeta">
	              <div className="seqcircle">{this.props.index}</div>
	              {label}
	              <div className="tagref">{this.props.content.ref}</div>
	            </div>
	            <div className={classes.join(" ")} >{desc}</div>
	            <div id={this.props.side+this.props.index+"content"} className="verses"><Passage highlights={highlights} plain={1} app={this.props.app} verses={this.props.content.verses}  sub={this.props.content.sub} /></div>
	            <div id={this.props.side+this.props.index+"readMore"}  className="readmore"  onClick={()=>this.readMore(this.props.side+this.props.index)} >Read More...</div>
            </div>
		);
	}
	
}

class TagChiasm extends Component {
	
	
	componentDidMount(){
		
    	
	}

	componentWillMount(){
		var letter = this.getActiveLetter();
		var verses = this.getLetterVerses(letter,globalData['tags']['tagStructure'][this.props.app.state.selected_tag])
		this.props.app.setActiveChiasm(letter,verses);
	}
	
	componentWillReceiveProps(){
		
		if(this.props.app.state.chiasm_letter!==null) return false;
		var letter = this.getActiveLetter();
		var verses = this.getLetterVerses(letter,globalData['tags']['tagStructure'][this.props.app.state.selected_tag])
		this.props.app.setActiveChiasm(letter,verses);
		
	}
	
	
	getActiveLetter()
	{
		var tagStructure = globalData['tags']['tagStructure'][this.props.app.state.selected_tag];
		
 		for(var x in tagStructure)
 		{
 			if(tagStructure[x].verses.map(Number).indexOf(this.props.app.state.active_verse_id)>=0)
 			{
 				x = x.replace(/[0-9]+/,"");
 				return x;
 			}
 		}
 		return null;
		
	}

 	getLetterVerses(letter,tagStructure)
 	{
 		var verses = [];
 		for(var x in tagStructure)
 		{
 			if(x.indexOf(letter)>=0) verses = verses.concat(tagStructure[x].verses);
 		}
 		return verses.map(Number);
 	}
	
	render()
	{
		
		var tagMeta = globalData['tags']['tagIndex'][this.props.app.state.selected_tag];
		var tagStructure = globalData['tags']['tagStructure'][this.props.app.state.selected_tag];

		var chiastic_labels = [[],[]];
		var keys = Object.keys(tagStructure);
		var width = 100/keys.length;
		var left_items = [];
		var right_items = [];
		
		for(var i in keys)
		{
			i = keys[i];
			const letter = i.replace(/\d+/,"");
			const number = /2/.test(i) ? 1 : 0;
			const letter_verses = this.getLetterVerses(letter,tagStructure);
			if(!i.match(/1$/)) right_items.push((<ChiasticBlock app={this.props.app} content={tagStructure[i]} letter_verses={letter_verses} key={i} side="right" index={i}/>));
			if(!i.match(/2$/))  left_items.push((<ChiasticBlock app={this.props.app} content={tagStructure[i]} letter_verses={letter_verses} key={i} side="left" index={i}/>));
            
            var classes = ["chiastic_block","c_"+i];
			if(letter===this.props.app.state.chiasm_letter) classes.push("chiastic_block_hover");
			chiastic_labels[number].push((<div 
			onMouseEnter={()=>this.props.app.setActiveChiasm(letter,letter_verses)} 
			onClick={()=>{this.props.app.setActiveChiasm(letter,letter_verses); this.props.app.setActiveVerse(letter_verses[0]);}} 
			className={classes.join(" ")} key={i} style={{width: width+'%'}}>{i}</div>));
		}
		right_items.reverse();
		if(/A/.test(chiastic_labels[1][0].key)) chiastic_labels[1].reverse();
		
		
		var head = null;
		var cite_str = null;
		if(typeof tagMeta.cite === "string" && tagMeta.cite !== "") cite_str = <div className='cite'>{tagMeta.cite}</div>;
		var details_str = null;
		if(typeof tagMeta.details === "string" && tagMeta.details !== "") details_str = <div>{this.props.app.addLinks(tagMeta.details)}</div>;
		var descr_str = null;
		if(typeof tagMeta.description === "string" && tagMeta.description !== "") descr_str = <h4>{this.props.app.addLinks(tagMeta.description)}</h4>;
		
		if(details_str!==null || descr_str!==null || cite_str!==null)
		{
			head = (<div className="head"><div className="detail">{descr_str}{details_str}{cite_str}</div></div>);
		}
		
		classes = ["chiasm","tagged"];
		
    return (

      <div id="text" className={classes.join(" ")} >
		<div className="box">
		{head}
			<div className="growing-area">
		        <div id="chiastic_blocks">
		          {chiastic_labels}
		        </div>
		        <div>
		          <div className="chiastic_column left" >
		            <div className="buffer" />
		            <div className="buffer" />
		            <div className="buffer" />
		            {left_items}
		            <div className="buffer" />
		            <div className="buffer" />
		            <div className="buffer" />
		          </div>
		          <div className="chiastic_column right" >
		            <div className="buffer" />
		            <div className="buffer" />
		            <div className="buffer" />
		            {right_items}
		            <div className="buffer" />
		            <div className="buffer" />
		            <div className="buffer" />
		          </div>
		        </div>
	        </div>
        </div>
      </div>
    );
		
	}
	
}


