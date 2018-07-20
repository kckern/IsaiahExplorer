import React, {Component} from "react";
import {globalData} from "../../../globals";

class StructurePreview extends Component {
  render() {

    var meta = globalData["meta"]["structure"][this.props.shortcode];
    var rows = globalData.structures[meta.shortcode].map((rowdata,key)=>{
      return [(<dt key={key+"A"}>{rowdata.reference}</dt>),(<dd key={key+"B"}>{rowdata.description}</dd>)]
    });

    return (

      <div className="pref_row" id="prefs_example" style={{height: 664}}>
        <h3><img alt="img" src={require('../../../img/structures/'+meta.shortcode+'.png')}  />{meta.title}</h3>
        <div className="detail">{meta.description}</div>
        <dl>{rows}</dl>
      </div>
    );


  }
}

export default StructurePreview