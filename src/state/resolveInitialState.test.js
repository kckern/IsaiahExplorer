import { resolveInitialState } from "./resolveInitialState"
import {
  DEFAULT_TOP_VERSIONS,
  DEFAULT_TOP_OUTLINES,
  DEFAULT_TOP_STRUCTURES,
  DEFAULT_VERSION
} from "../routing/defaults"

describe("resolveInitialState", () => {
  test("empty storage + bare URL yields the shared defaults (KJV)", () => {
    const s = resolveInitialState(null, "/")
    expect(s.version).toBe(DEFAULT_VERSION)
    expect(s.outline).toBe(DEFAULT_TOP_OUTLINES[0])
    expect(s.structure).toBe(DEFAULT_TOP_STRUCTURES[0])
    expect(s.top_versions).toEqual(DEFAULT_TOP_VERSIONS)
  })

  test("malformed stored JSON falls back to defaults", () => {
    const s = resolveInitialState("{not json!!", "/")
    expect(s.version).toBe(DEFAULT_VERSION)
  })

  test("stored preferences survive", () => {
    const stored = JSON.stringify({
      version: "NRSV",
      outline: "niv",
      structure: "authorship",
      top_versions: ["NRSV", "KJV", "NIV", "NASB", "IINST"],
      top_outlines: ["niv", "chapters", "mev", "nrsv", "nasb"],
      top_structures: ["authorship", "whole", "bibleproject", "7part", "wikipedia"]
    })
    const s = resolveInitialState(stored, "/")
    expect(s.version).toBe("NRSV")
    expect(s.outline).toBe("niv")
    expect(s.structure).toBe("authorship")
    expect(s.top_versions[0]).toBe("NRSV")
  })

  test("legacy-poisoned top lists reset to defaults (HBRS / bifid / wrong length)", () => {
    const stored = JSON.stringify({
      top_versions: ["HBRS", "KJV", "NIV", "NASB", "IINST"],
      top_outlines: ["chapters"],
      top_structures: ["bifid", "whole", "bibleproject", "7part", "wikipedia"]
    })
    const s = resolveInitialState(stored, "/")
    expect(s.top_versions).toEqual(DEFAULT_TOP_VERSIONS)
    expect(s.top_outlines).toEqual(DEFAULT_TOP_OUTLINES)
    expect(s.top_structures).toEqual(DEFAULT_TOP_STRUCTURES)
  })

  test("URL version override beats the stored version", () => {
    const stored = JSON.stringify({ version: "NRSV" })
    const s = resolveInitialState(stored, "/whole/chapters/niv/5/4")
    expect(s.version).toBe("NIV")
  })

  test("URL search sets query + urlSearch and leaves searchMode off", () => {
    const s = resolveInitialState(null, "/whole/chapters/kjv/search.comfort/40/1")
    expect(s.searchQuery).toBe("comfort")
    expect(s.searchMode).toBe(false)
    expect(s.urlSearch).toBe(true)
  })

  test("URL hebrew sets the strong index", () => {
    const s = resolveInitialState(null, "/whole/chapters/kjv/hebrew.2490/53/5")
    expect(s.hebrewStrongIndex).toBe(2490)
  })

  test("commentary_order head becomes the commentary source", () => {
    const stored = JSON.stringify({ commentary_order: ["barnes", "calvin"] })
    const s = resolveInitialState(stored, "/")
    expect(s.commentarySource).toBe("barnes")
  })

  test("pure: same inputs, same output", () => {
    const stored = JSON.stringify({ version: "NASB" })
    expect(resolveInitialState(stored, "/5/4")).toEqual(resolveInitialState(stored, "/5/4"))
  })
})
