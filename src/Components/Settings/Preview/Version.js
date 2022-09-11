import React, {Component} from "react";
import {globalData} from "../../../globals";
import {Passage} from "../../Passage";

class VersionPreview extends Component {
  render() {
    var meta = globalData["meta"]["version"][this.props.shortcode];

    return (

      <div className="pref_row" id="prefs_example" style={{height: 648}}>
        <h3>Sample Passages from: <br />{meta.title}</h3>
        <div className="detail"><img alt="img" className="cover"  src={require('../../../img/versions/'+meta.shortcode.toLowerCase()+'.png')} />{meta.description}</div>
        <hr/>
        <Passage app={this.props.app} version={meta.shortcode} verses={[17673]} wrapperClass="passage preview"/>
        <hr/>
        <Passage app={this.props.app} version={meta.shortcode} verses={[17797]} wrapperClass="passage preview"/>
        <hr/>
        <Passage app={this.props.app} version={meta.shortcode} verses={[17836]} wrapperClass="passage preview"/>
        <hr/>
        <Passage app={this.props.app} version={meta.shortcode} verses={[17891]} wrapperClass="passage preview"/>
        <hr/>
        <Passage app={this.props.app} version={meta.shortcode} verses={[18714,18715,18716,18717]} wrapperClass="passage preview"/>
      </div>
    );
  }
}

export default VersionPreview