import React, { Component } from "react";
import { globalData } from "../globals.js";
import { Passage } from "./Passage.js";



class StructureSetting extends Component {
  render() {
    var classes = ["option"];
    if (this.props.option.shortcode === this.props.app.state.structure) classes.push("active");
    if (this.props.optionKey === 0) classes.push("first top");
    else if (this.props.optionKey < 5) { classes.push("top");  }
    else if (this.props.optionKey === 5) classes.push("other firstother");
    else classes.push("other");
	
	
	
	
      return (
			<div key={this.props.option.shortcode}  title={this.props.option.title} className={classes.join(" ")}  
				onMouseUp={() => {this.props.app.setNewTop("top_structures",this.props.option.shortcode,4)}}
				onMouseEnter={() => {this.props.settings.setState({preview:"structure",shortcode:this.props.option.shortcode})}}>
              <div className="rank">{this.props.optionKey+1}</div>
              <div className="optionbox">
                <div className="icon">{this.props.option.title}</div> <img alt="img" src={require('../img/structures/'+this.props.option.shortcode+'.png')} className="structure_title_icon" /> <span>{this.props.option.description}</span> </div>
            </div>
      );
  }
}



class OutlineSetting extends Component {
  render() {
    var classes = ["option"];
    if (this.props.option.shortcode === this.props.app.state.outline) classes.push("active");
    if (this.props.optionKey === 0) classes.push("first top");
    else if (this.props.optionKey < 5) classes.push("top");
    else if (this.props.optionKey === 5) classes.push("other firstother");
    else classes.push("other");
      return (
            <div title={this.props.option.title} className={classes.join(" ")}  
				onMouseUp={() => {this.props.app.setNewTop("top_outlines",this.props.option.shortcode,3)}}
				onMouseEnter={() => {this.props.settings.setState({preview:"outline",shortcode:this.props.option.shortcode})}}>
		        <div className="rank">{this.props.optionKey+1}</div>
		        <div className="optionbox"> 
		        	<img alt="img" src={require('../img/versions/'+this.props.option.shortcode+'.jpg')} />
		        	<div className="outline_full_title">{this.props.option.title}</div>
		        </div>
	       </div>
      
      );
  }
}


class VersionSetting extends Component {
  render() {
    var classes = ["option"];
    if (this.props.option.shortcode === this.props.app.state.version) classes.push("active");
    if (this.props.optionKey === 0) classes.push("first top");
    else if (this.props.optionKey < 5) classes.push("top");
    else if (this.props.optionKey === 5) classes.push("other firstother");
    else classes.push("other");
	
	var audioimg = null;
	if(this.props.option.audio===1) audioimg = <img alt="img" src={require('../img/interface/audio.png')}/>;
	
      return (
            <div title={this.props.option.title} className={classes.join(" ")} 
            	draggable="true" onDragStart={function(){}} onDrop={function(){}} onDragOver={function(){}} onDragEnd={function(){}}
				onMouseUp={() => {this.props.app.setNewTop("top_versions",this.props.option.shortcode,2)}}
				onMouseEnter={() => {this.props.settings.setState({preview:"version",shortcode:this.props.option.shortcode})}} >
		        <div className="rank">{this.props.optionKey+1}</div>
		        <div className="optionbox"> 
		        	<img alt="img" src={require('../img/versions/'+this.props.option.shortcode.toLowerCase()+'.jpg')} />
		        	<div className="version_full_title">{audioimg}{this.props.option.title}</div>
		        	<div className="version_description">{this.props.option.description}</div>
		        </div>
	       </div>
      
      );
  }
}

