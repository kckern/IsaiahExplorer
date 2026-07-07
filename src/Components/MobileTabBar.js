import React from "react"

/**
 * Bottom tab bar shown only in the mobile (single-column) layout. Each tab
 * selects which of the four panels fills the screen via App state
 * `mobilePane` (read by the `data-mobile-pane` attribute on #approot; the CSS
 * media query does the actual show/hide). Hidden on desktop by CSS.
 */
const PANES = [
  { key: "structure", label: "Structure" },
  { key: "section", label: "Outline" },
  { key: "verses", label: "Verses" },
  { key: "read", label: "Read" },
]

class MobileTabBar extends React.Component {
  render() {
    const app = this.props.app
    return (
      <nav className="mobile-tabbar" aria-label="Panels">
        {PANES.map((p) => (
          <button
            key={p.key}
            type="button"
            className={app.state.mobilePane === p.key ? "active" : ""}
            aria-pressed={app.state.mobilePane === p.key}
            onClick={() => app.setState({ mobilePane: p.key })}
          >
            {p.label}
          </button>
        ))}
      </nav>
    )
  }
}

export default MobileTabBar
