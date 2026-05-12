import React, {useContext} from "react";
import {SortableElement} from 'react-sortable-hoc';
import {DataContext} from "../../../DataContext";

const noop = () =>{}; // useful to have

function VersionSetting({dragging, option, optionKey, settings}) {
    const globalData = useContext(DataContext);
    const app = globalData.app;
    const state = globalData.state;
    var classes = ["option"];
    if (option.shortcode === state.version) classes.push("active");
    if (optionKey === 0) classes.push("first top");
    else if (optionKey < 5) classes.push("top");
    else if (optionKey === 5) classes.push("other firstother");
    else classes.push("other");

    var audioimg = null;
    if(option.audio===1) audioimg = <img alt="img" src={require('../../../img/interface/audio.png')}/>;

    return (
      <div title={option.title} className={classes.join(" ")}
           onMouseEnter={() => {
        // eslint-disable-next-line
             dragging
               ? noop // do not display preview while dragging. Saves a log of repaints;
               : settings.setState({preview:"version", shortcode:option.shortcode})}} >
        <div className="rank">
          <span>{dragging ? '' : optionKey + 1}</span>
        </div>
        <div className="optionbox">
          <img alt="img" src={require('../../../img/versions/'+option.shortcode.toLowerCase()+'.jpg')} />
          <div className="version_full_title">{audioimg}{option.title}</div>
          <div className="version_description">{option.description}</div>
        </div>
      </div>

    );
}

export default SortableElement(VersionSetting)