class VersionPreview extends Component {
  render() {
  	var meta = globalData["meta"]["version"][this.props.shortcode];

  return (

      <div className="pref_row" id="prefs_example" style={{height: 648}}>
        <h3>Sample Passages from: <br />{meta.title}</h3>
        <div className="detail"><img alt="img" className="cover"  src={require('../img/versions/'+meta.shortcode.toLowerCase()+'.jpg')} />{meta.description}</div>
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

class OutlinePreview extends Component {
  render() {
  	
  	var meta = globalData["meta"]["outline"][this.props.shortcode];
  	var rows = globalData.outlines[meta.shortcode].map((rowdata,key)=>{
  		return [(<dt key={key+"A"}>Isaiah {rowdata.reference}</dt>),(<dd key={key+"B"}>{rowdata.heading}</dd>)]
  	});
  	
  	return (

      <div className="pref_row" id="prefs_example" style={{height: 664}}>
        <h3>{meta.title}</h3>
        <div align="center"><img alt="img" className="cover" src={require('../img/versions/'+meta.shortcode+'.jpg')}/></div>
        <dl>{rows}</dl>
      </div> 
    );
    
  	
  }
}


class StructurePreview extends Component {
  render() {
  	
  	var meta = globalData["meta"]["structure"][this.props.shortcode];
  	var rows = globalData.structures[meta.shortcode].map((rowdata,key)=>{
  		return [(<dt key={key+"A"}>{rowdata.reference}</dt>),(<dd key={key+"B"}>{rowdata.description}</dd>)]
  	});
  	
  	return (

      <div className="pref_row" id="prefs_example" style={{height: 664}}>
        <h3><img alt="img" src={require('../img/structures/'+meta.shortcode+'.png')}  />{meta.title}</h3>
        <div className="detail">{meta.description}</div>
        <dl>{rows}</dl>
      </div> 
    );
    
  	
  }
}

export default class Settings extends Component {
	
	
  state = {
    preview: "version",
    shortcode: this.props.app.state.top_versions[0],
    
    top_versions: [] ,
    top_outlines: [] ,
    top_structures: [] ,
  }


  render() {
		var entries = this.props.app.state.top_structures.slice(0); for(var i in globalData["meta"]["structure"]) if(entries.indexOf(i)<0) entries.push(i); 
		const StructureSettings = entries.map((shortcode, optionKey) => {
			

			
	        return (
	          <StructureSetting
	            app={this.props.app}
	            settings={this}
	            option={ globalData["meta"]["structure"][shortcode]}
	            optionKey={optionKey}
	            key={optionKey}
	          />
	        )});
        StructureSettings.splice(5, 0, (<h5 key="R" className="otherheading">Reserve Items</h5>));
        
		entries = this.props.app.state.top_outlines.slice(0); for(i in globalData["meta"]["outline"]) if(entries.indexOf(i)<0) entries.push(i);
		const OutlineSettings = entries.map((shortcode, optionKey) => {
	        return (
	          <OutlineSetting
	            app={this.props.app}
	            settings={this}
	            option={ globalData["meta"]["outline"][shortcode]}
	            optionKey={optionKey}
	            key={optionKey}
	          />
	        )});
        OutlineSettings.splice(5, 0, (<h5 key="R" className="otherheading">Reserve Items</h5>));
        
		entries = this.props.app.state.top_versions.slice(0); for(i in globalData["meta"]["version"]) if(entries.indexOf(i)<0) entries.push(i);
		const VersionSettings = entries.map((shortcode, optionKey) => {
	        return (
	          <VersionSetting
	            app={this.props.app}
	            settings={this}
	            option={ globalData["meta"]["version"][shortcode]}
	            optionKey={optionKey}
	            key={optionKey}
	          />
	        )});
        VersionSettings.splice(5, 0, (<h5 key="R" className="otherheading">Reserve Items</h5>));
        
        var preview = null;
        if(this.state.preview==="version") preview = <VersionPreview app={this.props.app} shortcode={this.state.shortcode}/>
        if(this.state.preview==="outline") preview = <OutlinePreview app={this.props.app} shortcode={this.state.shortcode}/>
        if(this.state.preview==="structure") preview = <StructurePreview app={this.props.app} shortcode={this.state.shortcode}/>
        

    return (
      <div id="user_prefs" >
       <img alt="img"  style={{float: 'right'}}  onClick={() => this.props.app.closeSettings()}src={require('../img/interface/close.png')}  />
        <h2 align="center">Isaiah Explorer User Preferences<div className="instructions">Please rank the following options by order of preference by dragging an item up or down.  The top five of each category will become readily accessible from the main screen.</div></h2>
        <table>
          <tbody>
            <tr className="pref_heading">
              <td width="25%">
                <h4>Structure Preferences</h4></td>
              <td width="25%">
                <h4>Outline Preferences</h4></td>
              <td width="25%">
                <h4>Text Version Preferences</h4></td>
              <td width="25%">
                <h4>Preview</h4></td>
            </tr>
            <tr>
              <td width="25%">
                <div className="pref_row" id="structure_prefs" style={{height: 664}}>
                  <div className="prefs_list ui-sortable" unselectable="on" style={{userSelect: 'none'}}>
                    <h5 className="topheading">Top 5 Preferred Structures</h5>
                    {StructureSettings}
                  </div>
                </div>
              </td>
              <td width="25%">
                <div className="pref_row" id="outline_prefs" style={{height: 664}}>
                  <div className="prefs_list ui-sortable" unselectable="on" style={{userSelect: 'none'}}>
                    <h5 className="topheading">Top 5 Preferred Outlines</h5>
                    {OutlineSettings}
                  </div>
                </div>
              </td>
              <td width="25%">
                <div className="pref_row" id="version_prefs" style={{height: 664}}>
                  <div className="prefs_list ui-sortable" unselectable="on" style={{userSelect: 'none'}}>
                    <h5 className="topheading">Top 5 Preferred Versions</h5>
                    {VersionSettings}
                  </div>
                </div>
              </td>
              <td width="25%">{preview}</td>
            </tr>
          </tbody>
        </table>
      </div>

          );
  }
}
 