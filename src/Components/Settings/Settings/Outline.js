import React, {useContext} from "react";
import {SortableElement} from 'react-sortable-hoc';
import {DataContext} from "../../../DataContext";

const noop = () =>{};


function OutlineSetting({dragging, option, optionKey, settings}) {
    const globalData = useContext(DataContext);
    const app = globalData.app;
    const state = globalData.state;
    var classes = ["option"];
    if (option.shortcode === state.outline) classes.push("active");
    if (optionKey === 0) classes.push("first top");
    else if (optionKey < 5) classes.push("top");
    else if (optionKey === 5) classes.push("other firstother");
    else classes.push("other");
    return (
      <div title={option.title} className={classes.join(" ")}
        onMouseEnter={() => {
        // eslint-disable-next-line
          dragging
            ? noop // do not display preview while dragging. Saves a log of repaints;
            : settings.setState({preview:"outline",shortcode:option.shortcode})
        }}
      >
        <div className="rank">
          <span>{dragging ? '' : optionKey + 1}</span>
        </div>
        <div className="optionbox">
          <img alt="img" src={require('../../../img/versions/' + option.shortcode + '.jpg')} />
          <div className="outline_full_title">{option.title}</div>
        </div>
      </div>
    );
}

export default SortableElement(OutlineSetting)