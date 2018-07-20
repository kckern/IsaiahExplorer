import React, {Component} from "react";
import {globalData} from "../../globals.js";

import VersionPreview from './Preview/Version'
import OutlinePreview from './Preview/Outline'
import StructurePreview from './Preview/Structure'

import StructureSettings from './StructureSettings'
import OutlineSettings from './OutlineSettings'
import VersionSettings from './VersionSettings'

const previews = {
  version: VersionPreview,
  outline: OutlinePreview,
  structure: StructurePreview
}

class Settings extends Component {
  state = {
    preview: "version",
    shortcode: this.props.app.state.top_versions[0],

    top_versions: [],
    top_outlines: [],
    top_structures: [],

    structureEntries: [],
    outlineEntries: [],
    versionEntries: [],
  }

  componentDidMount() {
    const {app} = this.props
    const topStructures = app.state.top_structures.slice(0);
    const structures = Object.keys(globalData["meta"]["structure"]).filter(i => !topStructures.includes(i))
    const structureEntries = [...topStructures, ...structures]

    const topOutlines = app.state.top_outlines.slice(0);
    const outlines = Object.keys(globalData["meta"]["outline"]).filter(i => !topOutlines.includes(i))
    const outlineEntries = [...topOutlines, ...outlines]


    const topVersions = app.state.top_versions.slice(0);
    const versions = Object.keys(globalData["meta"]["version"]).filter(i => !topVersions.includes(i))
    const versionEntries = [...topVersions, ...versions]
    this.setState({structureEntries, outlineEntries, versionEntries,})
  }

  render() {
    const {app} = this.props
    const {structureEntries, outlineEntries, versionEntries} = this.state
    const Preview = previews[this.state.preview]
    
    return (
      <div id="user_prefs">
        <img alt="img" style={{float: 'right'}} onClick={app.closeSettings}
             src={require('../../img/interface/close.png')} />
        <h2 align="center">Isaiah Explorer User Preferences
          <div className="instructions">Please rank the following options by order of preference by dragging an item up
            or down. The top five of each category will become readily accessible from the main screen.
          </div>
        </h2>
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
                  <StructureSettings settings={this} entries={structureEntries} app={app} />
                </div>
              </div>
            </td>
            <td width="25%">
              <div className="pref_row" id="outline_prefs" style={{height: 664}}>
                <div className="prefs_list ui-sortable" unselectable="on" style={{userSelect: 'none'}}>
                  <h5 className="topheading">Top 5 Preferred Outlines</h5>
                  <OutlineSettings settings={this} entries={outlineEntries} app={app} />
                </div>
              </div>
            </td>
            <td width="25%">
              <div className="pref_row" id="version_prefs" style={{height: 664}}>
                <div className="prefs_list ui-sortable" unselectable="on" style={{userSelect: 'none'}}>
                  <h5 className="topheading">Top 5 Preferred Versions</h5>
                  <VersionSettings settings={this} entries={versionEntries} app={app} />
                </div>
              </div>
            </td>
            <td width="25%">
              <Preview app={app} shortcode={this.state.shortcode} />
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    );
  }
}

export default Settings