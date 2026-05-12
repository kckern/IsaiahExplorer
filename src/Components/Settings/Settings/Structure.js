import React, {useContext} from "react";
import {SortableElement} from 'react-sortable-hoc';
import {DataContext} from "../../../DataContext";

const noop = () =>{}; // useful to have

function StructureSetting({dragging, option, optionKey, settings}) {
    const globalData = useContext(DataContext);
    const app = globalData.app;
    const state = globalData.state;
    const classes = ["option"];
    if (option.shortcode === state.structure) classes.push("active");
    if (optionKey === 0) classes.push("first top");
    else if (optionKey < 5) { classes.push("top");  }
    else if (optionKey === 5) classes.push("other firstother");
    else classes.push("other");


    return (
      <div key={option.shortcode}  title={option.title} className={classes.join(" ")}
           onMouseEnter={() => {
        // eslint-disable-next-line
             dragging
               ? noop // do not display preview while dragging. Saves a log of repaints;
               : settings.setState({preview:"structure",shortcode:option.shortcode})}}>
        <div className="rank">
          <span>{dragging ? '' : optionKey + 1}</span>
        </div>
        <div className="optionbox">
          <div className="icon">{option.title}</div>
          <img alt="img" src={require('../../../img/structures/'+option.shortcode+'.png')} className="structure_title_icon" />
          <span>{option.description}</span>
        </div>
      </div>
    );
}


export default SortableElement(StructureSetting)