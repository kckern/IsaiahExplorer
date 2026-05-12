import React, {Component, useContext} from "react"
import pako from "pako"
import atob from "atob"
import settings_icon from "./img/interface/settings.png"
import video_icon from "./img/interface/video.png"
import StructureColumn from "./Components/Structure.js"
import SectionColumn from "./Components/Section.js"
import PassageColumn from "./Components/Passage.js"
import VerseColumn from "./Components/Verse.js"
import Audio from "./Components/Audio.js"
import Settings from "./Components/Settings/Settings.js"
import {TagFloater} from "./Components/Tags.js"
import {globalData} from "./globals.js"
import {DataContext} from "./DataContext"
import VideoBox from "./Components/VideoBox.js"
import Tipsy from "react-tipsy"
import isElectron from 'is-electron';


import { parseRoute, buildRoute } from "./routing/routeCodec"
import { getFocalTag } from "./state/tagSelectors"
import { TAG_PANEL, derivedTagMode, derivedInfoOpen } from "./state/tagPanel"
import { AUDIO_MODE, legacyAudioState, legacyCommentaryAudioMode, audioModeFromLegacy } from "./state/audioState"
import { Helmet } from "react-helmet"
import "./App.css"

class App extends Component {
  floater = {} 

  state = {
    ready: false,

    top_versions: [],
    top_outlines: [],
    top_structures: [],

    version: null,
    outline: null,
    structure: null,
    spot: null,
    spotHover: false,

    settings: null,

    mouseBlockIndex: null,
    selected_verse_id: null,
    active_verse_id: null,
    selected_tag: null,
    showcase_tag: null,
    previewed_tag: null,
    highlighted_heading_index: null,
    highlighted_section_index: null,
    highlighted_tagged_verse_range: [],
    highlighted_tagged_parent_verse_range: [],
    highlighted_verse_range: [],
    highlighted_section_verses: [],
    selected_tag_block_index: null,
    chiasm_letter: null,
    more_tags: false,

    tagPanel: TAG_PANEL.CLOSED,
    infoOpen: false,
    allCollapsed: false,
    tagMode: false,
    searchMode: false,
    comSearchMode: false,
    preSearchMode: false,
    searchQuery: null,

    hebrewReady: false,
    hebrewMode: false,
    hebrewStrongIndex: null,
    hebrewSearch: false,
    hebrewWord: 0,
    hebrewFax: false,

    arrowPointer: 0,

    version_views: 1,

    audioMode: AUDIO_MODE.IDLE,
    audioState: null,
    playbackRate: 1,
    audioPointer: 0,
    commentaryAudioMode: false,
    commentaryAudio: "gileadi",
    commentary_audio_verse_range: [],

    commentaryMode: false,
    commentarySource: "gileadi",
    commentaryID: null,
    commentary_verse_id: null,
    commentary_verse_range: [],
    commentary_order: [], 

    ui_version_loading: false,
    ui_core_loading: true,

    rootURL: window.location.href.replace(/((^file.*?)([^/]+$)|(^https*:\/\/[^/]+\/)(.*))/,"$2$4")

  }

  load_queue = ["core", "version"]
  pull(element) {
    const index = this.load_queue.indexOf(element)

    if (index !== -1) {
      this.load_queue.splice(index, 1)
    }
  }

  //preload images
  componentDidMount() {
    var img = new Image()
    img.src = require("./img/interface/book.gif")
    img.onload = this.initApp();
    
    if(window.innerWidth<1920)
    {
    	document.getElementsByTagName("body")[0].className = "narrow";
    }
  }

  componentWillMount() {
    document.addEventListener("keydown", this.keyDown.bind(this))

    // ELECTRON MENU FUNCTION
		if (isElectron()) {
			window.ipcRenderer.on('structure', (event, shortcode) => {
        this.setActiveStructure(shortcode);
      })
			window.ipcRenderer.on('outline', (event, shortcode) => {
        this.setActiveOutline(shortcode);
      })
			window.ipcRenderer.on('version', (event, shortcode) => {
        this.setActiveVersion(shortcode);
      })
      
    }
    


  }

  saveFloater(key, item) {
    this.floater[key] = item
    var fn = this.checkFloater.bind(this)
    fn()
  }

  IsSafari() {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  }

  render() {
    globalData.app = this
    globalData.state = this.state

    var settingsPanel = null
    if (this.state.settings === true)
      settingsPanel = [
        <div
          key="shader"
          className="shader"
          onClick={() => this.closeSettings()}
        />,
        <Settings key="settingbox" />
      ]
    else settingsPanel = null

    var videoPanel = null
    if (this.state.video === true)
      videoPanel = [
        <div
          key="shader"
          className="shader"
          onClick={() => this.closeVideo()}
        />,
        <VideoBox key="videobox" />
      ]
    else videoPanel = null

    var classes = []
    if (this.state.infoOpen === true) classes.push("infoOpen")
    if (this.state.commentaryMode === true) classes.push("commentaryMode")
    if (this.IsSafari()) classes.push("safari")

    var title = <span>Isaiah Explorer</span>

    var seo = this.getSeoData();

    return (
      <DataContext.Provider value={globalData}>
        <Helmet>
          <title>{seo.title}</title>
          <meta name="description" content={seo.description} />
          <link rel="canonical" href={seo.canonical} />
        </Helmet>
        <div id="approot" className={classes.join(" ")}>
          <h1>
            <Tipsy
              content="Settings"
              placement="left"
              trigger="hover focus touch"
              className="topper">
              <img
                alt="Settings"
                onClick={() => this.openSettings()}
                src={settings_icon}
                className="settings"
              />
            </Tipsy>
            {title}
            <Tipsy
              content="Video Tutorial"
              placement="right"
              trigger="hover focus touch"
              className="topper">
              <img
                alt="Video"
                onClick={() => this.openVideo()}
                src={video_icon}
                className="demo"
              />
            </Tipsy>
          </h1>
          <div className="wrapper">
            <StructureColumn />
            <SectionColumn />
            <VerseColumn />
            <PassageColumn />
          </div>
          {settingsPanel}
          {videoPanel}
          <TagFloater floater={this.floater} />
          <Audio />
        </div>
      </DataContext.Provider>
    )
  }

  getSettingsFromUrl(settings) {
    settings.active_verse_id = 17656
    var path = (this.props.location && this.props.location.pathname) || window.location.pathname;
    var parsed = parseRoute(path);

    if (parsed.structure !== undefined && globalData.meta.structure[parsed.structure] !== undefined)
      settings.structure = parsed.structure;
    if (parsed.outline !== undefined && globalData.meta.outline[parsed.outline] !== undefined)
      settings.outline = parsed.outline;
    if (parsed.version !== undefined && globalData.meta.version[parsed.version] !== undefined)
      settings.version = parsed.version;

    if (parsed.tag !== undefined) {
      settings.selected_tag = this.loadTagFromSlug(parsed.tag);
      var tagd = this.getTagData(settings.selected_tag);
      if (tagd) settings.active_verse_id = tagd.verses[0];
    }
    if (parsed.search !== undefined) {
      settings.searchQuery = parsed.search;
      settings.searchMode = false;
      settings.urlSearch = true;
    }
    if (parsed.hebrew !== undefined) {
      settings.hebrewStrongIndex = parsed.hebrew;
    }
    if (parsed.chapter !== undefined && parsed.verse !== undefined) {
      settings.active_verse_id = this.loadVerseId(parsed.chapter, parsed.verse);
    }
    if (parsed.commentarySource !== undefined) {
      settings.commentaryMode = true;
      settings.commentarySource = parsed.commentarySource;
      settings.commentary_verse_id = settings.active_verse_id;
      if (parsed.commentaryID !== undefined) settings.commentaryID = parsed.commentaryID;
    }

    return settings;
  }
  
  validateSettings(settings)
  {
  	//get default
  	
    //Check for non existent
    var g = globalData;
    
    	//structure
    	if(g.meta.structure[settings.structure]===undefined)
    		settings.structure = Object.keys(g.meta.structure)[0];
    	
    	//outline
    	if(g.meta.outline[settings.outline]===undefined)
    		settings.outline = Object.keys(g.meta.outline)[0];
    		
    	//version
    	if(settings.version===undefined)
    		settings.version = Object.keys(g.meta.version)[0];
    	if(g.meta.version[settings.version.toUpperCase()]===undefined)
    		settings.version = Object.keys(g.meta.version)[0];
    		
    	//commentary
    	if(g.meta.commentary[settings.commentarySource]===undefined)
    		settings.commentarySource = Object.keys(g.meta.commentary)[0];
    		
    	//audiocom
    	if(g.meta.audiocom[settings.commentaryAudio]===undefined)
    		settings.commentaryAudio = Object.keys(g.meta.audiocom)[0];
    		
			  
			//top_versions
			//top_outlines
			//top_structures
    
  	return settings;
  }

  loadVerseId(ch, vs) {
    var index = globalData.index
    for (var verse_id in index) {
      if (
        index[verse_id].chapter + ":" + index[verse_id].verse ===
        ch + ":" + vs
      )
        return parseInt(verse_id, 0)
    }
    return 17656
  }

  loadTagFromSlug(slug) {
    var index = globalData.tags.tagIndex
    for (var tagName in index) {
      if (index[tagName].slug === slug) return tagName
    }
    return null
  }

  getSeoData() {
    var idx = globalData.index && globalData.index[this.state.active_verse_id];
    var chapter = idx ? idx.chapter : "";
    var verse = idx ? idx.verse : "";
    var baseTitle = chapter ? "Isaiah " + chapter + ":" + verse : "Isaiah Explorer";
    var title = baseTitle;
    var description = "Read Isaiah " + chapter + ":" + verse + " in multiple translations with thematic tags, Hebrew lexicon, and scholarly commentary.";

    var activeTag = getFocalTag(this.state).tag;
    if (activeTag && globalData.tags && globalData.tags.tagIndex && globalData.tags.tagIndex[activeTag]) {
      title = activeTag + " | " + baseTitle;
      description = "Explore the theme “" + activeTag + "” in Isaiah.";
    } else if (this.state.searchQuery && !this.state.hebrewStrongIndex) {
      title = "“" + this.state.searchQuery + "” | Isaiah Explorer";
      description = "Isaiah Explorer search results for “" + this.state.searchQuery + "”.";
    } else if (this.state.hebrewStrongIndex) {
      title = "Hebrew H" + this.state.hebrewStrongIndex + " | Isaiah Explorer";
      description = "Study Hebrew word H" + this.state.hebrewStrongIndex + " in Isaiah.";
    } else if (this.state.commentaryMode && this.state.commentarySource &&
        globalData.commentary && globalData.commentary.comSources &&
        globalData.commentary.comSources[this.state.commentarySource]) {
      var sourceName = globalData.commentary.comSources[this.state.commentarySource].name;
      title = "Isaiah " + chapter + ":" + verse + " | " + sourceName;
      description = sourceName + " commentary on Isaiah " + chapter + ":" + verse + ".";
    }

    var getTagSlug = function(tagName) {
      var entry = globalData.tags && globalData.tags.tagIndex && globalData.tags.tagIndex[tagName];
      return entry ? entry.slug : null;
    };
    var canonical = window.location.origin + (idx ? buildRoute({
      structure: this.state.structure,
      outline: this.state.outline,
      version: this.state.version,
      chapter: chapter,
      verse: verse,
      showcase_tag: this.state.showcase_tag,
      selected_tag: this.state.selected_tag,
      searchQuery: this.state.searchQuery,
      hebrewStrongIndex: this.state.hebrewStrongIndex,
      commentaryMode: this.state.commentaryMode,
      commentarySource: this.state.commentarySource,
      commentaryID: this.state.commentaryID,
    }, getTagSlug) : "/");

    return { title: title, description: description, canonical: canonical };
  }

