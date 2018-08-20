import React, { Component } from "react";
import { globalData } from "../globals.js";
import { VerseBox } from "./VerseBox.js";
import loading_img from '../img/interface/loadingwave.gif';

export default class SectionColumn extends Component {
	
	
  constructor(props) {
    super(props);
    this.state = { metaOpen: false, fullsize: false  };
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
	}, 150);
	
 }
 
 
  render() {
		    if(this.props.app.state.ready===false)
		    {
		    	var classes = ["loading"];
		    	if(this.state.fullsize===true) classes.push("fullsize");
		    	return(
			      <div className="col col2b">
			        <div className="heading">
			          <div className="heading_subtitle" id="outline_subtitle"> Section Passages</div>
			          <div className="heading_title">□{" "}<span id="outline_title">Outline Headings</span></div>
			        </div>
			        <div id="outline" className={classes.join(" ")}><img src={loading_img} alt="loading"/><br/>Loading Available Outlines...</div>
			      </div>
			    )
		    }
		    
  	var toggler = this.toggleDrawer.bind(this);
  	
  	
  	
    return (
      <div className="col col2b">
        <div className="heading">
          <div className="heading_subtitle" id="outline_subtitle">
            Section Passages
          </div>
          <div className="heading_title"  onClick={this.props.app.cycleOutline.bind(this.props.app,1)}> 
            □ <span id="outline_title">
            <img alt="outline_logo" src={require('../img/versions/'+this.props.app.state.outline.toLowerCase()+'.jpg')}  onClick={toggler}  />
            {globalData["meta"]["outline"][this.props.app.state.outline].short_title}</span>
          </div>
        </div>
        <Outline app={this.props.app}   />
        <OutlineMeta app={this.props.app} open={this.state.metaOpen} toggle={toggler} />
      </div>
    );
  }
}

class Outline extends Component {
	
	
	isInSection(heading)
	{
		if(this.props.app.state.searchMode) return true;
		if(this.props.app.state.selected_tag!==null) return true;
	    var section_verses = this.props.app.state.highlighted_section_verses;
	    var heading_verses = heading.verses;
	    var isec = heading_verses.filter(function(n) { return section_verses.indexOf(n) !== -1; });
	    return isec.length > 0;
	}
	
	isInTagRange(heading)
	{
		if(this.props.app.state.searchMode) return true;
		if(this.props.app.state.selected_tag===null) return true;
	    var tagged_verses = this.props.app.state.highlighted_verse_range;
	    var heading_verses = heading.verses;
	    var isec = heading_verses.filter(function(n) { return tagged_verses.indexOf(n) !== -1; });
	    return isec.length > 0;
	}
	
	isInSearchRange(heading)
	{
		//if(this.props.app.state.commentaryAudioMode===true) return true;
		if(this.props.app.state.searchMode===false  && !this.props.app.state.comSearchMode) return true;
	    var tagged_verses = this.props.app.state.highlighted_verse_range;
	    var heading_verses = heading.verses;
	    var isec = heading_verses.filter(function(n) { return tagged_verses.indexOf(n) !== -1; });
	    return isec.length > 0;
	}
	
	
 componentDidUpdate() {
 	//Spread Out Outlines
 	this.props.app.spreadOutline();
    
	
 }
	
  render() {
  	
  	var outline = globalData["outlines"][this.props.app.state.outline];
  	var sections = globalData["structures"];
  	var section_index =  globalData["structureIndex"];
  	var headings = [];
  	var lastheading = null;
  	var lastunit = null;
  	for(var x in outline)
  	{
  		var heading = outline[x];
  		if(this.isInSection(heading) && this.isInTagRange(heading) && this.isInSearchRange(heading))
  		{
  			var section_i = parseInt(section_index[heading.verses[0]][this.props.app.state.structure],0);
  			var section = sections[this.props.app.state.structure][section_i];
  			if(section_i!==lastheading)
  			{
  			headings.push(<h4 key={"h"+x}>{section.description}</h4>);
  			lastunit = null;
  			}
  			
  			if(section.verses.length>1)
  			{
  				for(var y in section.verses)
  				{
  					if(section.verses[y].indexOf(heading.verses[0]) >= 0  && y!==lastunit)
  					{
  						headings.push(<h5 key={"u"+x}>Unit {parseInt(y,0)+1}</h5>);
  						lastunit = y;
  					}
  				}
  				
  			}
  			
  			headings.push(<Heading
                  app={this.props.app}
                  heading={heading}
                  id={x}
                  key={x}
                />);
                
  			lastheading = section_i+0;
  		}
  	}
  	
  	if(headings.length===0)
  	{
  		
	  	for( x in outline)
	  	{
	  		 heading = outline[x];
	  			headings.push(<Heading
	                  app={this.props.app}
	                  heading={heading}
	                  id={x}
	                  key={x}
	                />);
	  	}
  	}
  	

    return (
      <div id="outline"   >
        <div className="overviewcontainer"> {headings} </div>
      </div>
    );
  }
}

