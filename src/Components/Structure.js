import React, { Component } from "react";

import { globalData } from "../globals.js";
import { VerseBox } from "./VerseBox.js";
import loading_img from '../img/interface/loadingdna.gif';
import tag_png from '../img/interface/tag.png';

export default class StructureColumn extends Component {
  constructor(props) {
    super(props);
    this.state = { metaOpen: false, fullsize: false };
  }

  toggleDrawer(e) {
  	if(typeof e !== "undefined") e.stopPropagation();
    this.setState(prevState => ({ metaOpen: !prevState.metaOpen }));
  }


 componentDidMount () {
	setTimeout(() => {
		if(this.props.app.state.ready===false)
		{
			this.setState({ fullsize: true });
			this.render();
		}
	}, 0)
 }
  render() {
		    if(this.props.app.state.ready===false)
		    {
		    	var classes = ["loading"];
		    	if(this.state.fullsize===true) classes.push("fullsize");
		    	return(
			      <div className="col col1">
			        <div className="heading">
			          <div className="heading_subtitle" id="structure_subtitle"> Structural Sections</div>
			          <div className="heading_title">□{" "}<span id="structure_title">Book Structure</span></div>
			        </div>
			        <div id="book" className={classes.join(" ")}><img alt="Loading..." src={loading_img}/><br/>Loading Available Structures...</div>
			      </div>
			    )
		    }
		    
		    var toggler = this.toggleDrawer.bind(this);
             return (
		      <div className="col col1">
		        <div className="heading">
		          <div className="heading_subtitle" id="structure_subtitle">
		            Structural Sections
		          </div>
		          <div className="heading_title" onClick={this.props.app.cycleStructure.bind(this.props.app)}>
		            □{" "}
		            <span id="structure_title">
		              {
		                globalData["meta"]["structure"][this.props.app.state.structure]
		                  .title
		              }
		            </span>{" "}
		            <img
		              alt="Icon"
		              src={require('../img/structures/'+this.props.app.state.structure+'.png')}
		              className="structure_title_icon"
		              onClick={toggler}
		            />
		          </div>
		        </div>
		        <Structure app={this.props.app} />
		        <StructureMeta
            	  app={this.props.app}
		          open={this.state.metaOpen}
		          toggle={toggler}
		        />
		      </div>
		    );

  }
}

class Structure extends Component {
  render() {
    const sections = globalData["structures"][this.props.app.state.structure].map(
      (section, sectionKey) => {
        return (
          <Section
            app={this.props.app}
            section={section}
            sectionKey={sectionKey}
            key={sectionKey}
          />
        );
      }
    );

    return <div id="book"  onMouseEnter={this.props.app.clearTag.bind(this.props.app)}>{sections}</div>;
  }
}

class Section extends Component {
  isActive(sectionKey) {
  	if(this.props.app.state.selected_tag !== null) return false;
  	if(this.props.app.state.searchMode) return false;
    return (
      parseInt(this.props.app.state.highlighted_section_index,16) === sectionKey
    );
  }
  render() {

          var sectionClass = [];
          var section = this.props.section;
          var sectionKey = this.props.sectionKey;
          var app = this.props.app;
          if (this.isActive(sectionKey)) {
            sectionClass.push("outline_highlighted");
          }

          var grids = [];
          for (var x in section.verses) {
            grids.push(
              <VerseGrid
            	app={this.props.app}
                count={section.verses.length}
                verses={section.verses[x]}
                key={x}
              />
            );
          }
          
          var tagimg = null;
          if(section.tag.length>0) tagimg = <img src={tag_png} alt="tag" className="gridTag" tag={section.tag} onClick={()=>this.props.app.showcaseTag(section.tag)}/>

          return (
            <div className="overviewcontainer">
              <h3
                className={sectionClass.join(" ")}
                onMouseEnter={() =>
                  app.setActiveVerse(section.verses[0][0])
                }
              >
                {section.description}
                {tagimg}
              </h3>
              {grids}
            </div>
          );
  }
}

class VerseGrid extends Component {
  render() {
    var gridClass = ["verse_grid"];
    if (this.props.count === 2) {
      gridClass.push("half");
    }
    const index = globalData["index"];
    var verses = this.props.verses;
    return (
      <div className={gridClass.join(" ")}>
        {verses.map((verse_id, verseKey) => {
          var box_num = index[verse_id.toString()].verse;
          var classes = ["versebox", "v_" + verse_id];
          if (box_num === "1") {
            box_num = index[verse_id.toString()].chapter;
            classes.push("chapter");
          }
          if (
            parseInt(
              globalData["outlineIndex"][verse_id.toString()][this.props.app.state.outline],16
            ) %
              2 ===
            0
          ) {
            //lookup outline
            classes.push("outline_odd");
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
    );
  }
}

class StructureMeta extends Component {
  render() {
    var classes = ["meta"];
    if (this.props.open) classes.push("visible");
     var entries = this.props.app.state.top_structures.slice(0); for(var i in globalData["meta"]["structure"]) if(entries.indexOf(i)<0) entries.push(i); 
	    const options = entries.map(
      (shortcode, optionKey) => {
        return (
          <StructureOption
            app={this.props.app}
            option={ globalData["meta"]["structure"][shortcode]}
            optionKey={optionKey}
            key={optionKey}
            toggle={this.props.toggle}
          />
        );
      }
    );

    return (
      <div id="book_meta" className={classes.join(" ")}>
        <h4>Available Structures</h4>
        {options}
      </div>
    );
  }
}

class StructureOption extends Component {
  render() {
    var classes = ["option"];
    if (this.props.optionKey === 0) classes.push("first top");
    else if (this.props.optionKey < 5) classes.push("top");
    else if (this.props.optionKey === 5) classes.push("other firstother");
    else classes.push("other");
	var app = this.props.app;
      return (
        <div
          className={classes.join(" ")}
          onClick={() => {
            this.props.toggle();
            app.setActiveStructure(this.props.option.shortcode);
          }}
        >
          <img
          	alt="Icon"
            src={require('../img/structures/'+this.props.option.shortcode+'.png')}
            className={"structure_title_icon"}
          />
          <div className={"icon"}>{this.props.option.title}</div>
          <span>{this.props.option.description}</span>
        </div>
      );
  }
}
