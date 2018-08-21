import React, { Component } from "react";

export class VerseBox extends Component {
  isActive() {
    return parseInt(this.props.app.state.active_verse_id,0) === parseInt(this.props.verse_id,0);
  }
  isInRange() {
    return (  this.props.app.state.highlighted_verse_range.indexOf(parseInt(this.props.verse_id,0)) > -1 );
  }
  isTagged() {
    return (  this.props.app.state.highlighted_tagged_verse_range.indexOf(parseInt(this.props.verse_id,0)) > -1 );
  }
  isTaggedParent() {
    return (  this.props.app.state.highlighted_tagged_parent_verse_range.indexOf(parseInt(this.props.verse_id,0)) > -1 );
  }
  isSelected() {
    return  parseInt(this.props.app.state.selected_verse_id,0) === parseInt(this.props.verse_id,0);
  }
  isActiveCommentary() {
    return (  
    	this.props.app.state.commentary_audio_verse_range.indexOf(parseInt(this.props.verse_id,0)) > -1 ||
    	this.props.app.state.commentary_verse_range.indexOf(parseInt(this.props.verse_id,0)) > -1
    
    );
  }

  render() {
    if (this.isActive()) this.props.class.push("versebox_highlighted");
    if (this.isInRange()) this.props.class.push("versebox_range_highlighted");
    if (this.isSelected()) this.props.class.push("versebox_selected");
    if (this.isTagged()) this.props.class.push("versebox_tag_highlighted");
    if (this.isTaggedParent()) this.props.class.push("versebox_parent_range_highlighted");
    if (this.isActiveCommentary()) this.props.class.push("active_commentary");
    

    return (

            <div
              onMouseEnter={() => this.props.app.setActiveVerse(this.props.verse_id,undefined,undefined,undefined,"versebox")}
              onClick={() => this.props.app.selectVerse(this.props.verse_id,"versebox")}
              className={this.props.class.join(" ")}
              verse_id={this.props.verse_id}
              title={this.props.title}  >
              {this.props.box_num}
            </div>
          );
  }
}
 