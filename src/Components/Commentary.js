import React, { useContext, useEffect, useRef, useState } from "react";
import { DataContext } from "../DataContext";
import close from "../img/interface/close.png";
import Parser from "html-react-parser";
import { SGLink } from "../App.js";
import { commentaryReplacer } from "./commentaryReplacer";

function mapOrder(array, order, key) {
  array.sort(function(a, b) {
    var A = a[key],
      B = b[key];

    if (order.indexOf(A) === -1 && order.indexOf(B) >= 0) return 1;
    if (order.indexOf(A) > order.indexOf(B)) return 1;
    return -1;
  });
  return array;
}

function ksort(obj) {
  var keys = Object.keys(obj).sort(),
    sortedObj = {};

  for (var i in keys) {
    sortedObj[keys[i]] = obj[keys[i]];
  }

  return sortedObj;
}

export function Commentary() {
  var globalData = useContext(DataContext);
  var app = globalData.app;
var state = globalData.state;

  if (state.commentaryMode === false)
    return (
      <div>
        <div className="heading_subtitle commentary">
          Commentary
          <button type="button" className="linklike" aria-label="Close commentary" onClick={app.clearCommentary.bind(app)}><img src={close} alt="" /></button>
        </div>
        <div id="commentary_text"></div>
      </div>
    );

  return (
    <div>
      <div className="heading_subtitle commentary">
        Commentary
        <button type="button" className="linklike" aria-label="Close commentary" onClick={app.clearCommentary.bind(app)}><img src={close} alt="" /></button>
      </div>
      <div id="commentary_text">
        <CommentaryTabs />
        <CommentaryContent />
      </div>
    </div>
  );
}

function CommentaryTabs() {
  var globalData = useContext(DataContext);
  var app = globalData.app;
var state = globalData.state;
  const didMount = useRef(false);

  useEffect(() => {
    if (didMount.current) {
      app.saveSettings();
    } else {
      didMount.current = true;
    }
  });

  function handleClick(shortcode) {
    var list = globalData.commentary.comIndex[state.commentary_verse_id][shortcode];
    var id = list[list.length - 1];
    app.setState({ commentarySource: shortcode, commentaryID: id });
  }

  var comSources = Object.values(globalData.commentary.comSources);

  comSources = mapOrder(comSources, state.commentary_order, "shortcode");

  var available = {};

  var tabs = comSources.map((source, key) => {
    if (globalData.commentary.comIndex[state.commentary_verse_id] === undefined) return null;
    if (
      globalData.commentary.comIndex[state.commentary_verse_id][source.shortcode] ===
      undefined
    )
      return null;
    available[source.year + source.shortcode] = source;
    var classes = [];
    if (source.shortcode === state.commentarySource) classes.push("selected");
    return (
      <span
        className={classes.join(" ")}
        key={key}
        ref={source.shortcode}
        onClick={() => handleClick(source.shortcode)}>
        {source.label}
      </span>
    );
  });

  available = Object.values(ksort(available)).reverse();
  return (
    <div className="src_tabs">
      <MoreTab sources={available} />
      {tabs}
    </div>
  );
}

function MoreTab({ sources }) {
  var globalData = useContext(DataContext);
  var app = globalData.app;
var state = globalData.state;
  const [open, setOpen] = useState(false);

  function selectOption(e) {
    var shortcode = e.target.options[e.target.selectedIndex].attributes.value.value;
    var id = globalData.commentary.comIndex[state.commentary_verse_id][shortcode][0];

    if (shortcode === "top") return false;
    var new_order = state.commentary_order.slice(0);
    const index = new_order.indexOf(shortcode);
    if (index !== -1) {
      new_order.splice(index, 1);
    }
    new_order.unshift(shortcode);

    setOpen(false);
    app.setState(
      { commentary_order: new_order, commentarySource: shortcode, commentaryID: id },
      app.saveSettings.bind(app)
    );
  }

  if (open) {
    return (
      <select onChange={selectOption}>
        <option value="top">⋯</option>
        {sources.map((source, key) => {
          return (
            <option key={key} value={source.shortcode}>
              {" "}
              ⤷ [{source.year}] {source.name}
            </option>
          );
        })}
      </select>
    );
  }

  return (
    <span
      className="more"
      onMouseEnter={() => setOpen(true)}
      onClick={() => setOpen(true)}
    >
      ⋯
    </span>
  );
}

function CommentaryContent() {
  var globalData = useContext(DataContext);
  var app = globalData.app;
var state = globalData.state;
  const [, setLoaded] = useState(null);

  var id = state.commentaryID;
  var item = globalData.commentary.comData[id];

  if (item === undefined || item === null)
    return <CommentaryContentLoading setLoaded={setLoaded} item={item} />;
  return <CommentaryContentLoaded setLoaded={setLoaded} item={item} />;
}

