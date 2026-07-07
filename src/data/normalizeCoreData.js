// Pure, deterministic normalizer for the decoded core dataset (audit Task 35).
//
// Extracted verbatim from App.loadCore. Given the decoded core object, the
// subsite key, and the raw customs map (core.custom), it:
//   1. resolves + applies the subsite blacklist,
//   2. expands the range-encoded verse data into flat verse-id arrays, and
//   3. builds the lookup indexes (structureIndex, outlineIndex, commentary
//      idIndex, commentary_audio index, tag siblings, ...).
//
// It uses NO `this`, NO globalData singleton, and NO Math.random — the same
// input yields deeply-equal output every time. (The old load-time shuffle of
// verseTagIndex is gone; per-verse tag order is now the deterministic data
// order — audit P1.9.)
//
// The passed-in `core` is mutated in place and returned (it is the throwaway
// object the fetch just decoded, never the live store), so no global state is
// touched. State-array pruning for blacklisted versions/outlines/structures is
// NOT done here — those shortcodes are returned in `removed` for the caller to
// apply to component state.

// Expand the compact range-encoded verse data into a flat array of verse ids.
// Kept identical to App.verseDatatoArray so both call sites agree.
export function verseDatatoArray(versedata, src) {
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
        var vid = parseInt(i, 10)
        for (var j = vid; j < vid + item[i]; j++) {
          verses.push(j)
        }
      }
    }
  } //object
  else {
    for (i in versedata) {
      vid = parseInt(i, 10)
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

// Resolve a subsite's customs object, walking the `base` chain and merging the
// array extras. Ported verbatim from App.loadCustoms (de-`this`-ed).
function loadCustoms(key, data) {
  if (data === undefined) return {}

  if (data[key] === undefined) key = "default"
  var output
  if (data[key] === undefined) return {}
  if (data[key].base !== undefined) {
    output = loadCustoms(data[key].base, data)
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

export function normalizeCoreData(core, subsite, customs) {
  // Guard the top-level containers so a minimal fixture need not supply every
  // section; in production the decoded core carries them all. structureIndex /
  // outlineIndex start empty and are built below (they used to be seeded by
  // globals.js before the spread into the store).
  core.structureIndex = core.structureIndex || {}
  core.outlineIndex = core.outlineIndex || {}
  core.structures = core.structures || {}
  core.outlines = core.outlines || {}
  core.meta = core.meta || {}
  core.commentary = core.commentary || {}
  core.commentary_audio = core.commentary_audio || {}
  core.tags = core.tags || {}

  var removed = {version: [], outline: [], structure: []}

  //CUSTOMIZE
  var c = loadCustoms(subsite, customs)

  if (c.type === "blacklist")
    for (var key in c) {
      if (!Array.isArray(c[key])) continue
      for (var y in c[key]) {
        var shortcode = c[key][y]
        if (key === "com") {
          //comIndex
          for (var verse_id in core.commentary.comIndex)
            delete core.commentary.comIndex[verse_id][shortcode]
          //comOrder
          var index = core.commentary.comOrder.indexOf(shortcode)
          core.commentary.comOrder.splice(index, 1)
          //comOrder
          delete core.commentary.comSources[shortcode]
          delete core.meta.commentary[shortcode]
        }
        if (key === "comaudio") {
          delete core.commentary_audio.files[shortcode]
          delete core.meta.audiocom[shortcode]
        }
        if (key === "version") {
          delete core.meta.version[shortcode.toUpperCase()]
          removed.version.push(shortcode)
        }
        if (key === "outline") {
          delete core.meta.outline[shortcode]
          delete core.outlines[shortcode]
          removed.outline.push(shortcode)
        }
        if (key === "structure") {
          delete core.meta.structure[shortcode]
          delete core.structures[shortcode]
          removed.structure.push(shortcode)
        }
        if (key === "tag") {
          var list = [shortcode]
          var children = core.tags.tagChildren[shortcode]
          if (Array.isArray(children)) list = list.concat(children)
          for (var a in list) {
            var tagName = list[a]
            for (verse_id in core.tags.verseTagIndex) {
              index = core.tags.verseTagIndex[verse_id].indexOf(tagName)
              if (index >= 0)
                core.tags.verseTagIndex[verse_id].splice(index, 1)
            }
            for (var parentTag in core.tags.tagChildren) {
              index = core.tags.tagChildren[parentTag].indexOf(tagName)
              if (index >= 0)
                core.tags.tagChildren[parentTag].splice(index, 1)
            }

            for (parentTag in core.tags.parentTagIndex) {
              index = core.tags.parentTagIndex[parentTag].indexOf(tagName)
              if (index >= 0)
                core.tags.parentTagIndex[parentTag].splice(index, 1)
            }

            for (var sibTag in core.tags.tagIndex) {
              if (core.tags.tagIndex[sibTag].prev === tagName)
                delete core.tags.tagIndex[sibTag].prev
              if (core.tags.tagIndex[sibTag].next === tagName)
                delete core.tags.tagIndex[sibTag].next
            }

            delete core.tags.tagIndex[tagName]
            delete core.tags.tagStructure[tagName]
            delete core.tags.tagChildren[tagName]
            delete core.tags.superRefs[tagName]
            delete core.tags.parentTagIndex[tagName]
          }
        }
      }
    }

  //STRUCTURES

  var structures = core.structures
  for (var structure_id in structures) {
    for (var i in structures[structure_id]) {
      for (var seg in structures[structure_id][i].verses) {
        structures[structure_id][i].verses[seg] = verseDatatoArray(
          structures[structure_id][i].verses[seg]
        )
        for (var j in structures[structure_id][i].verses[seg]) {
          var verse = structures[structure_id][i].verses[seg][j]
          if (!(verse in core.structureIndex)) {
            core.structureIndex[verse] = {}
          }
          core.structureIndex[verse][structure_id] = i
        }
      }
    }
  }

  //OUTLINES

  var outlines = core.outlines
  for (var outline_id in outlines) {
    for (i in outlines[outline_id]) {
      core.outlines[outline_id][i].verses = outlines[outline_id][
        i
      ].verses = verseDatatoArray(outlines[outline_id][i].verses) //convert to
      for (j in outlines[outline_id][i].verses) {
        verse = outlines[outline_id][i].verses[j]
        if (!(verse in core.outlineIndex)) {
          core.outlineIndex[verse] = {}
        }
        core.outlineIndex[verse][outline_id] = i
      }
    }
  }

  // COM AUDIO

  core.commentary_audio.index = {}
  var dirs = core.commentary_audio.files
  for (shortcode in dirs) {
    for (var filename in dirs[shortcode]) {
      var verses = verseDatatoArray(dirs[shortcode][filename])
      dirs[shortcode][filename] = verses
      for (var x in verses) {
        if (core.commentary_audio.index[verses[x]] === undefined)
          core.commentary_audio.index[verses[x]] = {}
        if (core.commentary_audio.index[verses[x]][shortcode] === undefined)
          core.commentary_audio.index[verses[x]][shortcode] = []
        core.commentary_audio.index[verses[x]][shortcode].push(filename)
      }
    }
  }

  // COMMENTARY

  core.commentary.idIndex = {}
  var comIndex = core.commentary.comIndex

  for (verse_id in comIndex) {
    for (var source in comIndex[verse_id]) {
      for (i in comIndex[verse_id][source]) {
        var thisid = comIndex[verse_id][source][i]
        if (core.commentary.idIndex[thisid] === undefined)
          core.commentary.idIndex[thisid] = {
            source: null,
            verse_ids: []
          }
        core.commentary.idIndex[thisid].source = source
        core.commentary.idIndex[thisid].verse_ids.push(parseInt(verse_id, 10))
      }
    }
  }

  //TAGS

  core.tags.tagSiblings = {}
  core.tags.tagBranches = []
  // NOTE: verseTagIndex is intentionally NOT shuffled — per-verse tag order is
  // now the deterministic data order (audit P1.9). A component that wants a
  // varied display order can shuffle a copy at render time.
  for (x in core.tags.tagIndex) {
    core.tags.tagIndex[x].verses = verseDatatoArray(core.tags.tagIndex[x].verses)

    var p = core.tags.tagIndex[x].parents[0]
    if (core.tags.tagSiblings[p] === undefined) core.tags.tagSiblings[p] = []
    core.tags.tagSiblings[p].push(x)
  }
  for (x in core.tags.tagStructure) {
    for (y in core.tags.tagStructure[x]) {
      core.tags.tagStructure[x][y].verses = verseDatatoArray(
        core.tags.tagStructure[x][y].verses
      )
    }
  }
  for (x in core.tags.superRefs)
    core.tags.superRefs[x] = verseDatatoArray(core.tags.superRefs[x])

  return {core: core, removed: removed}
}
