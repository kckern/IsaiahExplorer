import React, { useContext } from "react";
import { DataContext } from "../DataContext";

export function VerseBox({ verse_id, class: baseClasses, title, box_num }) {
  var globalData = useContext(DataContext);
  var app = globalData.app;
  var state = globalData.state;

  var parsedVerseId = parseInt(verse_id,0);

  var isActive = parseInt(state.active_verse_id,0) === parsedVerseId;
  var isInRange = state.highlighted_verse_range.indexOf(parsedVerseId) > -1;
  var isTagged = state.highlighted_tagged_verse_range.indexOf(parsedVerseId) > -1;
  var isTaggedParent = state.highlighted_tagged_parent_verse_range.indexOf(parsedVerseId) > -1;
  var isSelected = parseInt(state.selected_verse_id,0) === parsedVerseId;
  var isActiveCommentary = (
	  state.commentary_audio_verse_range.indexOf(parsedVerseId) > -1 ||
	  state.commentary_verse_range.indexOf(parsedVerseId) > -1
  );

  var classes = baseClasses.slice(0);
  if (isActive) classes.push("versebox_highlighted");
  if (isInRange) classes.push("versebox_range_highlighted");
  if (isSelected) classes.push("versebox_selected");
  if (isTagged) classes.push("versebox_tag_highlighted");
  if (isTaggedParent) classes.push("versebox_parent_range_highlighted");
  if (isActiveCommentary) classes.push("active_commentary");

  return (

          <div
            onMouseEnter={() => app.setActiveVerse(verse_id,undefined,undefined,undefined,"versebox")}
            onClick={() => app.selectVerse(verse_id,"versebox")}
            onDoubleClick={() => app.doubleClickVerse(verse_id,"versebox")}
            onContextMenu={(e) => { e.preventDefault(); app.doubleClickVerse(verse_id,"versebox")}}
            className={classes.join(" ")}
            title={title}  >
            {box_num}
          </div>
        );
}

