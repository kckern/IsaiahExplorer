import React, {useContext} from "react";
import {DataContext} from "../../../DataContext";
import {Passage} from "../../Passage";

function VersionPreview({shortcode}) {
  var globalData = useContext(DataContext);
  var meta = globalData["meta"]["version"][shortcode];

  return (

    <div className="pref_row" id="prefs_example" style={{height: 648}}>
      <h3>Sample Passages from: <br />{meta.title}</h3>
      <div className="detail"><img alt="img" className="cover"  src={require('../../../img/versions/'+meta.shortcode.toLowerCase()+'.jpg')} />{meta.description}</div>
      <hr/>
      <Passage version={meta.shortcode} verses={[17673]} wrapperClass="passage preview"/>
      <hr/>
      <Passage version={meta.shortcode} verses={[17797]} wrapperClass="passage preview"/>
      <hr/>
      <Passage version={meta.shortcode} verses={[17836]} wrapperClass="passage preview"/>
      <hr/>
      <Passage version={meta.shortcode} verses={[17891]} wrapperClass="passage preview"/>
      <hr/>
      <Passage version={meta.shortcode} verses={[18714,18715,18716,18717]} wrapperClass="passage preview"/>
    </div>
  );
}

export default VersionPreview