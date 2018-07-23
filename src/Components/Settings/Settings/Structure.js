import React, {Component} from "react";
import {SortableElement} from 'react-sortable-hoc';

const noop = () =>{}; // useful to have

class StructureSetting extends Component {
  render() {
    const {dragging} = this.props
    const classes = ["option"];
    if (this.props.option.shortcode === this.props.app.state.structure) classes.push("active");
    if (this.props.optionKey === 0) classes.push("first top");
    else if (this.props.optionKey < 5) { classes.push("top");  }
    else if (this.props.optionKey === 5) classes.push("other firstother");
    else classes.push("other");


    return (
      <div key={this.props.option.shortcode}  title={this.props.option.title} className={classes.join(" ")}
           onMouseEnter={() => {
        // eslint-disable-next-line
             dragging
               ? noop // do not display preview while dragging. Saves a log of repaints;
               : this.props.settings.setState({preview:"structure",shortcode:this.props.option.shortcode})}}>
        <div className="rank">
          <span>{dragging ? '' : this.props.optionKey + 1}</span>
        </div>
        <div className="optionbox">
          <div className="icon">{this.props.option.title}</div>
          <img alt="img" src={require('../../../img/structures/'+this.props.option.shortcode+'.png')} className="structure_title_icon" />
          <span>{this.props.option.description}</span>
        </div>
      </div>
    );
  }
}


export default SortableElement(StructureSetting)