  setUrl(replace) {
    var idx = globalData.index[this.state.active_verse_id];
    var chapter = idx.chapter;
    var verse = idx.verse;

    var getTagSlug = function(tagName) {
      var entry = globalData.tags.tagIndex[tagName];
      return entry ? entry.slug : null;
    };

    var path = buildRoute({
      structure: this.state.structure,
      outline: this.state.outline,
      version: this.state.version,
      chapter: chapter,
      verse: verse,
      showcase_tag: this.state.showcase_tag,
      selected_tag: this.state.selected_tag,
      searchQuery: this.state.searchQuery,
      hebrewStrongIndex: this.state.hebrewStrongIndex,
      commentaryMode: this.state.commentaryMode,
      commentarySource: this.state.commentarySource,
      commentaryID: this.state.commentaryID,
    }, getTagSlug);

    var title = "";
    var activeTag = getFocalTag(this.state).tag;
    if (activeTag && globalData.tags.tagIndex[activeTag]) {
      title = activeTag + " | ";
    } else if (this.state.searchQuery && !this.state.hebrewStrongIndex) {
      var disQ = this.state.searchQuery
        .replace(/[-]+/g, "–")
        .replace(/[;]+/g, "; ")
        .replace(/[\\]b([a-z])/g, "｢$1")
        .replace(/([a-z])[\\]b/g, "$1｣");
      title = "“" + disQ + "” | ";
    } else if (this.state.hebrewStrongIndex !== null) {
      title = "Hebrew H" + this.state.hebrewStrongIndex + " | ";
    }

    title += "Isaiah " + chapter + ":" + verse;

    if (this.state.commentaryMode && this.state.commentarySource &&
        globalData.commentary.comSources[this.state.commentarySource]) {
      title = "Isaiah " + chapter + ":" + verse +
        " | " + globalData.commentary.comSources[this.state.commentarySource].name;
    }

    if (this.props.navigate && this.state.rootURL.match(/^file/) === null) {
      this.props.navigate(path, { replace: replace === true });
    }

    document.title = title;

    // Fire Clicky page-view on every navigation (SPA does not trigger automatic tracking)
    if (!replace && typeof window.clicky !== "undefined") {
      try { window.clicky.log("#" + path, title, "pageview"); } catch (e) {}
    }
  }

  initApp() {
    var settings = localStorage.getItem("settings")
    try {
      settings = JSON.parse(settings)
    } catch (e) {
      settings = {}
    }
    if (settings === null) settings = {}

    if (settings.top_versions === undefined) settings.top_versions = []
    if (settings.top_outlines === undefined) settings.top_outlines = []
    if (settings.top_structures === undefined) settings.top_structures = []

    if (settings.top_versions.length !== 5 || settings.top_versions.indexOf("HBRS")>=0)
      settings.top_versions = ["KJV", "IINST", "NRSV", "NIV", "NASB"]
    if (settings.top_outlines.length !== 5)
      settings.top_outlines = ["chapters", "mev", "nrsv", "niv", "nasb"]
    if (settings.top_structures.length !== 5 || settings.top_structures.indexOf("bifid")>=0)
      settings.top_structures = [
        "whole",
        "bibleproject",
        "7part",
        "authorship",
        "wikipedia"
      ]

    if (settings.version === undefined || settings.version === null)
      settings.version = settings.top_versions[0]
    if (settings.outline === undefined || settings.outline === null)
      settings.outline = settings.top_outlines[0]
    if (settings.structure === undefined || settings.structure === null)
      settings.structure = settings.top_structures[0]

    if (
      settings.commentary_order === undefined ||
      settings.commentary_order === null
    )
      settings.commentary_order = []
    if (settings.commentary_order.length > 0)
      settings.commentarySource = settings.commentary_order[0]

    // Apply any URL overrides from pathname using the route codec
    var initParsed = parseRoute(window.location.pathname);
    if (initParsed.version !== undefined && initParsed.version.length > 1)
      settings.version = initParsed.version;
    if (initParsed.search !== undefined) {
      settings.searchQuery = initParsed.search;
      settings.searchMode = false;
      settings.urlSearch = true;
    }
    if (initParsed.hebrew !== undefined)
      settings.hebrewStrongIndex = initParsed.hebrew;


    this.setState(settings, function() {
      this.saveSettings()
      this.loadCore()
      this.checkZoom()
    })
  }

  checkLoaded() {
    if (this.load_queue.length === 0) {
      var settings = {ready: true}
      settings = this.getSettingsFromUrl(settings)

      var callback = this.setActiveVerse.bind(
        this,
        settings.active_verse_id,
        undefined,
        undefined,
        true,
        "init"
      )
      if (settings.selected_tag !== undefined && settings.selected_tag !== null)
        callback = this.setActiveTag.bind(this, settings.selected_tag, true)
      if (settings.searchQuery !== undefined && settings.searchQuery !== null)
        callback = this.search.bind(this, settings.searchQuery, true)
      if (settings.hebrewStrongIndex !== undefined)
        callback = this.searchHebrewWord.bind(
          this,
          settings.hebrewStrongIndex,
          true
        )
      //var g = globalData;   debugger;

      this.setState(this.validateSettings(settings), callback) // 17656
    }
  }

  keyDown(e) {
    if (typeof e.keyCode !== "number") return false
    if (e.ctrlKey) return false
    if (e.metaKey) return false
    if (e.keyCode === 27) {
      if (this.state.audioState !== null) return false
      this.clearTag()
      return false
    }
    if (
      document.getElementById("searchbox") === document.activeElement &&
      [37, 39, 35, 36, 46, 9].indexOf(e.keyCode) !== -1
    )
      return false

    if (e.keyCode === 13) {
      e.preventDefault()
      if (this.state.selected_verse_id === null) {
        this.selectVerse(this.state.active_verse_id)
      } else {
        this.selectVerse(null)
      }
    }

    if (e.keyCode === 37) {
      e.preventDefault()
      return this.left()
    }
    if (e.keyCode === 38) {
      e.preventDefault()
      return this.up()
    }
    if (e.keyCode === 39) {
      e.preventDefault()
      return this.right()
    }
    if (e.keyCode === 40) {
      e.preventDefault()
      return this.down()
    }

    //page up/down: cycle versions
    if (e.keyCode === 33 || e.keyCode === 219) {
      e.preventDefault()
      return this.cycleVersion(-1)
    }
    if (e.keyCode === 34 || e.keyCode === 221) {
      e.preventDefault()
      return this.cycleVersion(1)
    }
    //home end: cycle outlines
    if (e.keyCode === 36) {
      e.preventDefault()
      return this.cycleOutline(-1)
    }
    if (e.keyCode === 35 || e.keyCode === 222) {
      e.preventDefault()
      return this.cycleOutline(1)
    }
    //ins/del: cycle structures
    if (e.keyCode === 45) {
      e.preventDefault()
      return this.cycleStructure(-1)
    }
    if (e.keyCode === 46) {
      e.preventDefault()
      return this.cycleStructure(1)
    }

    //tab: move to next section
    if (e.keyCode === 9) {
      e.preventDefault()
      return this.cycleSection(1)
    }

    //tilda opens commentary
    if (e.keyCode === 192) {
      e.preventDefault()
      return this.clickElementID("commentary")
    }

    //TAGS
    //plus: cycle
    if (e.keyCode === 107 || e.keyCode === 187) {
      e.preventDefault()
      return this.cycleTag(1)
    }

    //minus toggle
    if (e.keyCode === 111) {
      e.preventDefault()
      if (this.state.tagMode) return this.clearTag()
      else {
        var recent =
          globalData["tags"]["parentTagIndex"]["Recently Viewed Tags"]
        if (recent === undefined) return this.showcaseTag(null)
        return this.setActiveTag(recent[recent.length - 1])
      }
    }
    //Numbkey nimus hebrew
    if (e.keyCode === 106) {
      e.preventDefault()
      if (!this.state.hebrewFax && this.state.hebrewMode)
        return this.clickElementID("seefax")
      return this.clickElementID("hebIcon")
    }

    if (e.keyCode === 32 && this.state.commentaryAudioMode) {
      e.preventDefault()
      return this.setAudioMode(
        this.state.audioMode,
        this.clickElementID("audio_commentary")
      )
    }
    if (
      e.keyCode === 32 &&
      !this.state.searchMode &&
      !this.state.preSearchMode
    ) {
      e.preventDefault()
      return this.clickElementID("audio_verse")
    }

    if (
      !this.state.preSearchMode &&
      !this.state.searchMode &&
      e.keyCode >= 65 &&
      e.keyCode <= 90
    ) {
      this.setState({preSearchMode: true})
    }
    if (
      (e.keyCode >= 48 && e.keyCode <= 57) ||
      (e.keyCode >= 96 && e.keyCode <= 105) ||
      [110, 190, 186].indexOf(e.keyCode) !== -1
    ) {
      this.setState({preSearchMode: true, refSearch: true})
    }
  }

  clickElementID(id) {
    var el = document.getElementById(id)
    if (el === null) return false
    el.click()
  }

  cycleSection(incr) {
    if (incr === undefined) incr = 1
    var index = parseInt(this.state.highlighted_section_index, 0) + incr
    if (index > globalData["structures"][this.state.structure].length - 1)
      index = 0
    if (globalData["structures"][this.state.structure][index] === undefined)
      return false
    var verse =
      globalData["structures"][this.state.structure][index].verses[0][0]
    this.setActiveVerse(verse, undefined, undefined, undefined, "arrow")
  }
  cycleHeading(incr) {
    if (incr === undefined) incr = 1
    var index = parseInt(this.state.highlighted_heading_index, 0) + incr
    if (index > globalData["outlines"][this.state.outline].length - 1) index = 0
    if (globalData["outlines"][this.state.outline][index] === undefined)
      return false
    var verse = globalData["outlines"][this.state.outline][index].verses[0]
    this.setActiveVerse(verse, undefined, undefined, undefined, "arrow")
  }

