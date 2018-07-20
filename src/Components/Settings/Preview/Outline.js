import React, {Component} from "react";
import {globalData} from "../../../globals";

class OutlinePreview extends Component {
  render() {

    var meta = globalData["meta"]["outline"][this.props.shortcode];
    var rows = globalData.outlines[meta.shortcode].map((rowdata,key)=>{
      return [(<dt key={key+"A"}>Isaiah {rowdata.reference}</dt>),(<dd key={key+"B"}>{rowdata.heading}</dd>)]
    });

    return (

      <div className="pref_row" id="prefs_example" style={{height: 664}}>
        <h3>{meta.title}</h3>
        <div align="center"><img alt="img" className="cover" src={require('../../../img/versions/'+meta.shortcode+'.jpg')}/></div>
        <dl>{rows}</dl>
      </div>
    );


  }
}

export default OutlinePreview