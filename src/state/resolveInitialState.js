import { parseRoute } from "../routing/routeCodec"
import {
  DEFAULT_TOP_VERSIONS,
  DEFAULT_TOP_OUTLINES,
  DEFAULT_TOP_STRUCTURES
} from "../routing/defaults"

/**
 * Resolve the app's initial settings from stored preferences and the arrival
 * URL — one pure, testable function with one precedence order (audit P2.5):
 *
 *   defaults  <  localStorage settings  <  URL overrides (version/search/hebrew)
 *
 * Extracted verbatim from App.initApp. Structure/outline/version validation
 * against loaded metadata still happens later in validateSettings (it needs
 * the data, which hasn't loaded yet when this runs).
 *
 * @param {string|null} storedSettingsJson - raw localStorage "settings" value
 * @param {string} pathname - window.location.pathname at boot
 * @returns {object} the initial settings patch for App state
 */
export function resolveInitialState(storedSettingsJson, pathname) {
  var settings
  try {
    settings = JSON.parse(storedSettingsJson)
  } catch (e) {
    settings = {}
  }
  if (settings === null || typeof settings !== "object") settings = {}

  if (settings.top_versions === undefined) settings.top_versions = []
  if (settings.top_outlines === undefined) settings.top_outlines = []
  if (settings.top_structures === undefined) settings.top_structures = []

  // Reset stale/poisoned top-5 lists (legacy shortcodes that no longer exist).
  if (settings.top_versions.length !== 5 || settings.top_versions.indexOf("HBRS") >= 0)
    settings.top_versions = DEFAULT_TOP_VERSIONS.slice()
  if (settings.top_outlines.length !== 5)
    settings.top_outlines = DEFAULT_TOP_OUTLINES.slice()
  if (settings.top_structures.length !== 5 || settings.top_structures.indexOf("bifid") >= 0)
    settings.top_structures = DEFAULT_TOP_STRUCTURES.slice()

  if (settings.version === undefined || settings.version === null)
    settings.version = settings.top_versions[0]
  if (settings.outline === undefined || settings.outline === null)
    settings.outline = settings.top_outlines[0]
  if (settings.structure === undefined || settings.structure === null)
    settings.structure = settings.top_structures[0]

  if (settings.commentary_order === undefined || settings.commentary_order === null)
    settings.commentary_order = []
  if (settings.commentary_order.length > 0)
    settings.commentarySource = settings.commentary_order[0]

  // URL overrides win over stored preferences.
  var parsed = parseRoute(pathname)
  if (parsed.version !== undefined && parsed.version.length > 1)
    settings.version = parsed.version
  if (parsed.search !== undefined) {
    settings.searchQuery = parsed.search
    settings.searchMode = false
    settings.urlSearch = true
  }
  if (parsed.hebrew !== undefined) settings.hebrewStrongIndex = parsed.hebrew

  return settings
}