  cycleTag(incr) {
    this.moreTags()
    var el = document.querySelectorAll(".tag_highlighted+.taglink")[0]
    if (el === undefined) el = document.querySelectorAll(".taglink")[0]
    el.click()
  }

  cycleVersionViews() {
    var i = this.state.version_views + 1
    if (i > 5) i = 1
    this.setState({version_views: i}, this.saveSettings.bind(this))
  }

  cycleHebrewWord(incr) {
    var el
    if (incr === 1)
      el = document.querySelectorAll(
        "#hebrew_text span.active + span.space + span"
      )[0]
    else {
      el = document.querySelectorAll("#hebrew_text span.active")[0]
      if (el === undefined || el === null) return false
      if (
        el.previousElementSibling === undefined ||
        el.previousElementSibling === null
      )
        return false
      if (typeof el === "object")
        el = el.previousElementSibling.previousElementSibling
    }
    if (typeof el !== "object")
      el = document.querySelectorAll("#hebrew_text span")[0]
    el.click()
  }

  left() {
    //if hebrew
    if (this.state.hebrewMode) return this.cycleHebrewWord(-1)
    //if commentary hit next commentary button
    if (this.state.commentaryMode) return this.clickElementID("com_prev")
    //if tag, hit next tag button
    if (this.state.selected_tag !== null || this.state.tagMode) this.tagLeft()
    //if search do nothing
    if (this.state.searchMode) return false
    //if playing commentary
    if (this.state.commentaryAudioMode) return this.up()
    //if normal move outline
    this.cycleHeading(-1)
  }

  up() {
    if (this.state.showcase_tag !== null) return this.tagUp()

    var index = -1
    var prev = 0
    for (
      var pointer = this.arrowPointer;
      index === -1 && pointer >= 0;
      pointer--
    )
      index = this.state.highlighted_verse_range.indexOf(
        this.state.active_verse_id,
        pointer
      )
    index--
    if (index < 0) index = this.state.highlighted_verse_range.length - 1
    prev = this.state.highlighted_verse_range[index]
    this.arrowPointer = index
    if (this.state.selected_verse_id !== null) return this.selectVerse(prev,"arrow")
    this.setActiveVerse(prev, undefined, undefined, true, "arrow")
  }

  right() {
    //if hebrew
    if (this.state.hebrewMode) return this.cycleHebrewWord(1)
    //if commentary hit next commentary button
    if (this.state.commentaryMode) return this.clickElementID("com_next")

    if (
      this.state.previewed_tag !== null &&
      this.state.showcase_tag === null &&
      this.state.tagMode
    )
      return this.showcaseTag("Structures")
    //if tag, hit next tag button
    if (this.state.selected_tag !== null || this.state.tagMode)
      return this.tagRight()
    //if search do nothing
    if (this.state.searchMode) return false
    //if playing commentary
    if (this.state.commentaryAudioMode) return this.down()
    //if normal move outline
    this.cycleHeading(1)
  }

  tagDown() {
    var list = Array.prototype.slice
      .call(document.querySelectorAll(".parentTag"))
      .map(function(e) {
        return e.innerText
      })
    var i = list.indexOf(this.state.showcase_tag)
    if (list[i + 1] === undefined) return this.showcaseTag("Structures")
    this.showcaseTag(list[i + 1])
  }

  tagUp() {
    var list = Array.prototype.slice
      .call(document.querySelectorAll(".parentTag"))
      .map(function(e) {
        return e.innerText
      })
    var i = list.indexOf(this.state.showcase_tag)
    if (list[i - 1] === undefined) return this.showcaseTag("Structures")
    this.showcaseTag(list[i - 1])
  }

  tagRight() {
    if (!this.state.tagMode && document.getElementById("tag_next") !== null)
      return this.clickElementID("tag_next")
    var g = globalData
    if (this.state.tagMode) {
      var r = g.tags.parentTagIndex["Recently Viewed Tags"]
      if (r === undefined) r = ["root"]
      var c = g.tags.tagChildren[this.state.showcase_tag]
      if (g.tags.tagIndex[this.state.showcase_tag] === undefined) return false

      if (r[0] === c[c.length - 1]) {
        //go to sibling
        var sibling = this.findTagSibling(this.state.showcase_tag, 1)
        this.setActiveTag(sibling)
      } else {
        //go to first child
        this.setActiveTag(c[0])
      }
    } else {
      var parent = g.tags.tagIndex[this.state.selected_tag].parents[0]
      this.showcaseTag(parent)
    }
  }
  tagLeft() {
    if (!this.state.tagMode && document.getElementById("tag_prev") !== null)
      return this.clickElementID("tag_prev")
    var g = globalData
    if (this.state.tagMode) {
      this.tagUp()
    } else {
      var parent = g.tags.tagIndex[this.state.selected_tag].parents[0]
      this.showcaseTag(parent)
    }
  }

  findTagSibling(tag, pos) {
    var g = globalData
    if (g.tags.tagIndex[tag] === undefined) return "Structures"
    var p = g.tags.tagIndex[tag].parents[0]
    var ss = g.tags.tagSiblings[p]
    var index = ss.indexOf(tag)
    var s = ss[index + pos]
    if (s === undefined) return this.findTagSibling(p, pos)
    return s
  }

  arrowPointer = 0
  down() {
    if (
      this.state.previewed_tag !== null &&
      this.state.showcase_tag === null &&
      this.state.tagMode
    )
      return this.showcaseTag("Structures")

    if (this.state.showcase_tag !== null) return this.tagDown()



    var index = -1
    var next = 0
    for (
      var pointer = this.arrowPointer;
      index === -1 && pointer >= 0;
      pointer--
    )
      index = this.state.highlighted_verse_range.indexOf(
        this.state.active_verse_id,
        pointer
      )
    index++
    if (index >= this.state.highlighted_verse_range.length) index = 0
    next = this.state.highlighted_verse_range[index]
    this.arrowPointer = index
    if (this.state.selected_verse_id !== null) return this.selectVerse(next,"arrow")
    this.setActiveVerse(next, undefined, undefined, undefined, "arrow")
  }

  setTagBlock(key, verseId) {
    this.setState({selected_tag_block_index: key}, function() {
      this.checkFloater()
      this.setActiveVerse(verseId, undefined, undefined, undefined, "tag")
    })
  }

  processRef(q) {
    var matches = []

    //split by semicolon
    var colon_segs = q.split(/\s*;\s*/g)

    //determine if chapter or not by .:
    for (var x in colon_segs) {
      var ref = colon_segs[x]
      var chapter = true
      if (ref.match(/[.:]/) === null) chapter = false
      
      //fill range into commas
      ref = ref.replace(/([0-9]+)-([0-9]+)/g, function replacer(
        match,
        p1,
        p2,
        offset,
        string
      ) {
      	p1 = parseInt(p1,0);
      	p2 = parseInt(p2,0);
        var vs = []
        for (var i = p1; i <= p2; i++) {
          vs.push(i)
        }
        return vs.join(",")
      })

      var g = globalData
      if (chapter) {
        var parts = ref.match(/(.*?)[.:](.*)/)
        var ch = parseInt(parts[1], 0)
        var vs = parts[2].split(/\s*,\s*/g)
        for (x in vs) {
          var v = parseInt(vs[x], 0)
          for (var verse_id in g.index) {
            if (
              g.index[verse_id].chapter === ch &&
              g.index[verse_id].verse === v
            )
              matches.push(parseInt(verse_id, 0))
          }
        }
        //console.log("chapter with vs",ch,vs,matches);
      } else {
        var chs = ref.split(/\s*,\s*/g)
        for (x in chs) {
          ch = parseInt(chs[x], 0)
          for (verse_id in g.index) {
            if (g.index[verse_id].chapter === ch)
              matches.push(parseInt(verse_id, 0))
          }
        }
        //console.log("chapter range", chs, matches)
      }
    }

    return matches
  }

