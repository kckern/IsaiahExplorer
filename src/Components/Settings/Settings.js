import React, {useContext, useEffect, useMemo, useState} from "react";
import {DataContext} from "../../DataContext";

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

function Settings() {
  var globalData = useContext(DataContext);
  var app = globalData.app;
  var state = globalData.state;

  var [preview,setPreview] = useState("version");
  var [shortcode,setShortcode] = useState(null);
  var [structureEntries,setStructureEntries] = useState([]);
  var [outlineEntries,setOutlineEntries] = useState([]);
  var [versionEntries,setVersionEntries] = useState([]);

  useEffect(() => {
    const topStructures = state.top_structures.slice(0);
    const structures = Object.keys(globalData["meta"]["structure"]).filter(i => !topStructures.includes(i))
    const nextStructureEntries = [...topStructures, ...structures]

    const topOutlines = state.top_outlines.slice(0);
    const outlines = Object.keys(globalData["meta"]["outline"]).filter(i => !topOutlines.includes(i))
    const nextOutlineEntries = [...topOutlines, ...outlines]

    const topVersions = state.top_versions.slice(0);
    const versions = Object.keys(globalData["meta"]["version"]).filter(i => !topVersions.includes(i))
    const nextVersionEntries = [...topVersions, ...versions]

    setStructureEntries(nextStructureEntries);
    setOutlineEntries(nextOutlineEntries);
    setVersionEntries(nextVersionEntries);
    setShortcode(topVersions[0] || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const settingsApi = useMemo(() => ({
    setState: (patch) => {
      if (patch.preview !== undefined) setPreview(patch.preview);
      if (patch.shortcode !== undefined) setShortcode(patch.shortcode);
      if (patch.structureEntries !== undefined) setStructureEntries(patch.structureEntries);
      if (patch.outlineEntries !== undefined) setOutlineEntries(patch.outlineEntries);
      if (patch.versionEntries !== undefined) setVersionEntries(patch.versionEntries);
    }
  }), []);

  const Preview = previews[preview]

  return (
    <div id="user_prefs">
      <img alt="img" style={{float: 'right'}} onClick={() => app.closeSettings()}
           src={require('../../img/interface/close.png')} />
      <h2>Isaiah Explorer User Preferences
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
                <StructureSettings settings={settingsApi} entries={structureEntries} />
              </div>
            </div>
          </td>
          <td width="25%">
            <div className="pref_row" id="outline_prefs" style={{height: 664}}>
              <div className="prefs_list ui-sortable" unselectable="on" style={{userSelect: 'none'}}>
                <h5 className="topheading">Top 5 Preferred Outlines</h5>
                <OutlineSettings settings={settingsApi} entries={outlineEntries} />
              </div>
            </div>
          </td>
          <td width="25%">
            <div className="pref_row" id="version_prefs" style={{height: 664}}>
              <div className="prefs_list ui-sortable" unselectable="on" style={{userSelect: 'none'}}>
                <h5 className="topheading">Top 5 Preferred Versions</h5>
                <VersionSettings settings={settingsApi} entries={versionEntries} />
              </div>
            </div>
          </td>
          <td width="25%">
            <Preview shortcode={shortcode} />
          </td>
        </tr>
        </tbody>
      </table>
    </div>
  );
}

export default Settings