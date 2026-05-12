import React, {useContext, useEffect, useState} from "react";
import VersionSetting from "./Settings/Version";
import {DataContext} from "../../DataContext";
import SortableList from './SortableList'
import {arrayMove} from 'react-sortable-hoc';

function VersionSettings({entries: sourceEntries = [], settings}){
  var globalData = useContext(DataContext);
  var app = globalData.app;
  var [entries,setEntries] = useState(sourceEntries || []);
  var [full,setFull] = useState(false);
  var [dragging,setDragging] = useState(false);

  useEffect(() => {
    if (sourceEntries.length === entries.length && full) return;
    setEntries(sourceEntries);
    setFull(true);
  }, [sourceEntries, entries.length, full]);

  var onSortStart = () => {
    setDragging(true);
  };

  var onSortEnd = ({oldIndex, newIndex}) => {
    const newEntries = arrayMove(entries, oldIndex, newIndex)
    setEntries(newEntries);
    setDragging(false);
    app.setNewTop("top_versions", newEntries[newIndex], newIndex)
  };

  const iterated = entries.map((shortcode, optionKey) => {
    return (
      <VersionSetting
        settings={settings}
        option={globalData["meta"]["version"][shortcode]}
        optionKey={optionKey}
        index={optionKey}
        key={shortcode}
        dragging={dragging}
      />
    )
  });
  iterated.splice(5, 0, (<h5 key="R" className="otherheading">Reserve Items</h5>));
  return <SortableList
    axis="y"
    lockAxis="y"
    entries={iterated}
    onSortStart={onSortStart}
    onSortEnd={onSortEnd}
    helperClass="option--dragging"
  />
}

export default VersionSettings