  search(query) {
    var matches = []
    if (query === undefined || query === null) query = ""
    query = query.replace(/[[\]]/g, "");
    query = query.replace(/\//g, "\\b");
    var refSearch = this.state.refSearch

    var numreg = new RegExp("[0-9:.;, —–−–-]+$")

    if (query.match(numreg)) {
      var q = query.replace(/^[^0-9:.;, —–−–-]+/gi, "")
      q = q.replace(/\s*/g, "")
      q = q.replace(/[—–−–-]+/g, "-")
      q = q.replace(/[^0-9]+$/g, "")
      q = q.replace(/^[^0-9]/g, "")
      q = q.replace(/[^0-9,.;:-]+/g, ";")
      q = q.replace(/[;]+/g, ";")
      matches = this.processRef(q)
      refSearch = true
      query = q
    } else {
      var regex = new RegExp("" + query + "", "igm")
      for (var x in globalData["text"][this.state.version]) {
        if (globalData["text"][this.state.version][x].text.match(regex)) {
          matches.push(parseInt(x, 0))
        }
      }
    }
    this.setTagPanel(TAG_PANEL.CLOSED)
    this.setState(
      {
        highlighted_verse_range: matches,
        selected_tag: null,
        preSearchMode: false,
        refSearch: refSearch,
        showcase_tag: null,
        previewed_tag: null,

        highlighted_tagged_verse_range: [],
        highlighted_tagged_parent_verse_range: [],
        searchMode: true,
        searchQuery: query
      },
      function() {
        if (matches.length >= 1) this.setActiveVerse(matches[0])
        //something after
      }
    )
  }

  spotVerse(shortcode) {
    this.setState({spot: shortcode}, function() {
      //	this.spreadVerse();
    })
  }
  spotDone(shortcode) {
    this.setState({spot: null}, function() {
      //	this.spreadVerse();
    })
  }
  reOrderSwap() {
    this.setState({spotHover: false})
  }
  freezeSwap() {
    this.setState({spotHover: true})
  }
  
  doubleClickVerse(verse_id, src)
  {
  	
    if (this.state.commentaryMode) {
      this.setState(
        {commentaryID: this.loadCommentaryID(), commentary_verse_id: verse_id},
        () => this.selectVerse(verse_id, src)
      )
      return true
    }
    else
    {
    	this.setState({commentaryMode:false},this.unSelectVerse.bind(this));
    }
  }

  selectVerse(verse_id, src) {
  //	console.log("Select Verse");
    if (verse_id === null) return this.unSelectVerse()
    //if searchmode and not in
    if (
      this.state.highlighted_verse_range.indexOf(parseInt(verse_id, 0)) < 0 &&
      (this.state.searchMode || this.state.selected_tag !== null)
    ) {
      return this.clearTag(undefined, verse_id)
    }

    //if(verse_id === this.state.active_verse_id) return false;
    if (this.state.commentaryMode && false) {
      this.setState(
        {commentaryID: this.loadCommentaryID(), commentary_verse_id: verse_id},
        () => this.setActiveVerse(verse_id, undefined, undefined, true)
      )
      return true
    }
    
    if (
      this.state.audioState !== null &&
      verse_id !== this.state.active_verse_id &&
      !this.state.commentaryAudioMode
    ) {
      this.setActiveVerse(verse_id, undefined, undefined, true, "audio")
      return true
    }
    


    if (parseInt(this.state.selected_verse_id, 0) === parseInt(verse_id, 0))
      return this.unSelectVerse()
    if (
      this.state.selected_tag !== null &&
      this.state.highlighted_verse_range.indexOf(parseInt(verse_id, 0)) < 0
    )
      return () => {}
    this.setState({selected_verse_id: verse_id}, () =>
      this.setActiveVerse(verse_id, undefined, undefined, true, src)
    )
  }
  unSelectVerse() {
    this.setState({selected_verse_id: null})
  }

  openSettings() {
    this.setState({settings: true})
  }

  openVideo() {
    this.setState({video: true})
  }
  closeVideo() {
    this.setState({video: false})
  }
  closeSettings() {
    this.setState({settings: false})
  }

  saveSettings() {
    let settings = {
      version: this.state.version,
      outline: this.state.outline,
      structure: this.state.structure,
      top_versions: this.state.top_versions,
      top_outlines: this.state.top_outlines,
      top_structures: this.state.top_structures,
      version_views: this.state.version_views,
      commentary_order: this.state.commentary_order
    };
    localStorage.setItem(
      "settings",
      JSON.stringify(settings)
    );

	if(isElectron()) window.ipcRenderer.send('saveSettings',settings);
  }

  setNewTop(list, value, new_index) {
    var tops = this.state[list].slice(0)
    var old_index = tops.indexOf(value)
    if (old_index >= 0) tops.splice(old_index, 1)
    var saveme = {}
    tops.splice(new_index, 0, value)
    saveme[list] = tops.slice(0, 5)
    this.setState(saveme, function() {
      this.saveSettings()
      this.loadTopVersions()
    })
  }

  spreadVerse() {
    var text = document.getElementById("verse_text")
    if (text === null) return false
    var container = document
      .getElementById("verse")
      .querySelectorAll(".verse_container")[0]
    var box_height = container.offsetHeight
    var line_height = 0.9
    text.style.lineHeight = line_height + "em"
    while (box_height - text.offsetHeight > 15) {
      var incr = 0.1
      if (box_height - text.offsetHeight < 0) incr = -0.1
      line_height = line_height + incr
      text.style.lineHeight = line_height + "em"
      if (line_height > 3) break
    }
    this.spreadHebrew()
  }
  spreadHebrew() {
    var text = document.getElementById("hebrew_text")
    if (text === null) return false
    var container = document
      .getElementById("verse")
      .querySelectorAll("#hebrew_text_box")[0]
    var box_height = container.offsetHeight
    var line_height = 0.9
    text.style.lineHeight = line_height + "em"
    while (box_height - text.offsetHeight > 40) {
      var incr = 0.1
      if (box_height - text.offsetHeight < 0) incr = -0.1
      line_height = line_height + incr
      text.style.lineHeight = line_height + "em"
      if (line_height > 3) break
    }
  }

  spreadOutline() {
    var outline = document.getElementById("outline")
    var grids = outline.querySelectorAll(".heading_grid")
    if (grids[0] === undefined) return false
    var count = grids.length
    var sum_height = 0
    for (var i = 0; i < count; i++) {
      sum_height += grids[i].offsetHeight
    }
    var box_height = outline.getBoundingClientRect().height
    var hs = outline.querySelectorAll("h4,h5")
    for (var x = 0; x <= hs.length; x++)
      box_height = box_height - this.outerHeight(hs[x])
    var val = (box_height - sum_height - 10) / count
    if (box_height < sum_height) {
      val = 0
    }
    for (i = 0; i < count; i++) {
      grids[i].style.marginBottom = val + "px"
    }
  }

  outerHeight(el) {
    if (el === undefined) return 0
    var height = el.offsetHeight
    var style = getComputedStyle(el)

    height += parseInt(style.marginTop, 0) + parseInt(style.marginBottom, 0)
    return height + 0
  }

  tagOverflow() {
    if (this.state.more_tags === true) return false
    var text = document.getElementById("verse")
    if (text === null) return false
    var tagbox = text.querySelectorAll(".verse_info_box.tags")[0]
    if (tagbox === undefined) return false

    tagbox.className = "verse_info_box tags"
    if (tagbox.offsetHeight > 100) {
      tagbox.className = "verse_info_box tags oversize"
    } else {
      tagbox.className = "verse_info_box tags regular"
    }
  }

  moreTags() {
    if (this.state.more_tags === true) return false
    var text = document.getElementById("verse")
    if (text === null) return false
    var tagbox = text.querySelectorAll(".verse_info_box.tags")[0]
    if (tagbox === undefined) return false
    tagbox.className = "verse_info_box tags"
    this.setState({more_tags: true})
  }

  loadCustoms(key, data) {
    if (data === undefined) return {}

    if (data[key] === undefined) key = "default"
    var output
    if (data[key].base !== undefined) {
      output = this.loadCustoms(data[key].base, data)
      //add extras
      for (var x in data[key]) {
        if (Array.isArray(data[key][x])) {
          if (output[x] === undefined) output[x] = data[key][x]
          else output[x] = output[x].concat(data[key][x])
        }
      }
    } else {
      output = data[key]
    }

    return output
  }

  loadCore() {

    if(["DOCUMENTS","CONTENTS"].indexOf(this.state.version) >=0)
    {
      return this.setState({version: this.state.top_versions[0]},this.loadCore.bind(this));
    }

    this.lastTags = []
    this.lastVerseId = null

    if (parseRoute(window.location.pathname).hebrew !== undefined)
      this.load_queue.push("hebrew")

    var subsite = "default"
    var arr = window.location.host.match(/^(.*?).isaiah/)
    if (arr !== null) subsite = arr[1]

    //if (subsite === "dev") subsite = "spu"
    
    fetch(this.state.rootURL+"./core/core.txt")
      .then(response => response.text())
      .then(data => {
        var unzipped = this.unzipJSON(data)
        for (var k in unzipped) globalData[k] = unzipped[k]

        var s = this.state

        //CUSTOMIZE
        var c = this.loadCustoms(subsite, globalData["custom"])

        if (c.type === "blacklist")
          for (var key in c) {
            if (!Array.isArray(c[key])) continue
            for (var y in c[key]) {
              var shortcode = c[key][y]
              if (key === "com") {
                //comIndex
                for (var verse_id in globalData.commentary.comIndex)
                  delete globalData.commentary.comIndex[verse_id][shortcode]
                //comOrder
                var index = globalData.commentary.comOrder.indexOf(shortcode)
                globalData.commentary.comOrder.splice(index, 1)
                //comOrder
                delete globalData.commentary.comSources[shortcode]
                delete globalData.meta.commentary[shortcode]
              }
              if (key === "comaudio") {
                delete globalData.commentary_audio.files[shortcode]
                delete globalData.meta.audiocom[shortcode]
              }
              if (key === "version") {
                delete globalData.meta.version[shortcode.toUpperCase()]
                index = s.top_versions.indexOf(shortcode)
                if (index >= 0) s.top_versions.splice(index, 1)
              }
              if (key === "outline") {
                delete globalData.meta.outline[shortcode]
                delete globalData.outlines[shortcode]
                index = s.top_outlines.indexOf(shortcode)
                if (index >= 0) s.top_outlines.splice(index, 1)
              }
              if (key === "structure") {
                delete globalData.meta.structure[shortcode]
                delete globalData.structures[shortcode]
                index = s.top_structures.indexOf(shortcode)
                if (index >= 0) s.top_structures.splice(index, 1)
              }
              if (key === "tag") {
                var list = [shortcode]
                var children = globalData.tags.tagChildren[shortcode]
                if (Array.isArray(children)) list = list.concat(children)
                for (var a in list) {
                  var tagName = list[a]
                  for (verse_id in globalData.tags.verseTagIndex) {
                    index = globalData.tags.verseTagIndex[verse_id].indexOf(
                      tagName
                    )
                    if (index >= 0)
                      globalData.tags.verseTagIndex[verse_id].splice(index, 1)
                  }
                  for (var parentTag in globalData.tags.tagChildren) {
                    index = globalData.tags.tagChildren[parentTag].indexOf(
                      tagName
                    )
                    if (index >= 0)
                      globalData.tags.tagChildren[parentTag].splice(index, 1)
                  }

                  for (parentTag in globalData.tags.parentTagIndex) {
                    index = globalData.tags.parentTagIndex[parentTag].indexOf(
                      tagName
                    )
                    if (index >= 0)
                      globalData.tags.parentTagIndex[parentTag].splice(index, 1)
                  }

                  for (var sibTag in globalData.tags.tagIndex) {
                    if (globalData.tags.tagIndex[sibTag].prev === tagName)
                      delete globalData.tags.tagIndex[sibTag].prev
                    if (globalData.tags.tagIndex[sibTag].next === tagName)
                      delete globalData.tags.tagIndex[sibTag].next
                  }

                  delete globalData.tags.tagIndex[tagName]
                  delete globalData.tags.tagStructure[tagName]
                  delete globalData.tags.tagChildren[tagName]
                  delete globalData.tags.superRefs[tagName]
                  delete globalData.tags.parentTagIndex[tagName]
                }
              }
            }
          }

        // META
		

        var m = globalData["meta"]
        //console.log(m);
        if (m.version[s.top_versions[0]] === undefined) {
          var t = s.top_versions
          t[0] = "KJV"
          this.setState(
            {top_versions: t},
            this.setActiveVersion.bind(this, "KJV")
          )
        }

        //Image Preloading
        new Image().src = require("./img/interface/version_loading.gif")
        Object.keys(globalData["meta"]["version"]).map(version => {
          return (new Image().src = require("./img/versions/" +
            version.toLowerCase() +
            ".jpg"))
        })

        //STRUCTURES

        var structures = globalData["structures"]
        for (var structure_id in structures) {
          for (var i in structures[structure_id]) {
            for (var seg in structures[structure_id][i].verses) {
              structures[structure_id][i].verses[seg] = this.verseDatatoArray(
                structures[structure_id][i].verses[seg]
              )
              for (var j in structures[structure_id][i].verses[seg]) {
                var verse = structures[structure_id][i].verses[seg][j]
                if (!(verse in globalData["structureIndex"])) {
                  globalData["structureIndex"][verse] = {}
                }
                globalData["structureIndex"][verse][structure_id] = i
              }
            }
          }
        }

        //OUTLINES

        var outlines = globalData["outlines"]
        for (var outline_id in outlines) {
          for (i in outlines[outline_id]) {
            globalData["outlines"][outline_id][i].verses = outlines[outline_id][
              i
            ].verses = this.verseDatatoArray(outlines[outline_id][i].verses) //convert to
            for (j in outlines[outline_id][i].verses) {
              verse = outlines[outline_id][i].verses[j]
              if (!(verse in globalData["outlineIndex"])) {
                globalData["outlineIndex"][verse] = {}
              }
              globalData["outlineIndex"][verse][outline_id] = i
            }
          }
        }

        // COM AUDIO

        globalData.commentary_audio["index"] = {}
        var dirs = globalData.commentary_audio.files
        for (shortcode in dirs) {
          for (var filename in dirs[shortcode]) {
            var verses = this.verseDatatoArray(dirs[shortcode][filename])
            dirs[shortcode][filename] = verses
            for (var x in verses) {
              if (globalData.commentary_audio.index[verses[x]] === undefined)
                globalData.commentary_audio.index[verses[x]] = {}
              if (
                globalData.commentary_audio.index[verses[x]][shortcode] ===
                undefined
              )
                globalData.commentary_audio.index[verses[x]][shortcode] = []
              globalData.commentary_audio.index[verses[x]][shortcode].push(
                filename
              )
            }
          }
        }

        // COMMENTARY

        globalData.commentary["idIndex"] = {}
        var comIndex = globalData.commentary.comIndex

        for (verse_id in comIndex) {
          for (var source in comIndex[verse_id]) {
            for (i in comIndex[verse_id][source]) {
              var thisid = comIndex[verse_id][source][i]
              if (globalData.commentary.idIndex[thisid] === undefined)
                globalData.commentary.idIndex[thisid] = {
                  source: null,
                  verse_ids: []
                }
              globalData.commentary.idIndex[thisid]["source"] = source
              globalData.commentary.idIndex[thisid].verse_ids.push(
                parseInt(verse_id, 0)
              )
            }
          }
        }

        //TAGS

        globalData["tags"]["tagSiblings"] = {}
        globalData["tags"]["tagBranches"] = []
        for (x in globalData["tags"]["verseTagIndex"])
          globalData["tags"]["verseTagIndex"][x] = this.shuffle(
            globalData["tags"]["verseTagIndex"][x]
          )
        for (x in globalData["tags"]["tagIndex"]) {
          globalData["tags"]["tagIndex"][x]["verses"] = this.verseDatatoArray(
            globalData["tags"]["tagIndex"][x]["verses"]
          )

          var p = globalData["tags"]["tagIndex"][x]["parents"][0]
          if (globalData["tags"]["tagSiblings"][p] === undefined)
            globalData["tags"]["tagSiblings"][p] = []
          globalData["tags"]["tagSiblings"][p].push(x)
        }
        for (x in globalData["tags"]["tagStructure"]) {
          for (y in globalData["tags"]["tagStructure"][x]) {
            globalData["tags"]["tagStructure"][x][y][
              "verses"
            ] = this.verseDatatoArray(
              globalData["tags"]["tagStructure"][x][y]["verses"]
            )
          }
        }
        for (x in globalData["tags"]["superRefs"])
          globalData["tags"]["superRefs"][x] = this.verseDatatoArray(
            globalData["tags"]["superRefs"][x]
          )
        this.pull("tags")
        this.checkLoaded()
        fetch(this.state.rootURL+"./core/tags_hl.txt")
          .then(response => response.text())
          .then(base64 => {
            var hdata = this.unzipJSON(base64)
            for (x in hdata) {
              for (var y in hdata[x]) {
                if (globalData["tags"]["tagStructure"][x] !== undefined)
                  globalData["tags"]["tagStructure"][x][y]["highlight"] =
                    hdata[x][y]
              }
            }
            this.setState({tagsHLReady: true})
          })

        this.pull("core")
        this.checkLoaded()
      })

    fetch(this.state.rootURL+"./text/words_HEB.txt")
      .then(response => response.text())
      .then(data => {
        globalData["hebrew"] = this.unzipJSON(data)
        if (parseRoute(window.location.pathname).hebrew !== undefined) {
          this.pull("hebrew")
          this.checkLoaded()
        }
        this.setState({hebrewReady: true})
      })


    fetch(this.state.rootURL+"./text/verses_" + this.state.version.toUpperCase() + ".txt")
      .then(response => response.text())
      .then(data => {
        globalData["text"][this.state.version] = this.unzipJSON(data)
        this.pull("version")
        this.checkLoaded()
      })

    this.loadTopVersions()
  }

  loadTopVersions() {
    //Load ALT
    setTimeout(
      function() {
        for (var x in this.state.top_versions) {
          var ver = this.state.top_versions[x]
          if (ver === this.state.version) continue
          const const_ver = ver
          fetch(this.state.rootURL+"./text/verses_" + const_ver.toUpperCase() + ".txt")
            .then(response => response.text())
            .then(data => {
              globalData["text"][const_ver] = this.unzipJSON(data)
              this.setActiveVerse(
                this.state.active_verse_id,
                undefined,
                undefined,
                true,
                "init"
              )
            })
        }
      }.bind(this),
      3000
    )
  }

  verseDatatoArray(versedata, src) {
    var verses = []
    if (typeof versedata === "number") verses.push(versedata)
    else if (Array.isArray(versedata)) {
      if (typeof versedata[0] === "number") versedata = [versedata]
      for (var y in versedata) {
        var item = versedata[y]
        //singles
        if (Array.isArray(item)) {
          verses = verses.concat(item)
          continue
        }
        //ranges
        for (var i in item) {
          var vid = parseInt(i, 0)
          for (var j = vid; j < vid + item[i]; j++) {
            verses.push(j)
          }
        }
      }
    } //object
    else {
      for (i in versedata) {
        vid = parseInt(i, 0)
        for (j = vid; j < vid + versedata[i]; j++) {
          verses.push(j)
        }
      }
    }

    if (verses.length === 0) {
      //	console.log("No Verses: ",versedata);
    }
    return verses
  }

  loadVersion(shortcode) {
    if (shortcode === undefined) shortcode = "KJV"
    this.setState({ui_version_loading: true})
    let image = new Image()
    image.src = require("./img/versions/" + shortcode.toLowerCase() + ".jpg")
    return fetch(this.state.rootURL+"./text/verses_" + shortcode + ".txt")
      .then(response => response.text())
      .then(data => {
        globalData["text"][shortcode] = this.unzipJSON(data)
        this.setState(
          {version: shortcode, ui_version_loading: false, spot: null},
          function() {
            this.saveSettings()
            this.setActiveVerse(
              this.state.active_verse_id,
              undefined,
              undefined,
              true,
              "version"
            )
            if (this.state.searchMode && this.state.searchQuery !== null)
              this.search(this.state.searchQuery)
          }
        )
      })
  }

  cycleStructure(incr) {
    if (incr === undefined) incr = 1
    var list = this.state.top_structures.slice(0)
    for (var key in globalData["structures"]) {
      if (list.indexOf(key) < 0) list.push(key)
    }
    var pos = incr + list.indexOf(this.state.structure)
    if (pos >= list.length) pos = 0
    if (pos < 0) pos = list.length - 1
    this.setActiveStructure(list[pos])
  }
  cycleOutline(incr) {
    if (incr === undefined) incr = 1
    var list = this.state.top_outlines.slice(0)
    for (var key in globalData["meta"]["outline"]) {
      if (list.indexOf(key) < 0) list.push(key)
    }
    var pos = incr + list.indexOf(this.state.outline)
    if (pos >= list.length) pos = 0
    if (pos < 0) pos = list.length - 1
    this.setActiveOutline(list[pos])
  }
  cycleVersion(incr) {
    if (incr === undefined) incr = 1
    var list = this.state.top_versions.slice(0)
    for (var key in globalData["meta"]["version"]) {
      if (list.indexOf(key) < 0) list.push(key)
    }
    var pos = incr + list.indexOf(this.state.version)
    if (pos >= list.length) pos = 0
    if (pos < 0) pos = list.length - 1
    this.setActiveVersion(list[pos])
  }

  setActiveVerse(verse_id, structure, outline, force, source) {
    if (verse_id === null || verse_id === undefined) return () => {}
    if (["newversion"].indexOf(source) > -1 && this.state.commentaryAudioMode)
      return () => {}
    if (
      ["audio", "arrow", "newversion", "init","tag"].indexOf(source) === -1 &&
      this.state.audioState !== null &&
      !this.state.commentaryAudioMode
    )
      return () => {}
    if (this.state.selected_verse_id !== null && force === undefined)
      return () => {}

    if (
      this.state.selected_tag !== null &&
      this.state.highlighted_verse_range.indexOf(verse_id) < 0
    )
      return () => {}
    if (
      this.state.searchMode &&
      this.state.highlighted_verse_range.indexOf(verse_id) < 0 &&
      source !== "newversion" &&
      !this.state.commentaryAudioMode
    )
      return () => {}

    var searchQuery = this.state.searchQuery
    var searchMode = this.state.searchMode
    var hebrewSearch = this.state.hebrewSearch
    if (source === "closeSearch") {
      searchMode = false
      hebrewSearch = false
      searchQuery = null
    }

    var allCollapsed = this.state.allCollapsed
    if (source === "versebox" || source === "arrow") allCollapsed = false
    else this.floater = {}

    if (source !== "arrow" && source !== "audio") this.arrowPointer = null

    var commentary_audio_verse_range = this.state.commentary_audio_verse_range
    var selected_verse_id = this.state.selected_verse_id;
    if (source === "comaudio")
    {
    	commentary_audio_verse_range = [] ; //NO LONGER TRUE
    	selected_verse_id = null;
    }

    var audioState = this.state.audioState
    if (audioState === "playing" && !this.state.commentaryAudioMode)
      audioState = "loading"
    if (
      globalData.meta.version[this.state.version].audio !== 1 &&
      !this.state.commentaryAudioMode
    )
      audioState = null
    var nextAudioMode = audioModeFromLegacy(audioState, this.state.commentaryAudioMode)

    outline = outline === undefined ? this.state.outline : outline
    structure = structure === undefined ? this.state.structure : structure

    var strong = this.state.hebrewStrongIndex
    var word = this.state.hebrewWord
    if (!this.state.hebrewSearch || source === "closeSearch")
      strong = word = null

    var vals = {
      active_verse_id: verse_id,
      selected_verse_id: selected_verse_id,
      more_tags: false,
      searchMode: searchMode,
      searchQuery: searchQuery,
      hebrewSearch: hebrewSearch,
      previewed_tag: null,
      hebrewStrongIndex: strong,
      hebrewWord: word,
      urlSearch: false,
      audioMode: nextAudioMode,
      audioState: legacyAudioState(nextAudioMode),
      commentaryAudioMode: legacyCommentaryAudioMode(nextAudioMode),
      allCollapsed: allCollapsed,
      commentary_audio_verse_range: commentary_audio_verse_range,

      highlighted_verse_range: this.getHighlightedVerseRange(
        verse_id,
        outline,
        source
      ),
      highlighted_section_verses: this.getSectionVerses(verse_id, structure),

      highlighted_heading_index: this.getHeadingIndex(verse_id, outline),
      highlighted_section_index: this.getSectionIndex(verse_id, structure),
      highlighted_tagged_verse_range: this.getTagHighlightRange(
        verse_id,
        source
      )
    }

    this.setState(vals, function() {
      //	this.spreadVerse();
      this.tagOverflow()
      this.scrollOutline(false, source)
      this.scrollText(false, source)
      this.checkFloater()
      this.highlightReadMore()
      var isHighFreq = source === "arrow" || source === "audio" || source === "comaudio";
      this.setUrl(isHighFreq)
      if (this.state.hebrewSearch && this.state.hebrewStrongIndex !== null) {
        this.searchHebrewWord(this.state.hebrewStrongIndex)
      } else if (this.state.searchMode && source === "newversion") {
        this.search(this.state.searchQuery)
      }
      this.triggerAudio();
      //debugger;
      if (source === "init") this.setActiveVersion(this.state.version)
    })
  }

  triggerAudio() {
    if (this.state.triggerAudio) {
      this.setState({triggerAudio: false}, function() {
        //document.getElementById("audio_verse").click();
      })
    }
  }

  advanceCommentary(verse_id) {
    this.setState(
      {},
      this.setActiveVerse.bind(
        this,
        verse_id,
        undefined,
        undefined,
        undefined,
        "audio"
      )
    )
  }

  scrollText(reset, source) {
    if (
      ["versebox", "arrow", "tag", "audio", "init", "search"].indexOf(
        source
      ) === -1
    )
      return false

    var time = 200
    if (source === "tag") time = 0

    var container = document.getElementById("text")

    var base = document.querySelectorAll("#text .verses.active")[0]
    if (base === undefined) base = document.getElementById("text")

    var element = base.querySelectorAll(".versebox_highlighted")[0] //what about multiples?
    if (element === undefined) return false
    if (container === undefined) return false

    if (this.state.selected_tag !== null &&
        globalData["tags"]["tagIndex"][this.state.selected_tag].meta === "parallel") {
      var parallelHeading = element.closest("table.parallel")
        && element.closest("table.parallel").querySelector('tr[data-scroll-target="parallel-heading"]');
      if (parallelHeading) element = parallelHeading;
    }

    if (this.checkInView(container, element) === true) return false
	//debugger;
	if(typeof container.childNodes[0].getBoundingClientRect !== "function") return false;
    var parent = container.childNodes[0].getBoundingClientRect().y
    var child = element.getBoundingClientRect().y
    const to = child - parent - 100
    if (reset === true) container.scrollTop = 0
    container.scrollTo({ top: to, behavior: time === 0 ? 'auto' : 'smooth' });
  }

  scrollOutline(reset, source) {
    if (
      ["versebox", "arrow", "tag", "audio", "closeSearch", "init"].indexOf(
        source
      ) === -1
    )
      return false

    var container = document.getElementById("outline")
    var element = container.querySelectorAll(".heading_grid_highlighted")[0]
    if (element === undefined) return false
    if (container === undefined) return false

    if (this.checkInView(container, element) === true) return false

    var parent = container.childNodes[0].getBoundingClientRect().y
    var child = element.getBoundingClientRect().y
    const to = child - parent - 200
    if (reset === true) container.scrollTop = 0
    container.scrollTo({ top: to, behavior: 'smooth' });
  }

  scrollTagTree(reset, source) {
    if (document.getElementsByClassName("tag_meta").length === 0) return false
    if (document.getElementsByClassName("tag_meta")[0].matches(":hover"))
      return false

    var m = document.getElementsByClassName("tag_meta")
    var container = m[m.length - 1]
    var b = container.querySelectorAll(".branch.highlight")
    var element = b[b.length - 1]

    if (element === undefined) return false
    if (container === undefined) return false

    //	if(this.checkInView(container,element)===true) return false;

    var parent = container.getBoundingClientRect().y
    var child = element.getBoundingClientRect().y
    const to = child - parent + container.scrollTop - 150
    if (reset === true) container.scrollTop = 0

    container.scrollTo({ top: to, behavior: 'smooth' });
  }

  checkInView(container, element, p) {
    if (!container || !element) return false;
    var cRect = container.getBoundingClientRect();
    var eRect = element.getBoundingClientRect();
    var totallyInView = eRect.top >= cRect.top && eRect.bottom <= cRect.bottom;
    if (totallyInView) return true;
    if (p !== true) return false;
    // Partial mode: count "partially overlapping" as in view.
    return (eRect.top < cRect.top && eRect.bottom > cRect.top)
        || (eRect.bottom > cRect.bottom && eRect.top < cRect.bottom);
  }

  getTagHighlightRange(verse_id, source) {
    verse_id = parseInt(verse_id, 0)
    //todo get range from verse id
    var tagStructure =
      globalData["tags"]["tagStructure"][this.state.selected_tag]
    var tagMeta = globalData["tags"]["tagIndex"][this.state.selected_tag]

    for (var x in tagStructure) {
      var verses = tagStructure[x].verses.map(Number)
      if (verses.indexOf(verse_id) >= 0) {
        if (tagMeta.type === "chiasm") {
          verses = []
          var letter = x.replace(/[0-9]+/g, "")
          var keys = this.filtering(tagStructure, letter)
          for (var y in keys)
            verses = verses.concat(tagStructure[keys[y]].verses.map(Number))
          if (["versebox", "audio", "arrow"].indexOf(source) >= 0)
            this.setActiveChiasm(letter, verses)
        }
        if (tagMeta.type === "") {
          if (source === "versebox" || source === "arrow" || source === "audio")
            this.setState({selected_tag_block_index: null})
        }
        return verses
      }
    }
    return []
  }

  filtering(tagStructure, letter) {
    Object.keys(tagStructure).filter(
      val => val.replace(/[0-9]+/g, "") === letter
    )
  }

  setPreviewedTag(tagName, parent, leaf) {
    if (this.state.commentaryAudioMode) return false
    if (tagName === null) {
      this.setState({
        showcase_tag: null,
        highlighted_tagged_verse_range: [],
        highlighted_tagged_parent_verse_range: []
      })
    } else {
      var tagData = this.getTagData(tagName)
      if (tagData.verses === undefined) tagData.verses = []

      if (parent === true && leaf !== undefined)
        this.setState({
          showcase_tag: leaf,
          previewed_tag: leaf,
          highlighted_tagged_parent_verse_range: tagData.verses
        })
      else if (parent === true) {
        this.setState({
          previewed_tag: tagName,
          highlighted_tagged_parent_verse_range: tagData.verses
        })
      } else
        this.setState({
          previewed_tag: tagName,
          highlighted_tagged_verse_range: tagData.verses
        })
    }
  }

  highlightTaggedVerses(verses) {
    this.setState({highlighted_tagged_verse_range: verses})
  }

  setPreviewedSection(shortcode) {
    if (this.state.commentaryAudioMode) return false
    if (shortcode === null) {
      this.setState({
        highlighted_tagged_verse_range: [],
        highlighted_tagged_parent_verse_range: []
      })
    } else {
      this.setState({
        highlighted_tagged_parent_verse_range: [],
        highlighted_tagged_verse_range: this.getHighlightedVerseSectionRange(
          this.state.active_verse_id,
          shortcode
        )
      })
    }
  }
  setPreviewedPassage(shortcode) {
    if (this.state.commentaryAudioMode) return false
    if (shortcode === null) {
      this.setState({
        highlighted_tagged_verse_range: [],
        highlighted_tagged_parent_verse_range: []
      })
    } else {
      this.setState(
        {
          highlighted_tagged_parent_verse_range: [],
          highlighted_tagged_verse_range: this.getHighlightedVerseRange(
            this.state.active_verse_id,
            shortcode
          )
        },
        function() {
          //this.spreadVerse();
        }
      )
    }
  }

  highlightReadMore() {
    if (this.state.selected_tag === null) return false
    var tagMeta = globalData["tags"]["tagIndex"][this.state.selected_tag]
    if (["chiasm", "parallel"].indexOf(tagMeta.type) >= 0) {
      var mores = document.getElementById("text").querySelectorAll(".readmore")
      for (var y = 0; y < mores.length; ++y) mores[y].className = "readmore"
      var yellowVerses = document
        .getElementById("text")
        .querySelectorAll(".versebox_highlighted")
      for (var x = 0; x < yellowVerses.length; ++x) {
        var verse = yellowVerses[x]
        var box = null
        if (tagMeta.type === "chiasm") box = this.findAncestor(verse, ".verses")
        if (tagMeta.type === "parallel") box = this.findAncestor(verse, ".row")
        var readmore = box.nextElementSibling
        if (!this.checkInView(box, verse))
          if (readmore !== null) readmore.className = "readmore active"
      }
    }
  }

  setActiveChiasm(letter, verses) {
    if (verses === null || verses === undefined) verses = []
    this.setState(
      {chiasm_letter: letter, highlighted_tagged_verse_range: verses},
      function() {
        var l = this.state.chiasm_letter
        var list = [
          "left" + l + "1",
          "left" + l + "2",
          "left" + l,
          "right" + l + "1",
          "right" + l + "2",
          "right" + l
        ]

        for (var y in list) {
          const x = y
          if (document.getElementById(list[x]) === null) continue
          //document.getElementById(list[x]).scrollIntoView();

          var element = document.getElementById(list[x])
          var container = element.parentNode

          var parent = container.childNodes[0].getBoundingClientRect().y
          var child = element.getBoundingClientRect().y
          const to = child - parent - 200
          if (child > 1000) {
            container.scrollTop = to
            continue
          }
          container.scrollTo({ top: to, behavior: 'smooth' });
        }
      }
    )
  }

  PopupCenter(e, n, t, i) {
    var o = window.screenLeft,
      d = window.screenTop,
      c = window.innerWidth
        ? window.innerWidth
        : document.documentElement.clientWidth,
      w = window.innerHeight
        ? window.innerHeight
        : document.documentElement.clientHeight,
      r = c / 2 - t / 2 + o,
      h = w / 2 - i / 2 + d,
      s = window.open(
        e,
        n,
        "scrollbars=yes, width=" +
          t +
          ", height=" +
          i +
          ", top=" +
          h +
          ", left=" +
          r
      )
    return window.focus && s.focus()
  }

  sgshow(e) {
    e.preventDefault()
    var ref = this.props.reference.replace(/[\s.]+/g, ".").toLowerCase()
    this.PopupCenter(
      "https://scripture.guide/" + ref,
      "Scripture Guide",
      1000,
      750
    )
    e.stopPropagation()
  }

  addLinks(string) {
    var blocks = []
    var items = string.split(/[{}]/)
    for (var i = 0; i < items.length; i++) {
      if (i % 2) blocks.push(<SGLink key={i} reference={items[i]} />)
      else blocks.push(<span key={i}>{items[i]}</span>)
    }
    return blocks
  }

  checkFloater(TagBlocks) {
    if (this.state.selected_tag === null) return false
    var container = document.getElementById("text")
    if (container === null) return false
    var h = container.querySelectorAll(".tag_desc_highlighted")
    if (h.length < 1) {
      if (document.getElementById("floater") === null) return false
      document.getElementById("floater").style.display = "none"
      return false
    }
    var element = h[0]

    var metaOpen =
      document.getElementById("version_meta").classList[1] === "visible"

    var blueBarisVisible = this.checkInView(container, element)
    var textNotVisible = !this.checkInView(
      container,
      element.parentNode.lastChild,
      true
    )

    if (document.getElementById("floater") === undefined) return false
    if (document.getElementById("floater") === null) return false
    //console.log({blueBarisVisible:blueBarisVisible,textNotVisible:textNotVisible,metaOpen:metaOpen,allCollapsed:this.state.allCollapsed});
    if (
      blueBarisVisible ||
      textNotVisible ||
      metaOpen ||
      this.state.allCollapsed
    ) {
      document.getElementById("floater").style.display = "none"
    } else {
      document.getElementById("floater").style.display = "block"
    }

    if (TagBlocks !== undefined) {
      //if(this.state.selected_tag_block_index!==TagBlocks.active_block_index)
      //this.setState({selected_tag_block_index:TagBlocks.active_block_index});
    }
  }

  clearCommentary() {
    this.setState(
      {
        commentaryMode: false,
        selected_verse_id: null,
        commentary_verse_id: null,
        commentaryID: null,
        searchMode: false,
        comSearchMode: false,
        commentary_verse_range: []
      },
      this.setActiveVerse.bind(
        this,
        this.state.active_verse_id,
        undefined,
        undefined,
        true,
        "tag"
      )
    )
  }

  showcaseTag(tagName, src) {
    if (
      this.state.selected_tag !== null &&
      (tagName === null || tagName === undefined)
    )
      tagName = this.state.selected_tag
    var children = globalData["tags"]["tagChildren"][tagName]
    if (children === undefined)
      children = globalData["tags"]["parentTagIndex"][tagName]

    //is tag a leaf?
    if (children === undefined && tagName !== null)
      return this.setActiveTag(tagName)

    if (tagName === null || tagName === undefined) tagName = "Structures"
    var tagData = this.getTagData(tagName)
    if (tagData === undefined) return false

    var newVerseId = this.state.active_verse_id
    if (tagData.verses[0] !== undefined) newVerseId = tagData.verses[0]
    var newvals = {
      active_verse_id: newVerseId,
      selected_tag: null,
      searchMode: false,
      comSearchMode: false,
      audioMode: AUDIO_MODE.IDLE,
      audioState: null,
      commentaryAudioMode: false,
      preSearchMode: false,
      previewed_tag: null,
      showcase_tag: tagName,
      selected_tag_block_index: null,
      highlighted_verse_range: [],
      highlighted_tagged_verse_range: [],
      highlighted_tagged_parent_verse_range: tagData.verses
    }
    this.setTagPanel(TAG_PANEL.VERSES)
    this.setState(newvals, function() {
      //this.scrollText(true,src);
      this.scrollTagTree()

      this.setTagPanel(TAG_PANEL.VERSES)
      this.setUrl()
    })
  }

  setRecentTag(tagName) {
    //add to root
    if (
      globalData["tags"]["parentTagIndex"]["root"].indexOf(
        "Recently Viewed Tags"
      ) < 0
    )
      globalData["tags"]["parentTagIndex"]["root"].unshift(
        "Recently Viewed Tags"
      )

    //creat new tag
    if (
      globalData["tags"]["parentTagIndex"]["Recently Viewed Tags"] === undefined
    )
      globalData["tags"]["parentTagIndex"]["Recently Viewed Tags"] = []

    //add tag as child
    if (
      globalData["tags"]["parentTagIndex"]["Recently Viewed Tags"].indexOf(
        tagName
      ) < 0
    )
      globalData["tags"]["parentTagIndex"]["Recently Viewed Tags"].unshift(
        tagName
      )

    globalData["tags"]["parentTagIndex"]["Recently Viewed Tags"] = globalData[
      "tags"
    ]["parentTagIndex"]["Recently Viewed Tags"].slice(0, 10)
  }

  setActiveTag(tagName, force, top) {
    if (tagName === null) return false
    var tagData = this.getTagData(tagName)
    if (tagData === undefined) return false
    if (tagData.verses === undefined) return false

    if (globalData.tags.tagChildren[tagName] !== undefined)
      return this.showcaseTag(tagName)
    if (globalData.tags.parentTagIndex[tagName] !== undefined)
      return this.showcaseTag(tagName)

    if (tagName === this.state.selected_tag && force === undefined)
      return this.clearTag()

    this.floater = {}

    this.setRecentTag(tagName)

    var newVerseId = this.state.active_verse_id
    if (
      tagData.verses.indexOf(newVerseId) < 0 &&
      (this.selected_verse_id === null || this.selected_verse_id === undefined)
    )
      newVerseId = Math.min.apply(null, tagData.verses)

    if (top === true) {
      newVerseId = tagData.verses[0]
    }

    if ([null, 0, undefined].indexOf(newVerseId) > -1) debugger

    this.arrowPointer = 0
    this.setTagPanel(TAG_PANEL.CLOSED)
    this.setState(
      {
        active_verse_id: newVerseId,
        selected_tag: tagName,
        searchMode: false,
        hebrewMode: false,
        hebrewSearch: false,
        hebrewStrongIndex: null,
        allCollapsed: false,
        showcase_tag: null,
        previewed_tag: null,
        selected_tag_block_index: null,
        comSearchMode: false,
        preSearchMode: false,
        highlighted_verse_range: tagData.verses,
        highlighted_tagged_verse_range: [],
        highlighted_tagged_parent_verse_range: [],
        chiasm_letter: null
      },
      function() {
        this.scrollText(true, "tag")
        this.setUrl()

        this.setActiveVersion(this.state.version)
      }
    )
  }

  clearTag(tagMode, forceverse, src) {
    if (src === "structure" && this.state.searchMode) return false
    if (tagMode !== true) tagMode = false
    if (
      this.state.selected_tag === null &&
      this.state.tagMode === false &&
      this.state.searchMode === false &&
      this.state.preSearchMode === false
    )
      return false
    this.floater = {}
    this.setTagPanel(tagMode ? TAG_PANEL.VERSES : TAG_PANEL.CLOSED)
    this.setState(
      {
        selected_tag: null,
        selected_verse_id: null,
        searchMode: false,
        hebrewMode: false,
        mouseBlockIndex: null,
        refSearch: false,
        hebrewSearch: false,
        preSearchMode: false,
        comSearchMode: false,
        urlSearch: false,
        searchQuery: null,
        showcase_tag: null,
        previewed_tag: null,
        highlighted_verse_range: [],
        highlighted_tagged_verse_range: [],
        highlighted_tagged_parent_verse_range: []
      },
      function() {
        var verse = forceverse
        if (verse === undefined) verse = this.state.active_verse_id
        this.setActiveVerse(verse, undefined, undefined, true, "tag")
      }
    )
  }
  setTagPanel(panel) {
    this.setState({
      tagPanel: panel,
      tagMode: derivedTagMode(panel),
      infoOpen: derivedInfoOpen(panel),
    });
  }
  setAudioMode(mode, callback) {
    this.setState({
      audioMode: mode,
      audioState: legacyAudioState(mode),
      commentaryAudioMode: legacyCommentaryAudioMode(mode),
    }, callback);
  }
  setActiveStructure(shortcode) {
    this.setState(
      {
        structure: shortcode,
        highlighted_section_index: this.getSectionIndex(
          this.state.active_verse_id,
          shortcode
        )
      },
      function() {
        this.saveSettings()
        this.setActiveVerse(this.state.active_verse_id, shortcode)
      }
    )
  }
  setActiveOutline(shortcode) {
    this.setState(
      {
        selected_verse: null,
        outline: shortcode,
        highlighted_heading_index: this.getHeadingIndex(
          this.state.active_verse_id,
          shortcode
        )
      },
      function() {
        this.saveSettings()
        this.scrollOutline(null, "versebox")
        this.setActiveVerse(
          this.state.active_verse_id,
          undefined,
          undefined,
          undefined,
          "versebox"
        )
      }
    )
  }

  setActiveVersion(shortcode) {
    if (typeof globalData["text"][shortcode] === "undefined") {
      //set state to loading....
      this.loadVersion(shortcode)
    }
    else if (shortcode === this.state.version)
      return this.setActiveVerse(
        this.state.active_verse_id,
        undefined,
        undefined,
        undefined,
        "tag"
      )
    else {
      this.setState(
        {version: shortcode},

        function() {
          this.saveSettings()
          if (!(this.state.searchMode && this.state.searchQuery === null))
            this.setActiveVerse(
              this.state.active_verse_id,
              undefined,
              undefined,
              undefined,
              "newversion"
            )
          this.spotDone()
        }
      )
    }
  }

  getSectionVerses(verse_id, structure) {
    var Verses = []
    var VerseArray =
      globalData["structures"][structure][
        this.getSectionIndex(verse_id, structure)
      ].verses
    Verses = VerseArray[0]
    if (VerseArray.length === 2) Verses = Verses.concat(VerseArray[1])
    return Verses.map(Number)
  }

  getSectionIndex(verse_id, structure) {
    if (verse_id === undefined) return -1
    var r = globalData["structureIndex"][verse_id.toString()][structure]
    if (r === undefined) return -1
    return r
  }

  getHeadingIndex(verse_id, outline) {
    if (verse_id === undefined) return -1
    var r = globalData["outlineIndex"][verse_id.toString()][outline]
    if (r === undefined) return -1
    return r
  }

  getHighlightedVerseRange(verse_id, outline, source) {
    if (verse_id === undefined) return []
    if (this.state.selected_tag !== null)
      return this.state.highlighted_verse_range
    if (this.state.comSearchMode) return this.state.highlighted_verse_range
    if (
      this.state.searchMode &&
      ["closeSearch", "audio"].indexOf(source) < 0 &&
      this.state.searchQuery !== null
    )
      return this.state.highlighted_verse_range
    if (this.state.searchMode && this.state.searchQuery !== null)
      return this.state.highlighted_verse_range

    if (globalData["outlineIndex"][verse_id.toString()] === undefined) {
      debugger
      return []
    }

    return globalData["outlines"][outline][
      globalData["outlineIndex"][verse_id.toString()][outline]
    ].verses
  }
  getHighlightedVerseSectionRange(verse_id, structure) {
    if (verse_id === undefined) return []
    var item =
      globalData["structures"][structure][
        globalData["structureIndex"][verse_id.toString()][structure]
      ]
    var output = item.verses[0].map(Number)
    if (item.verses.length > 1) {
      output = output.concat(item.verses[1].map(Number))
    }
    return output
  }

  getStructureTitle(structure) {
    return globalData["meta"]["structure"][structure].title
  }

  getSectionTitle(verse_id, structure) {
    return globalData["structures"][structure][
      this.getSectionIndex(verse_id, structure)
    ].title
  }

  getheadingTitle(verse_id, outline) {
    return globalData["outlines"][outline][
      this.getHeadingIndex(verse_id, outline)
    ].title
  }

  getVerseTags(verse_id) {
    if (this.lastVerseId === verse_id) return this.lastTags
    var output = globalData["tags"]["verseTagIndex"][verse_id.toString()]
    this.lastTags = output
    this.lastVerseId = verse_id
    return this.lastTags
  }
  getTagData(tagName) {
    //if(tagName==="Wicked Destroyed"){ var gb = globalData; 	debugger;  	}
    var g = globalData["tags"]["tagIndex"][tagName]
    if (g === undefined)
      return {
        parents: [],
        description: "All Tags",
        details: "",
        type: "",
        slug: "alltags",
        verses: globalData["tags"]["superRefs"]["Structures"]
      }
    delete g.verses
    if (g.verses === undefined) {
      var segments = globalData["tags"]["tagStructure"][tagName]
      if (segments !== undefined) {
        g.verses = []
        if (typeof segments === "object")
          segments = Object.keys(segments).map(function(key) {
            return segments[key]
          })
        for (var i in segments) g.verses = g.verses.concat(segments[i].verses)
      }
    }
    if (g.verses === undefined)
      g.verses = globalData["tags"]["superRefs"][tagName]
    if (g.verses === undefined) {
      // No super refs, no verses, must be a parent

      g.verses = []
      var t = globalData["tags"]
      var children = t["tagChildren"][tagName]

      if (children === undefined) {
        children = t["parentTagIndex"][tagName]
      }

      if (children === undefined) {
        //we have a problem, a leaf has no verses!
        debugger
        return this.clearTag()
      }
      for (i in children) {
        var childObj = this.getTagData(children[i])
        if(childObj===undefined) continue;
        g.verses = g.verses.concat(childObj.verses)
      }
    }
    return g

    //Add Parents, etc
  }

  shuffle(arr) {
    let newArr = arr.slice()
    for (var i = newArr.length - 1; i > 0; i--) {
      var rand = Math.floor(Math.random() * (i + 1))
      ;[newArr[i], newArr[rand]] = [newArr[rand], newArr[i]]
    }
    return newArr
  }

  ArrNoDupe(a) {
    var temp = {}
    for (var i = 0; i < a.length; i++) temp[a[i]] = true
    var r = []
    for (var k in temp) r.push(k)
    return r
  }

 isConsecArray(arr) {
    var previous = arr[0];
    var i;
    var y = (arr.length);
    if (y > 1) {
        for (i=1; i < y; i += 1) {
            if (parseInt(arr[i]) -1  !== parseInt(previous)) {
                return false;
            }
            previous = arr[i];        
        }
    }
    return true;
}

  getMegaRef(verse_ids)
  {
  	var first = this.getReference([verse_ids[0]])
  	var last = this.getReference([verse_ids.pop()]);
  	
  	return first+"–"+(last.replace(/^[A-z]+/,'')).trim();
  	
  }

  getReference(verse_ids) {
    verse_ids = this.ArrNoDupe(verse_ids.sort())
    var index = globalData["index"]
    var obj = {}
    for (var i in verse_ids) {
      if (obj[index[verse_ids[i]].chapter] === undefined)
        obj[index[verse_ids[i]].chapter] = []
      obj[index[verse_ids[i]].chapter].push(index[verse_ids[i]].verse)
    }

    for (var chapter in obj) {
      var verses = obj[chapter]
      obj[chapter] = []
      var l = -1
      var key = -1
      for (i in verses) {
        if (verses[i] !== l + 1) key++
        if (obj[chapter][key] === undefined) obj[chapter][key] = []
        obj[chapter][key].push(verses[i])
        l = verses[i]
      }
    }
    var final = "Isaiah "
    var counter = 0;
    for (chapter in obj) {
    	counter++;
      var verse_groups = obj[chapter]
      var v_arr = []
      for (i in verse_groups) {
        if (verse_groups[i].length === 1) v_arr.push(verse_groups[i][0])
        else
          v_arr.push(
            verse_groups[i][0] +
              "–" +
              verse_groups[i][verse_groups[i].length - 1]
          )
      }
      final = final + chapter + ":" + v_arr.join(",") + "; "
    }
    if(counter>1 && this.isConsecArray(verse_ids) && verse_ids.length>1) return this.getMegaRef(verse_ids);
    
    return final.replace(/;\s*$/g, "")
  }
  

  loadCommentaryID() {
    if (
      globalData.commentary.comIndex[this.state.active_verse_id] === undefined
    )
      return this.state.commentaryID

    var id = null
    if (
      globalData.commentary.comIndex[this.state.active_verse_id][
        this.state.commentarySource
      ] === undefined
    ) {
      var sources = Object.keys(
        globalData.commentary.comIndex[this.state.active_verse_id]
      )
      id =
        globalData.commentary.comIndex[this.state.active_verse_id][
          sources[0]
        ][0]
    }
    var candidates =
      globalData.commentary.comIndex[this.state.active_verse_id][
        this.state.commentarySource
      ]
    if (id === null) id = candidates[candidates.length - 1]
    return id
  }

  findAncestor(el, sel) {
    if (typeof el.closest === "function") {
      return el.closest(sel) || null
    }
    while (el) {
      if (el.matches(sel)) {
        return el
      }
      el = el.parentElement
    }
    return null
  }

  setHebrewWord(strong, word) {
    var matches = []
    var verses = globalData.hebrew.verses
    for (var verse_id in verses) {
      for (var word_id in verses[verse_id]) {
        if (verses[verse_id][word_id].strong === strong) {
          matches.push(parseInt(verse_id, 0))
        }
      }
    }

    this.setState(
      {
        highlighted_tagged_verse_range: matches,
        hebrewStrongIndex: strong,
        hebrewWord: word
      },
      function() {
        this.scrollText(false, "search")
      }
    )
  }

  unzipJSON(base64) {
    function atos(arr) {
      // eslint-disable-next-line
      for (var i = 0, l = arr.length, s = "", c; (c = arr[i++]); )
        s += String.fromCharCode(
          c > 0xdf && c < 0xf0 && i < l - 1
            ? // eslint-disable-next-line
              ((c & 0xf) << 12) | ((arr[i++] & 0x3f) << 6) | (arr[i++] & 0x3f)
            : c > 0x7f && i < l
              ? // eslint-disable-next-line
                ((c & 0x1f) << 6) | (arr[i++] & 0x3f)
              : c
        )
      return s
    }
    try {
      return JSON.parse(atos(pako.ungzip(atob(base64))))
    } catch (err) {
      return ["Unzip Failure", err]
    }
  }

  searchHebrewWord(strong) {
    var matches = []
    var query = ""
    var verses = globalData.hebrew.verses
    for (var verse_id in verses) {
      for (var word_id in verses[verse_id]) {
        if (verses[verse_id][word_id].strong === strong) {
          matches.push(parseInt(verse_id, 0))
          query = verses[verse_id][word_id].orig
          //" ("+verses[verse_id][word_id].phon+")—"+verses[verse_id][word_id].eng;
        }
      }
    }

    this.setTagPanel(TAG_PANEL.CLOSED)
    this.setState(
      {
        highlighted_verse_range: matches,
        hebrewStrongIndex: strong,
        hebrewSearch: true,
        hebrewMode: true,
        selected_tag: null,
        preSearchMode: false,
        showcase_tag: null,
        previewed_tag: null,

        highlighted_tagged_verse_range: [],
        highlighted_tagged_parent_verse_range: [],
        searchMode: true,
        searchQuery: query
      },
      function() {
        this.setUrl()
        this.scrollText(false, "search")
      }
    )
  }

  getWidth() {
    return Math.max(
      document.body.offsetWidth,
      document.documentElement.offsetWidth,
      document.documentElement.clientWidth
    )
  }

  getHeight() {
    return Math.max(
      document.body.offsetHeight,
      document.documentElement.offsetHeight,
      document.documentElement.clientHeight
    )
  }

  checkZoom() {
    return false
    /*
    var h = this.getHeight()
    var w = this.getWidth()
    var appw = 1920
    if (w < appw) {
      var ratio = w / appw
      document.getElementById("approot").style.transform =
        "scale(" + ratio + ")"
      document.getElementById("approot").style.height = (h + 15) / ratio + "px"
      var nw = document.getElementById("approot").style.width
      if (nw <= w) document.body.style.overflow = "hidden"
    }*/
  }
}
if (!Element.prototype.matches) {
  Element.prototype.matches =
    Element.prototype.matchesSelector ||
    Element.prototype.mozMatchesSelector ||
    Element.prototype.msMatchesSelector ||
    Element.prototype.oMatchesSelector ||
    Element.prototype.webkitMatchesSelector ||
    function(s) {
      var matches = (this.document || this.ownerDocument).querySelectorAll(s),
        i = matches.length
      while (--i >= 0 && matches.item(i) !== this) {}
      return i > -1
    }
}
export default App

export function SGLink({reference}) {
  var globalData = useContext(DataContext)
  var app = globalData.app
  if (reference === undefined) return null
  var link = reference.replace(/\s+/g, ".").toLowerCase()
  return (
    <a
      className="ref"
      onClick={(e) => app.sgshow(e)}
      href={"https://scripture.guide/" + link}>
      {reference}
    </a>
  )
}
