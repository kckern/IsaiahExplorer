import React, {Component} from "react";
import {SortableElement} from 'react-sortable-hoc';

const noop = () =>{};


class OutlineSetting extends Component {
  render() {
    const {dragging} = this.props
    var classes = ["option"];
    if (this.props.option.shortcode === this.props.app.state.outline) classes.push("active");
    if (this.props.optionKey === 0) classes.push("first top");
    else if (this.props.optionKey < 5) classes.push("top");
    else if (this.props.optionKey === 5) classes.push("other firstother");
    else classes.push("other");
    return (
      <div title={this.props.option.title} className={classes.join(" ")}
        onMouseEnter={() => {
        // eslint-disable-next-line
          dragging
            ? noop // do not display preview while dragging. Saves a log of repaints;
            : this.props.settings.setState({preview:"outline",shortcode:this.props.option.shortcode})
        }}
      >
        <div className="rank">
          <span>{dragging ? '' : this.props.optionKey + 1}</span>
        </div>
        <div className="optionbox">
          <img alt="img" src={require('../../../img/versions/' + this.props.option.shortcode + '.jpg')} />
          <div className="outline_full_title">{this.props.option.title}</div>
        </div>
      </div>
    );
  }
}

export default SortableElement(OutlineSetting)