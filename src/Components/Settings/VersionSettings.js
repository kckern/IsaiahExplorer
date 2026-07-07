import React, {useContext, useEffect, useState} from "react";
import VersionSetting from "./Settings/Version";
import {DataContext} from "../../DataContext";
import SortableList from './SortableList'
import {arrayMove} from './arrayMove';

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

  // keyboard/no-drag reorder: routes through the same onSortEnd persistence path
  var onMove = (from, to) => {
    if (to < 0 || to >= entries.length) return;
    onSortEnd({oldIndex: from, newIndex: to});
  };

  const iterated = entries.map((shortcode, optionKey) => {
    return (
      <VersionSetting
        settings={settings}
        option={globalData["meta"]["version"][shortcode]}
        optionKey={optionKey}
        index={optionKey}
        id={shortcode}
        key={shortcode}
        dragging={dragging}
        onMove={onMove}
      />
    )
  });
  iterated.splice(5, 0, (<h5 key="R" className="otherheading">Reserve Items</h5>));
  return <SortableList
    items={entries}
    entries={iterated}
    onSortStart={onSortStart}
    onSortEnd={onSortEnd}
  />
}

export default VersionSettings