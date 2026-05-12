import React, {useContext} from "react";
import {DataContext} from "../../../DataContext";

function OutlinePreview({shortcode}) {
  var globalData = useContext(DataContext);

  var meta = globalData["meta"]["outline"][shortcode];
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

export default OutlinePreview