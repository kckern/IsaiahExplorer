import { normalizeCoreData, verseDatatoArray } from "./normalizeCoreData"

// Fresh fixture per call: normalizeCoreData mutates the object it is handed
// (the throwaway decoded-core), so every assertion needs its own copy.
function makeCore() {
  return {
    structures: {
      // one structure, one section, one segment encoding verses 5,6,7
      chiasm: [{ title: "A", verses: { "0": { "5": 3 } } }]
    },
    outlines: {
      // one outline, one heading encoding verses 10,11
      themes: [{ title: "T", verses: { "10": 2 } }]
    },
    meta: {
      version: { KJV: {} },
      commentary: { rashi: {}, calvin: {} }
    },
    commentary: {
      comIndex: { "5": { rashi: [1], calvin: [2] } },
      comOrder: ["rashi", "calvin"],
      comSources: { rashi: {}, calvin: {} }
    },
    commentary_audio: { files: {} },
    tags: {
      tagIndex: { faith: { parents: ["root"], verses: { "20": 1 } } },
      tagStructure: {},
      superRefs: { Structures: { "1": 3 } },
      verseTagIndex: { "1": ["faith", "hope", "love"] }
    }
  }
}

// Subsite map: "spu" blacklists the "calvin" commentary source and the "esv"
// version; "default" is a no-op.
function makeCustoms() {
  return {
    default: {},
    spu: { type: "blacklist", com: ["calvin"], version: ["esv"] }
  }
}

describe("verseDatatoArray", () => {
  it("expands a range object into a flat verse-id list", () => {
    expect(verseDatatoArray({ "5": 3 })).toEqual([5, 6, 7])
  })
})

describe("normalizeCoreData", () => {
  it("expands structure and outline verse ranges into arrays and builds indexes", () => {
    const { core } = normalizeCoreData(makeCore(), "default", makeCustoms())

    // (a) structure/outline verses expanded to arrays
    expect(core.structures.chiasm[0].verses[0]).toEqual([5, 6, 7])
    expect(core.outlines.themes[0].verses).toEqual([10, 11])

    // indexes built off those expansions
    expect(core.structureIndex[5].chiasm).toBe("0")
    expect(core.outlineIndex[10].themes).toBe("0")

    // tag verse ranges expanded, siblings built
    expect(core.tags.tagIndex.faith.verses).toEqual([20])
    expect(core.tags.superRefs.Structures).toEqual([1, 2, 3])
    expect(core.tags.tagSiblings.root).toEqual(["faith"])
  })

  it("removes a blacklisted commentary source and reports removed versions", () => {
    const { core, removed } = normalizeCoreData(makeCore(), "spu", makeCustoms())

    // (b) blacklisted commentary source gone everywhere
    expect(core.commentary.comOrder).toEqual(["rashi"])
    expect(core.commentary.comIndex["5"]).toEqual({ rashi: [1] })
    expect(core.commentary.comSources.calvin).toBeUndefined()
    expect(core.meta.commentary.calvin).toBeUndefined()

    // version removal is reported for the caller to prune component state
    expect(removed.version).toEqual(["esv"])
  })

  it("does not shuffle verseTagIndex (order is the deterministic data order)", () => {
    const { core } = normalizeCoreData(makeCore(), "default", makeCustoms())
    expect(core.tags.verseTagIndex["1"]).toEqual(["faith", "hope", "love"])
  })

  it("is deterministic: same input yields deeply-equal output", () => {
    const a = normalizeCoreData(makeCore(), "default", makeCustoms())
    const b = normalizeCoreData(makeCore(), "default", makeCustoms())
    expect(a).toEqual(b)
  })
})
