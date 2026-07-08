import React, {Component, useContext} from "react"
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
import MobileTabBar from "./Components/MobileTabBar.js"


import { fetchData } from "./data/fetchData"
import { normalizeCoreData, verseDatatoArray } from "./data/normalizeCoreData"
import { parseRoute, buildRoute } from "./routing/routeCodec"
import {
  DEFAULT_VERSE_ID,
  DEFAULT_TOP_VERSIONS,
  DEFAULT_TOP_OUTLINES,
  DEFAULT_TOP_STRUCTURES
} from "./routing/defaults"
import { getFocalTag, getTagVerses } from "./state/tagSelectors"
import { buildActions } from "./state/actions"
import { resolveKey, NO_PREVENT_DEFAULT_ACTIONS } from "./state/keymap"
import { buildTitle } from "./routing/seo"
import { TAG_PANEL, derivedTagMode, derivedInfoOpen } from "./state/tagPanel"
import { AUDIO_MODE, legacyAudioState, legacyCommentaryAudioMode, audioModeFromLegacy } from "./state/audioState"
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
    floaterVisible: false,
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
    load_error: null,

    // Which panel fills the screen in the mobile (single-column) layout.
    // One of: "structure" | "section" | "verses" | "read". Ignored on desktop.
    mobilePane: "read",

    rootURL: window.location.href.replace(/((^file.*?)([^/]+$)|(^https*:\/\/[^/]+\/)(.*))/,"$2$4")

  }

  load_queue = ["core", "version"]

  // Bounded, frozen action surface handed to components via the context
  // snapshot, so they call actions.* instead of holding the live App instance
  // and calling app.setState directly (audit 1.1/P2.1). Bound once here.
  actions = buildActions(this)

  // Declarative keyboard dispatch table. `resolveKey` (src/state/keymap.js) maps
  // a key event + context flags to one of these action names; this object maps
  // the action name to the existing App method(s) it invokes. Kept as arrow
  // fields so `this` is the App instance and `this.state` is read live at call
  // time (needed by enterToggleVerse / minusToggleTag / toggleHebrew). The
  // methods and their arguments match the legacy keyDown branches exactly.
  keyboardActions = {
    escapeClearTag: () => this.clearTag(),
    enterToggleVerse: () => {
      if (this.state.selected_verse_id === null) {
        return this.selectVerse(this.state.active_verse_id)
      }
      return this.selectVerse(null)
    },
    left: () => this.left(),
    up: () => this.up(),
    right: () => this.right(),
    down: () => this.down(),
    cycleVersionPrev: () => this.cycleVersion(-1),
    cycleVersionNext: () => this.cycleVersion(1),
    cycleOutlinePrev: () => this.cycleOutline(-1),
    cycleOutlineNext: () => this.cycleOutline(1),
    cycleStructurePrev: () => this.cycleStructure(-1),
    cycleStructureNext: () => this.cycleStructure(1),
    cycleSection: () => this.cycleSection(1),
    openCommentary: () => this.toggleCommentaryRead(),
    cycleTag: () => this.cycleTag(1),
    minusToggleTag: () => {
      if (this.state.tagMode) return this.clearTag()
      var recent = globalData["tags"]["parentTagIndex"]["Recently Viewed Tags"]
      if (recent === undefined) return this.showcaseTag(null)
      return this.setActiveTag(recent[recent.length - 1])
    },
    toggleHebrew: () => this.toggleHebrew(),
    toggleCommentaryAudio: () => this.toggleCommentaryAudio(),
    toggleAudioVerse: () => this.toggleVerseAudio(),
    preSearch: () => this.setState({preSearchMode: true}),
    preSearchRef: () => this.setState({preSearchMode: true, refSearch: true}),
  }

  handleLoadError(what) {
    return function (err) {
      console.error("Data load failed (" + what + "):", err)
      this.setState({load_error: what})
    }.bind(this)
  }

  pull(element) {
    const index = this.load_queue.indexOf(element)

    if (index !== -1) {
      this.load_queue.splice(index, 1)
    }
  }

  componentDidMount() {
    // Set the singleton's app reference once (not per-render). Components read
    // app/state through the context snapshot; this is a safety net for any
    // non-context reader of the imported globalData.
    globalData.app = this
    this.boundKeyDown = this.keyDown.bind(this)
    document.addEventListener("keydown", this.boundKeyDown)
    // preload the loading image (its return was already invoked immediately by
    // the previous `img.onload = this.initApp()`, so call initApp directly)
    var img = new Image()
    img.src = require("./img/interface/book.gif")
    this.initApp()
  }

  componentWillUnmount() {
    document.removeEventListener("keydown", this.boundKeyDown)
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
    // Fresh per-render snapshot: carries the data store, the current state, the
    // App instance, and the bounded actions. Providing a NEW object each render
    // lets React context actually signal updates to consumers (the old code
    // mutated the singleton in place, so the provider value never changed —
    // updates only propagated because the whole tree re-rendered). No global
    // mutation happens during render anymore.
    var contextValue = Object.assign({}, globalData, {
      app: this,
      state: this.state,
      actions: this.actions
    })

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

    var errorPanel = null
    if (this.state.load_error !== null)
      errorPanel = (
        <div key="loaderror" className="load-error" role="alert">
          <p>Something went wrong loading the {this.state.load_error} data.</p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      )

    var classes = []
    if (this.state.infoOpen === true) classes.push("infoOpen")
    if (this.state.commentaryMode === true) classes.push("commentaryMode")
    if (this.IsSafari()) classes.push("safari")

    var title = <span>Isaiah Explorer</span>

    return (
      <DataContext.Provider value={contextValue}>
        <div id="approot" className={classes.join(" ")} data-mobile-pane={this.state.mobilePane}>
          {errorPanel}
          <h1>
            <img
              alt="Settings"
              title="Settings"
              aria-label="Settings"
              onClick={() => this.openSettings()}
              src={settings_icon}
              className="settings"
            />
            {title}
            <img
              alt="Video"
              title="Video Tutorial"
              aria-label="Video Tutorial"
              onClick={() => this.openVideo()}
              src={video_icon}
              className="demo"
            />
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
          <MobileTabBar app={this} />
        </div>
      </DataContext.Provider>
    )
  }

  getSettingsFromUrl(settings, pathnameOverride) {
    settings.active_verse_id = DEFAULT_VERSE_ID
    var path = pathnameOverride || (this.props.location && this.props.location.pathname) || window.location.pathname;
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
        return parseInt(verse_id, 10)
    }
    return DEFAULT_VERSE_ID
  }

  loadTagFromSlug(slug) {
    var index = globalData.tags.tagIndex
    for (var tagName in index) {
      if (index[tagName].slug === slug) return tagName
    }
    return null
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

    var focalTag = getFocalTag(this.state).tag;
    var validTag = focalTag && globalData.tags.tagIndex[focalTag] ? focalTag : null;
    var shortcode = (globalData.meta.version[this.state.version.toUpperCase()] &&
      globalData.meta.version[this.state.version.toUpperCase()].shortcode) ||
      this.state.version.toUpperCase();
    var sourceName = (this.state.commentaryMode && this.state.commentarySource &&
      globalData.commentary.comSources[this.state.commentarySource]) ?
      globalData.commentary.comSources[this.state.commentarySource].name : undefined;
    var title = buildTitle({
      chapter: chapter, verse: verse, shortcode: shortcode,
      tagName: validTag || undefined,
      hebrewStrongIndex: this.state.hebrewStrongIndex || undefined,
      searchQuery: (this.state.searchQuery && !this.state.hebrewStrongIndex) ? this.state.searchQuery : undefined,
      commentarySourceName: sourceName,
    });

    // Never push a duplicate history entry. On a popstate (Back/Forward) the
    // browser has already set window.location to the target, so rebuilding the
    // same path must REPLACE, not push — otherwise every Back press appends a
    // new entry, truncating Forward and trapping the user.
    var isSamePath = path === window.location.pathname;
    var doReplace = replace === true || isSamePath;
    if (this.props.navigate && this.state.rootURL.match(/^file/) === null) {
      this.props.navigate(path, { replace: doReplace });
    }

    document.title = title;

    // Fire Clicky page-view on genuine (non-replace) navigations only
    if (!doReplace && typeof window.clicky !== "undefined") {
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
      settings.top_versions = DEFAULT_TOP_VERSIONS.slice()
    if (settings.top_outlines.length !== 5)
      settings.top_outlines = DEFAULT_TOP_OUTLINES.slice()
    if (settings.top_structures.length !== 5 || settings.top_structures.indexOf("bifid")>=0)
      settings.top_structures = DEFAULT_TOP_STRUCTURES.slice()

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

      this.setState(this.validateSettings(settings), callback) // 17656
    }
  }

  handlePopState(pathname) {
    if (this.state.ready !== true) return
    var parsed = parseRoute(pathname)

    // Seed with the current structure/outline/version so a Back to a URL that
    // omits them keeps the session choice instead of validateSettings resetting
    // to the meta-first entry (e.g. bare "/" would otherwise snap to IINST).
    var settings = this.getSettingsFromUrl(
      {
        structure: this.state.structure,
        outline: this.state.outline,
        version: this.state.version,
        // Preserve the last chosen commentary source so a later UI-open after a
        // Back doesn't fall back to the meta-first source (validateSettings only
        // resets it when undefined).
        commentarySource: this.state.commentarySource
      },
      pathname
    )

    // getSettingsFromUrl only SETS the modes present in the URL. When the user
    // navigates BACK from a tag/search/hebrew/commentary view to a plain verse
    // URL, the old mode must be explicitly cleared — otherwise the stale state
    // makes setActiveVerse's guards (App.js:1714-1725) no-op the update, or the
    // rebuilt URL reverts the Back. Clear every mode absent from THIS url.
    if (parsed.tag === undefined) settings.selected_tag = null
    if (parsed.search === undefined) {
      settings.searchQuery = null
      settings.searchMode = false
      settings.urlSearch = false
    }
    if (parsed.hebrew === undefined) {
      settings.hebrewStrongIndex = null
      settings.hebrewSearch = false
      settings.hebrewWord = null
    }
    if (parsed.commentarySource === undefined) settings.commentaryMode = false

    settings = this.validateSettings(settings)

    // Dispatch the restore callback by what the URL actually contains, matching
    // getSettingsFromUrl's precedence (hebrew > search > tag > verse). Keyed on
    // `parsed` (not the settings values) so a cleared null field can't mis-route.
    var callback
    if (parsed.hebrew !== undefined)
      callback = this.searchHebrewWord.bind(this, settings.hebrewStrongIndex, true)
    else if (parsed.search !== undefined && settings.searchQuery)
      callback = this.search.bind(this, settings.searchQuery, true)
    else if (parsed.tag !== undefined && settings.selected_tag)
      callback = this.setActiveTag.bind(this, settings.selected_tag, true)
    else
      callback = this.setActiveVerse.bind(
        this,
        settings.active_verse_id,
        undefined,
        undefined,
        true,
        "init"
      )

    this.setState(settings, callback)
  }

  keyDown(e) {
    // Build the context snapshot resolveKey needs, then let the declarative
    // keymap (src/state/keymap.js) decide which action — if any — this key
    // triggers. The DOM read (searchbox focus) stays here in the impure caller;
    // resolveKey itself is pure. See keymap.js for the full key -> action table.
    const context = {
      audioActive: this.state.audioState !== null,
      searchboxFocused:
        typeof document !== "undefined" &&
        document.getElementById("searchbox") === document.activeElement,
      commentaryAudioMode: this.state.commentaryAudioMode,
      searchMode: this.state.searchMode,
      preSearchMode: this.state.preSearchMode,
    }

    const action = resolveKey(e, context)
    if (action === null) return false

    const handler = this.keyboardActions[action]
    if (handler === undefined) return false

    // Every action calls preventDefault except the "soft" ones (Escape and the
    // type-to-search triggers), which the legacy handler left to the browser.
    if (!NO_PREVENT_DEFAULT_ACTIONS.has(action)) e.preventDefault()

    return handler()
  }

  // ── State-based navigation (audit P2.3) ────────────────────────────────
  // These replace the old clickElementID pattern, where keyboard actions were
  // dispatched by finding a rendered button and click()ing it. Each method is
  // the same state transition the corresponding button performs.

  // Mirrors AudioToolbar clickVerse (#audio_verse).
  toggleVerseAudio() {
    var verseDisabled =
      globalData.meta.version[this.state.version].audio !== 1 &&
      this.state.hebrewMode === false
    if (verseDisabled) return false
    if (this.state.audioState !== null) {
      this.setAudioMode(AUDIO_MODE.IDLE, this.setUrl.bind(this))
    } else {
      this.setAudioMode(
        AUDIO_MODE.VERSE_LOADING,
        {audioPointer: 0, selected_verse_id: null, commentary_audio_verse_range: []},
        this.setUrl.bind(this)
      )
    }
  }

  // Mirrors AudioToolbar clickCommentary (#audio_commentary).
  toggleCommentaryAudio() {
    if (this.state.audioState !== null) {
      this.setAudioMode(AUDIO_MODE.IDLE, {commentary_audio_verse_range: []})
    } else {
      this.setTagPanel(TAG_PANEL.CLOSED)
      this.setAudioMode(AUDIO_MODE.COMMENTARY_LOADING, {audioPointer: 0})
    }
  }

  // Mirrors AudioToolbar clickRead (#commentary).
  toggleCommentaryRead() {
    this.setTagPanel(this.state.tagMode ? TAG_PANEL.VERSES : TAG_PANEL.CLOSED)
    this.setState(
      {
        commentaryMode: !this.state.commentaryMode,
        commentary_verse_range: [],
        selected_verse_id: null,
        commentary_verse_id: this.state.active_verse_id
      },
      this.setUrl.bind(this)
    )
  }

  // Mirrors the #hebIcon / #seefax toggles (Verse.js / Hebrew.js).
  toggleHebrew() {
    if (this.state.hebrewMode && !this.state.hebrewFax)
      return this.setState({hebrewFax: true})
    if (this.state.hebrewMode)
      return this.setState(
        {hebrewMode: false, hebrewFax: false},
        this.clearTag.bind(this)
      )
    if (this.state.hebrewReady !== true) return false
    this.setState({hebrewMode: true}, this.setUrl.bind(this))
  }

  // Ported verbatim from Commentary.js move() (the #com_prev/#com_next
  // handlers) so keyboard stepping no longer clicks those buttons.
  moveCommentary(val) {
    var thisid = this.state.commentaryID
    var list = Object.keys(globalData.commentary.idIndex).map(Number)
    var index = list.indexOf(thisid)
    var new_id = list[index + val]
    if (list.indexOf(new_id) === -1) new_id = list[0]
    if (globalData.commentary.comData[new_id] === null) return false

    var item = globalData.commentary.idIndex[new_id]
    var range = []
    for (var i = item.verse_id; i < item.verse_id + item.verse_count; i++)
      range.push(i)
    if (range.length === 0) range = this.state.commentary_verse_range
    this.setState({
      commentaryID: new_id,
      selected_verse_id: null,
      commentary_verse_range: range,
      commentarySource: item.source,
      commentary_verse_id: item.verse_ids[0]
    })
  }

  cycleSection(incr) {
    if (incr === undefined) incr = 1
    var index = parseInt(this.state.highlighted_section_index, 10) + incr
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
    var index = parseInt(this.state.highlighted_heading_index, 10) + incr
    if (index > globalData["outlines"][this.state.outline].length - 1) index = 0
    if (globalData["outlines"][this.state.outline][index] === undefined)
      return false
    var verse = globalData["outlines"][this.state.outline][index].verses[0]
    this.setActiveVerse(verse, undefined, undefined, undefined, "arrow")
  }

  cycleTag(incr) {
    // Advance through the active verse's tags (the chips whose click handler
    // is setActiveTag) — was a DOM walk over .tag_highlighted+.taglink.
    this.moreTags()
    var tags = this.getVerseTags(this.state.active_verse_id) || []
    if (tags.length === 0) return false
    var i = tags.indexOf(this.state.selected_tag)
    var next = i === -1 || i + 1 >= tags.length ? tags[0] : tags[i + 1]
    this.setActiveTag(next)
  }

  cycleVersionViews() {
    var i = this.state.version_views + 1
    if (i > 5) i = 1
    this.setState({version_views: i}, this.saveSettings.bind(this))
  }

  cycleHebrewWord(incr) {
    // Step through the verse's Hebrew words by data order (the same order the
    // #hebrew_text spans render in) — was a previousElementSibling DOM walk.
    var words =
      globalData.hebrew && globalData.hebrew.verses
        ? globalData.hebrew.verses[this.state.active_verse_id]
        : undefined
    if (!words || words.length === 0) return false
    var idx = -1
    for (var i = 0; i < words.length; i++) {
      if (words[i].strong === this.state.hebrewStrongIndex) {
        idx = i
        break
      }
    }
    var target
    if (incr === 1) {
      // next word; past the end (or nothing active) wraps to the first —
      // matching the old "no next sibling → click the first span" fallback
      target = idx === -1 || idx + 1 >= words.length ? words[0] : words[idx + 1]
    } else {
      if (idx <= 0) return false // old walk bailed with no previous sibling
      target = words[idx - 1]
    }
    this.searchHebrewWord(target.strong)
  }

  left() {
    //if hebrew
    if (this.state.hebrewMode) return this.cycleHebrewWord(-1)
    //if commentary step to previous commentary
    if (this.state.commentaryMode) return this.moveCommentary(-1)
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
    //if commentary step to next commentary
    if (this.state.commentaryMode) return this.moveCommentary(1)

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

  // The ordered list of parent tags as the tag tree renders them: top-level
  // branches in data order, descending only along the currently-showcased
  // path (the tree auto-opens ancestors of the showcase tag). Replaces
  // reading .parentTag innerText out of the DOM.
  visibleParentTags() {
    var g = globalData.tags
    var open = {}
    var showcase = this.state.showcase_tag
    if (showcase && g.tagIndex[showcase]) {
      open[showcase] = true
      var parents = g.tagIndex[showcase].parents || []
      for (var p = 0; p < parents.length; p++) open[parents[p]] = true
    }
    var list = []
    var walk = function(base) {
      var children = g.parentTagIndex[base]
      if (children === undefined) return
      for (var i = 0; i < children.length; i++) {
        var c = children[i]
        if (g.parentTagIndex[c] === undefined) continue // leaf, not a branch
        list.push(c)
        if (open[c]) walk(c)
      }
    }
    walk("root")
    return list
  }

  tagDown() {
    var list = this.visibleParentTags()
    var i = list.indexOf(this.state.showcase_tag)
    if (list[i + 1] === undefined) return this.showcaseTag("Structures")
    this.showcaseTag(list[i + 1])
  }

  tagUp() {
    var list = this.visibleParentTags()
    var i = list.indexOf(this.state.showcase_tag)
    if (list[i - 1] === undefined) return this.showcaseTag("Structures")
    this.showcaseTag(list[i - 1])
  }

  tagRight() {
    if (!this.state.tagMode) {
      // Same transition the #tag_next button performs (Tags.js setTag):
      // advance to the focal tag's `next` when it has one.
      var focal = getFocalTag(this.state).tag
      var focalMeta = focal !== null ? globalData.tags.tagIndex[focal] : undefined
      if (focalMeta !== undefined && focalMeta.next !== undefined) {
        if (this.getTagData(focalMeta.next) !== undefined)
          this.setActiveTag(focalMeta.next, null, true)
        return
      }
    }
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
    if (!this.state.tagMode) {
      // Same transition the #tag_prev button performs.
      var focal = getFocalTag(this.state).tag
      var focalMeta = focal !== null ? globalData.tags.tagIndex[focal] : undefined
      if (focalMeta !== undefined && focalMeta.prev !== undefined) {
        if (this.getTagData(focalMeta.prev) !== undefined)
          this.setActiveTag(focalMeta.prev, null, true)
        return
      }
    }
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
      	p1 = parseInt(p1, 10);
      	p2 = parseInt(p2, 10);
        var vs = []
        for (var i = p1; i <= p2; i++) {
          vs.push(i)
        }
        return vs.join(",")
      })

      var g = globalData
      if (chapter) {
        var parts = ref.match(/(.*?)[.:](.*)/)
        var ch = parseInt(parts[1], 10)
        var vs = parts[2].split(/\s*,\s*/g)
        for (x in vs) {
          var v = parseInt(vs[x], 10)
          for (var verse_id in g.index) {
            if (
              g.index[verse_id].chapter === ch &&
              g.index[verse_id].verse === v
            )
              matches.push(parseInt(verse_id, 10))
          }
        }
        //console.log("chapter with vs",ch,vs,matches);
      } else {
        var chs = ref.split(/\s*,\s*/g)
        for (x in chs) {
          ch = parseInt(chs[x], 10)
          for (verse_id in g.index) {
            if (g.index[verse_id].chapter === ch)
              matches.push(parseInt(verse_id, 10))
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
          matches.push(parseInt(x, 10))
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
      this.state.highlighted_verse_range.indexOf(parseInt(verse_id, 10)) < 0 &&
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
    


    if (parseInt(this.state.selected_verse_id, 10) === parseInt(verse_id, 10))
      return this.unSelectVerse()
    if (
      this.state.selected_tag !== null &&
      this.state.highlighted_verse_range.indexOf(parseInt(verse_id, 10)) < 0
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

    height += parseInt(style.marginTop, 10) + parseInt(style.marginBottom, 10)
    return height + 0
  }

  // TagBox now decides its own className (showfull / overflowing) based on
  // state.more_tags and a useEffect-driven measurement, so this is a no-op
  // kept for back-compat with the setActiveVerse callback below.
  tagOverflow() {}

  moreTags() {
    if (this.state.more_tags === true) return false
    this.setState({more_tags: true})
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
    
    fetchData(this.state.rootURL+"./core/core.txt")
      .then(unzipped => {
        // Normalize + index the decoded core with a pure, deterministic pass
        // (no shuffle, no globalData, no `this`), then merge the result into
        // the store. See src/data/normalizeCoreData.js.
        var result = normalizeCoreData(unzipped, subsite, unzipped["custom"])
        for (var k in result.core) globalData[k] = result.core[k]

        var s = this.state

        // Apply the blacklist's version/outline/structure removals to the
        // component-state top_* arrays (the data-side removals already happened
        // inside normalizeCoreData).
        var removed = result.removed
        for (var ri in removed.version) {
          var rvIdx = s.top_versions.indexOf(removed.version[ri])
          if (rvIdx >= 0) s.top_versions.splice(rvIdx, 1)
        }
        for (ri in removed.outline) {
          var roIdx = s.top_outlines.indexOf(removed.outline[ri])
          if (roIdx >= 0) s.top_outlines.splice(roIdx, 1)
        }
        for (ri in removed.structure) {
          var rsIdx = s.top_structures.indexOf(removed.structure[ri])
          if (rsIdx >= 0) s.top_structures.splice(rsIdx, 1)
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

        // (Structure/outline/commentary/audio/tag indexing + verse expansion
        // now happens deterministically inside normalizeCoreData above.)

        this.pull("tags")
        this.checkLoaded()
        fetchData(this.state.rootURL+"./core/tags_hl.txt")
          .then(hdata => {
            for (var x in hdata) {
              for (var y in hdata[x]) {
                if (globalData["tags"]["tagStructure"][x] !== undefined)
                  globalData["tags"]["tagStructure"][x][y]["highlight"] =
                    hdata[x][y]
              }
            }
            this.setState({tagsHLReady: true})
          })
          .catch(err => console.warn("tags_hl failed", err))

        this.pull("core")
        this.checkLoaded()
      })
      .catch(this.handleLoadError("core"))

    fetchData(this.state.rootURL+"./text/words_HEB.txt")
      .then(data => {
        globalData["hebrew"] = data
        if (parseRoute(window.location.pathname).hebrew !== undefined) {
          this.pull("hebrew")
          this.checkLoaded()
        }
        this.setState({hebrewReady: true})
      })
      .catch(err => {
        // Only fatal when a hebrew route is waiting on it (blocks checkLoaded)
        if (parseRoute(window.location.pathname).hebrew !== undefined)
          this.handleLoadError("hebrew")(err)
        else console.warn("words_HEB failed", err)
      })


    fetchData(this.state.rootURL+"./text/verses_" + this.state.version.toUpperCase() + ".txt")
      .then(data => {
        globalData["text"][this.state.version] = data
        this.pull("version")
        this.checkLoaded()
      })
      .catch(this.handleLoadError("version"))

    this.loadTopVersions()
  }

  loadTopVersions() {
    // Load the side-by-side alternate translations as soon as the main thread
    // is idle after first paint — was a hard 3s setTimeout that left the
    // side-by-side cells on "Loading..." then popped content in.
    var run = function() {
      for (var x in this.state.top_versions) {
        var ver = this.state.top_versions[x]
        if (ver === this.state.version) continue
        const const_ver = ver
        fetchData(this.state.rootURL+"./text/verses_" + const_ver.toUpperCase() + ".txt")
          .then(data => {
            globalData["text"][const_ver] = data
            this.setActiveVerse(
              this.state.active_verse_id,
              undefined,
              undefined,
              true,
              "init"
            )
          })
          .catch(err => console.warn("alt version load failed", err))
      }
    }.bind(this)

    if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(run, { timeout: 2000 })
    } else {
      setTimeout(run, 200)
    }
  }

  // Thin delegate to the extracted pure helper, kept because components call
  // app.verseDatatoArray (e.g. commentaryReplacer).
  verseDatatoArray(versedata, src) {
    return verseDatatoArray(versedata, src)
  }

  // Load a version's text into globalData.text without switching the primary
  // version. Used by the side-by-side translations panel, which would otherwise
  // sit on a "Loading..." cell forever — nothing else triggers the fetch.
  loadVersionText(shortcode) {
    if (!shortcode) return
    if (globalData["text"][shortcode] !== undefined) return
    this._versionLoads = this._versionLoads || {}
    if (this._versionLoads[shortcode]) return
    this._versionLoads[shortcode] = true
    fetchData(this.state.rootURL + "./text/verses_" + shortcode + ".txt")
      .then(function(data) {
        globalData["text"][shortcode] = data
        this._versionLoads[shortcode] = false
        this.forceUpdate()
      }.bind(this))
      .catch(function() { this._versionLoads[shortcode] = false }.bind(this))
  }

  loadVersion(shortcode) {
    if (shortcode === undefined) shortcode = "KJV"
    this.setState({ui_version_loading: true})
    let image = new Image()
    image.src = require("./img/versions/" + shortcode.toLowerCase() + ".jpg")
    return fetchData(this.state.rootURL+"./text/verses_" + shortcode + ".txt")
      .then(data => {
        globalData["text"][shortcode] = data
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
      .catch(err => {
        console.warn("version load failed", err)
        this.setState({ui_version_loading: false})
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
      // highlightReadMore removed: ChiasticBlock / TagParallel in Tags.js now
      // own their own "readmore active" state via internal useEffect measurement
      // of the highlighted verse's visibility (no cross-tree DOM mutation).
      // Replace (don't push) on high-frequency stepping AND on "init": the very
      // first load's history entry is the raw URL the user arrived on (bare "/",
      // a legacy short form, or mixed case), which buildRoute canonicalizes.
      // Replacing it means there is no dangling non-canonical entry to Back onto
      // that would otherwise defeat the same-path guard and truncate Forward.
      var replaceUrl = source === "arrow" || source === "audio" || source === "comaudio" || source === "init";
      this.setUrl(replaceUrl)
      if (this.state.hebrewSearch && this.state.hebrewStrongIndex !== null) {
        this.searchHebrewWord(this.state.hebrewStrongIndex)
      } else if (this.state.searchMode && source === "newversion") {
        this.search(this.state.searchQuery)
      }
      this.triggerAudio();
      if (source === "init") this.setActiveVersion(this.state.version)
      // On mobile, activating a verse (tap or arrow) means the user wants to
      // read it — surface the reading pane. Not on the initial load.
      if (
        source !== "init" &&
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(max-width: 1023px)").matches &&
        this.state.mobilePane !== "read"
      ) {
        this.setState({ mobilePane: "read" })
      }
    })
  }

  // No-op stub kept for back-compat: the body previously click()'d
  // #audio_verse on a state flip, but that path is now dead. Callers
  // still reference this method, so we preserve the flag-reset behavior
  // without invoking any audio side effect.
  triggerAudio() {
    if (this.state.triggerAudio) {
      this.setState({triggerAudio: false})
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
    verse_id = parseInt(verse_id, 10)
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

  // highlightReadMore was removed in the DOM-mutation audit cleanup.
  // It used to querySelector across the whole #text container and overwrite
  // .readmore className on elements owned by ChiasticBlock / TagParallel in
  // Tags.js, fighting React's render. The child components now derive their
  // own "readmore active" state via useEffect + checkInView on their own
  // highlighted verse. Call site in setActiveVerse was also removed.

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
    // Helper: only setState when the value actually changes, to avoid render loops
    // (checkFloater is invoked from setActiveVerse's setState callback AND from
    // TagBlocks' unconditional useEffect — see Tags.js ~line 309).
    var setFloaterVisible = (nextVisible) => {
      if (this.state.floaterVisible !== nextVisible) {
        this.setState({floaterVisible: nextVisible})
      }
    }

    if (this.state.selected_tag === null) {
      setFloaterVisible(false)
      return false
    }
    var container = document.getElementById("text")
    if (container === null) return false
    var h = container.querySelectorAll(".tag_desc_highlighted")
    if (h.length < 1) {
      setFloaterVisible(false)
      return false
    }
    var element = h[0]

    var versionMetaEl = document.getElementById("version_meta")
    var metaOpen =
      versionMetaEl !== null && versionMetaEl.classList[1] === "visible"

    var blueBarisVisible = this.checkInView(container, element)
    // TODO(audit-followup): parentNode.lastChild here is the same kind of
    // brittle DOM walk that B1 replaced for .previousSibling chains. The
    // floater positioning logic could be migrated to a [data-floater-content]
    // selector, but doing so requires reshaping the verse renderer; deferred.
    var textNotVisible = !this.checkInView(
      container,
      element.parentNode.lastChild,
      true
    )

    var shouldHide =
      blueBarisVisible ||
      textNotVisible ||
      metaOpen ||
      this.state.allCollapsed
    setFloaterVisible(!shouldHide)
    // TODO: TagFloater in Tags.js should `return null` (or otherwise unmount)
    // when state.floaterVisible is false. App now drives floater visibility
    // via state instead of mutating element.style.display.

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

    if ([null, 0, undefined].indexOf(newVerseId) > -1)
      console.warn("showcaseTag: no valid verse for tag", newVerseId)

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
  setAudioMode(mode, extraState, callback) {
    // Allow setAudioMode(mode, callback) by detecting when extraState is a function.
    if (typeof extraState === "function") {
      callback = extraState;
      extraState = null;
    }
    var stateUpdate = Object.assign({
      audioMode: mode,
      audioState: legacyAudioState(mode),
      commentaryAudioMode: legacyCommentaryAudioMode(mode),
    }, extraState || {});
    this.setState(stateUpdate, callback);
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
    // Verse list comes from the pure, memoized selector — no longer mutates the
    // shared tagIndex entry (audit P1.8). Return a COPY so callers can't mutate
    // the store through the returned object.
    var verses = getTagVerses(globalData["tags"], tagName)
    if (verses.length === 0 &&
        globalData["tags"]["tagChildren"][tagName] === undefined &&
        globalData["tags"]["parentTagIndex"][tagName] === undefined &&
        globalData["tags"]["superRefs"][tagName] === undefined &&
        globalData["tags"]["tagStructure"][tagName] === undefined) {
      // Leaf with no verses at all — preserve the legacy error recovery.
      return this.clearTag()
    }
    return Object.assign({}, g, { verses: verses })
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
            if (parseInt(arr[i], 10) -1  !== parseInt(previous, 10)) {
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
          matches.push(parseInt(verse_id, 10))
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

  searchHebrewWord(strong) {
    var matches = []
    var query = ""
    var verses = globalData.hebrew.verses
    for (var verse_id in verses) {
      for (var word_id in verses[verse_id]) {
        if (verses[verse_id][word_id].strong === strong) {
          matches.push(parseInt(verse_id, 10))
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

}
export default App

export function SGLink({reference}) {
  if (reference === undefined) return null
  var link = reference.replace(/\s+/g, ".").toLowerCase()
  return (
    <a
      className="ref"
      href={"https://scripture.guide/" + link}
      target="_blank"
      rel="noopener noreferrer">
      {reference}
    </a>
  )
}