class Heading extends Component {
  isActive() {
    //console.log(parseInt(this.props.app.state.highlighted_heading_index,0),this.props.id);
    return (
    //	this.props.heading.verses[0].indexOf(this.props.app.state.active_verse_id) >= 0
      parseInt(this.props.app.state.highlighted_heading_index,0) === parseInt(this.props.id,0)
    );
  }

  render() {

          const index = globalData["index"];
          var classes = ["heading_grid"]; 
          if (this.isActive()) classes.push("heading_grid_highlighted");
          
          var ref = this.props.app.getReference(this.props.heading.verses).replace(/^Isaiah /i,"");
          
          return (
            <div
              className={classes.join(" ")}
              onMouseEnter={() =>
                {
                	var dark_blue = this.props.app.state.highlighted_verse_range;
                	var whole_row = this.props.heading.verses;
                	
                	for(var i in whole_row)
                	{
                		if(dark_blue.indexOf(whole_row[i])>=0) return this.props.app.setActiveVerse(whole_row[i],undefined,undefined,undefined,"versebox");
                	}
                	return this.props.app.setActiveVerse(whole_row[0],undefined,undefined,undefined,"versebox");
	                
                }
              }
              onClick={() =>
                {
                	var whole_row = this.props.heading.verses;
                	this.props.app.clearTag();
                	this.props.app.setActiveVerse(whole_row[0],undefined,undefined,undefined,"versebox");
                }
              }
            >
            <span className="ref">{ref}</span>
              <h3>{this.props.heading.heading}</h3>
              <div className="verse_grid">
                {this.props.heading.verses.map((verse_id, verseKey) => {
                  var box_num = index[verse_id.toString()].verse;
                  var classes = ["versebox", "v_" + verse_id];
                  if (box_num === 1) {
                    box_num = index[verse_id.toString()].chapter;
                    classes.push("chapter");
                  }
                  return (
                    <VerseBox
                      app={this.props.app}
                      key={verseKey}
                      class={classes}
                      verse_id={verse_id}
                      title={index[verse_id.toString()].title}
                      box_num={box_num}
                    />
                  );
                })}
              </div>
            </div>
          );
  }
}




class OutlineMeta extends Component {
	
	render()
	{
		var classes = ["meta"];
		if(this.props.open) classes.push("visible"); 

		
	    var entries = this.props.app.state.top_outlines.slice(0); for(var i in globalData["meta"]["outline"]) if(entries.indexOf(i)<0) entries.push(i);
	    const options = entries.map(
	      (shortcode,optionKey ) => {
	      	return(<OutlineOption  app={this.props.app} option={globalData["meta"]["outline"][shortcode]} optionKey={optionKey} key={optionKey}  toggle={this.props.toggle} />)
	      }
	    );
		
		return(
			
			<div id="outline_meta" className={classes.join(" ")}>
				<h4>Available Outlines</h4>
				{options}
			</div>
		)
	}
	
}

class OutlineOption extends Component 
{
	render()
	{
		var classes = ["option"];
		if(this.props.optionKey===0) classes.push("first top"); 
		else if(this.props.optionKey<5) classes.push("top"); 
		else if(this.props.optionKey===5) classes.push("other firstother"); 
		else classes.push("other"); 
	
		
		    return ( <div className={classes.join(" ")} onClick={() => {
		        	this.props.toggle();
		        	this.props.app.setActiveOutline(this.props.option.shortcode)
		        		
		        	}}>
						<img alt="Option" src={require('../img/versions/'+this.props.option.shortcode.toLowerCase()+'.jpg')} />
					    <div className={"icon"}>{this.props.option.title}</div> 
					    <span>{this.props.option.description}</span> 
					</div> 
		    );
	}
	
	
}