function CommentaryContentLoaded({ setLoaded, item: loadedItem }) {
  var globalData = useContext(DataContext);
  var app = globalData.app;
var state = globalData.state;

  function setCommentaryRange(item) {
    var range = [];
    for (var i = item.verse_id; i < item.verse_id + item.verse_count; i++) range.push(i);
    app.setState({ commentary_verse_range: range });
  }

  function preloadNext(item) {
    var thisid = item.id;
    var list = Object.keys(globalData.commentary.idIndex);
    var index = list.indexOf(thisid.toString());
    var new_id = list[index + 1];

    if (list.indexOf(new_id) === -1) return false;
    if (globalData.commentary.comData[new_id] !== undefined) return false;
    globalData.commentary.comData[new_id] = null;

    var src = globalData.commentary.idIndex[new_id].source;

    var jsoner = function(response) {
      if (response.ok) {
        return response.json();
      } else {
        return null;
      }
    };
    var setter = function(data) {
      if (!data) return;
      globalData.commentary.comData[data.id] = data;
    };

    fetch(state.rootURL + "./com/" + src + "." + new_id + ".json")
      .then(jsoner)
      .then(setter)
      .then(app.setUrl.bind(app));
  }

  useEffect(() => {
    if (loadedItem === undefined) {
      setLoaded(false);
      return;
    }

    setLoaded(true);
    setCommentaryRange(loadedItem);
    preloadNext(loadedItem);
  }, [loadedItem ? loadedItem.id : null]);

  function move(val) {
    var thisid = state.commentaryID;
    var list = Object.keys(globalData.commentary.idIndex).map(Number);
    var index = list.indexOf(thisid);
    var new_id = list[index + val];
    if (list.indexOf(new_id) === -1) new_id = list[0];
    if (globalData.commentary.comData[new_id] === null) return false;

    var item = globalData.commentary.idIndex[new_id];
    var range = [];
    for (var i = item.verse_id; i < item.verse_id + item.verse_count; i++) range.push(i);
    if (range.length === 0) range = state.commentary_verse_range;
    var comData = globalData.commentary.comData[new_id];
    app.setState(
      {
        commentaryID: new_id,
        selected_verse_id: null,
        commentary_verse_range: range,
        commentarySource: item.source,
        commentary_verse_id: item.verse_ids[0]
      },
      function() {
        setLoaded(comData !== undefined);
      }
    );
  }

  var item = globalData.commentary.comData[state.commentaryID];
  if (item === undefined) return null;
  if (item.html === undefined) return null;

  var title = null;
  if (item.title.length > 0) title = <div className="title">{item.title}</div>;
  var range = [];
  for (var i = item.verse_id; i < item.verse_id + item.verse_count; i++) range.push(i);

  return (
    <div>
      <h3>
        <button type="button" className="linklike prev" id="com_prev"
                aria-label="Previous commentary" onClick={() => move(-1)}>
          ⇦
        </button>
        <button type="button" className="linklike next" id="com_next"
                aria-label="Next commentary" onClick={() => move(1)}>
          ⇨
        </button>
        <CommentaryTagLink reference={"Isaiah " + item.reference} verses={range} />
      </h3>
      <img alt="source" className="ver" src={require("../img/commentaries/" + item.source + ".jpg")} />
      {title}
      {Parser(item.html, {
        replace: commentaryReplacer(app, { SGLink, CommentaryTagLink })
      })}
    </div>
  );
}

function CommentaryTagLink({ reference, verses }) {
  var globalData = useContext(DataContext);
  var app = globalData.app;
var state = globalData.state;

  function previewVerses() {
    app.setState({ highlighted_tagged_verse_range: verses });
  }

  function clearVerses() {
    app.setState({ highlighted_tagged_verse_range: [] });
  }

  function lookupVerses() {
    if (verses.length === 0) return false;

    if (verses.length === 1) {
      app.setState(
        {
          searchMode: false,
          selected_tag: null,
          selected_verse_id: null,
          highlighted_tagged_verse_range: [],
          comSearchMode: false
        },
        app.setActiveVerse.bind(app, verses[0], undefined, undefined, undefined, "versebox")
      );
    } else {
      app.setState(
        {
          searchMode: true,
          selected_tag: null,
          selected_verse_id: null,
          searchQuery: null,
          comSearchMode: true,
          highlighted_tagged_verse_range: [],
          highlighted_verse_range: verses
        },
        app.setActiveVerse.bind(app, verses[0], undefined, undefined, undefined, "versebox")
      );
    }
  }

  return (
    <span
      className="isa"
      onMouseEnter={previewVerses}
      onMouseLeave={clearVerses}
      onClick={lookupVerses}>
      {reference}
    </span>
  );
}

function CommentaryContentLoading({ setLoaded, item }) {
  var globalData = useContext(DataContext);
  var app = globalData.app;
var state = globalData.state;

  function loadContent() {
    var comid = state.commentaryID;
    if (comid === null) comid = app.loadCommentaryID();
    if (item !== undefined) return false;
    if (globalData.commentary.comData[comid] !== undefined) return false;
    globalData.commentary.comData[comid] = null;

    var jsoner = function(response) {
      if (response.ok) {
        return response.json();
      } else {
        return null;
      }
    };
    var setter = function(data) {
      if (!data) return;
      globalData.commentary.comData[data.id] = data;
      setLoaded(true);
      app.setState({ commentaryID: data.id });
    };
    if (globalData.commentary.idIndex[comid] === undefined) return false;
    var src = globalData.commentary.idIndex[comid].source;
    fetch(state.rootURL + "./com/" + src + "." + comid + ".json")
      .then(jsoner)
      .then(setter)
      .then(app.setUrl.bind(app));
  }

  useEffect(() => {
    loadContent();
    app.setState({ commentary_verse_range: [] }, loadContent);
  }, [state.commentaryID]);

  return (
    <div>
      <h3>Loading...</h3>
      <div className="title">
        <img alt="source" className="loading" src={require("../img/interface/book.gif")} />
      </div>
    </div>
  );
}
