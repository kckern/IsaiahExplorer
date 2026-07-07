import React, { useContext, useEffect, useState } from "react";

import { DataContext } from "../DataContext";
import { VerseBox } from "./VerseBox.js";
import loading_img from '../img/interface/loadingdna.gif';
import tag_png from '../img/interface/tag.png';

export default function StructureColumn() {
  var globalData = useContext(DataContext);
  var app = globalData.app;
  var state = globalData.state;
  var [metaOpen,setMetaOpen] = useState(false);
  var [fullsize,setFullsize] = useState(false);

  var toggleDrawer = (e) => {
    if(typeof e !== "undefined") e.stopPropagation();
    setMetaOpen((prevState) => !prevState);
  };

  useEffect(() => {
    var timer = setTimeout(() => {
      if(state.ready===false)
      {
        setFullsize(true);
      }
    }, 0);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if(state.ready===false)
  {
    var classes = ["loading"];
    if(fullsize===true) classes.push("fullsize");
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
  var title = null;
  if(globalData["meta"]["structure"][state.structure]!==undefined) title = globalData["meta"]["structure"][state.structure].title;
  return (
    <div className="col col1">
      <div className="heading">
        <div className="heading_subtitle" id="structure_subtitle">
          Structural Sections
        </div>
        <div className="heading_title" onClick={app.cycleStructure.bind(app,1)}>
          □{" "}
          <span id="structure_title">
            {title}
          </span>{" "}
          <img
            alt="Icon"
            src={require('../img/structures/'+state.structure+'.png')}
            className="structure_title_icon"
            onClick={toggleDrawer}
          />
        </div>
      </div>
      <Structure />
      <StructureMeta
        open={metaOpen}
        toggle={toggleDrawer}
      />
    </div>
  );
}

function Structure() {
  var globalData = useContext(DataContext);
  var state = globalData.state;
  const sections = globalData["structures"][state.structure].map(
    (section, sectionKey) => {
      return (
        <Section
          section={section}
          sectionKey={sectionKey}
          key={sectionKey}
        />
      );
    }
  );

  return <div id="book" >{sections}</div>;
}

function Section({section, sectionKey}) {
  var globalData = useContext(DataContext);
  var app = globalData.app;
  var state = globalData.state;

  var isActive = (sectionKey) => {
    if(state.selected_tag !== null) return false;
    if(state.searchMode && !state.commentaryAudioMode) return false;
    return (
      parseInt(state.highlighted_section_index,0) === sectionKey
    );
  };

  var sectionClass = [];
  if (isActive(sectionKey)) {
    sectionClass.push("outline_highlighted");
  }

  var grids = [];
  for (var x in section.verses) {
    grids.push(
      <div key={x}>
        <VerseGrid
          count={section.verses.length}
          verses={section.verses[x]}
        /></div>
    );
  }

  var tagimg = null;
  if(section.tag.length>0) tagimg = <img src={tag_png} alt="tag" className="gridTag" onClick={()=>app.showcaseTag(section.tag)}/>

  let superhead = null;
  if(section.super!==undefined && section.super!=="") superhead = (<h2>{section.super}</h2>);

  return (
    <div className="overviewcontainer">
      {superhead}
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

function VerseGrid({count, verses}) {
  var globalData = useContext(DataContext);
  var state = globalData.state;
  var gridClass = ["verse_grid"];
  if (count === 2) {
    gridClass.push("half");
  }
  const index = globalData["index"];
  return (
    <div className={gridClass.join(" ")}>
      {verses.map((verse_id, verseKey) => {
        var box_num = index[verse_id.toString()].verse;
        var classes = ["versebox", "v_" + verse_id];
        if (box_num === 1) {
          box_num = index[verse_id.toString()].chapter;
          classes.push("chapter");
        }
        if (
          parseInt(
            globalData["outlineIndex"][verse_id.toString()][state.outline], 10
          ) %
            2 ===
          0
        ) {
          //lookup outline
          classes.push("outline_odd");
        }
        return (
          <VerseBox
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

function StructureMeta({open, toggle}) {
  var globalData = useContext(DataContext);
  var state = globalData.state;
  var classes = ["meta"];
  if (open) classes.push("visible");
  var entries = state.top_structures.slice(0); for(var i in globalData["meta"]["structure"]) if(entries.indexOf(i)<0) entries.push(i);
  const options = entries.map(
    (shortcode, optionKey) => {

      return (
        <StructureOption
          option={ globalData["meta"]["structure"][shortcode]}
          optionKey={optionKey}
          key={optionKey}
          toggle={toggle}
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

function StructureOption({option, optionKey, toggle}) {
  var app = useContext(DataContext).app;
  if(option===undefined) return null;
  var classes = ["option"];
  if (optionKey === 0) classes.push("first top");
  else if (optionKey < 5) classes.push("top");
  else if (optionKey === 5) classes.push("other firstother");
  else classes.push("other");
  return (
    <div
      className={classes.join(" ")}
      onClick={() => {
        toggle();
        app.setActiveStructure(option.shortcode);
      }}
    >
      <img
        alt="Icon"
        src={require('../img/structures/'+option.shortcode+'.png')}
        className={"structure_title_icon"}
      />
      <div className={"icon"}>{option.title}</div>
      <span>{option.description}</span>
    </div>
  );
}
