import React, {Component} from "react";
import {SortableElement} from 'react-sortable-hoc';

const noop = () =>{}; // useful to have

class VersionSetting extends Component {
  render() {
    const {dragging} = this.props
    var classes = ["option"];
    if (this.props.option.shortcode === this.props.app.state.version) classes.push("active");
    if (this.props.optionKey === 0) classes.push("first top");
    else if (this.props.optionKey < 5) classes.push("top");
    else if (this.props.optionKey === 5) classes.push("other firstother");
    else classes.push("other");

    var audioimg = null;
    if(this.props.option.audio===1) audioimg = <img alt="img" src={require('../../../img/interface/audio.png')}/>;

    return (
      <div title={this.props.option.title} className={classes.join(" ")}
           onMouseEnter={() => {
             dragging
               ? noop // do not display preview while dragging. Saves a log of repaints;
               : this.props.settings.setState({preview:"version", shortcode:this.props.option.shortcode})}} >
        <div className="rank">
          <span>{dragging ? '' : this.props.optionKey + 1}</span>
        </div>
        <div className="optionbox">
          <img alt="img" src={require('../../../img/versions/'+this.props.option.shortcode.toLowerCase()+'.jpg')} />
          <div className="version_full_title">{audioimg}{this.props.option.title}</div>
          <div className="version_description">{this.props.option.description}</div>
        </div>
      </div>

    );
  }
}

export default SortableElement(VersionSetting)