/**
 * withRouter HOC — injects navigate and location into class components.
 *
 * `location.pathname` is sourced from `usePathname()` for the initial render
 * (App.js reads it once, in getSettingsFromUrl, at startup).
 *
 * `navigate(path, { replace })` writes the URL with the plain History API:
 *   - replace: true  → window.history.replaceState
 *   - replace: false → window.history.pushState
 *
 * It must NOT use Next.js `router.push()`. App.js is a client-driven SPA
 * loaded inside a `dynamic(ssr:false)` boundary; `router.push()` refetches
 * the route's RSC payload, which remounts that boundary and cold-boots
 * App.js (re-runs loadCore, re-downloads every dataset) on every verse
 * change. The History API updates the URL bar with no server round-trip,
 * exactly like CRA's BrowserRouter did. SSR metadata still covers the
 * initial load and social crawlers.
 *
 * See docs/reference/routing.md §7 (URL writes) for the write-path contract.
 */
import React from 'react';
import { usePathname } from 'next/navigation';

export function withRouter(Component) {
  function Wrapper(props) {
    const pathname = usePathname();

    const navigate = React.useCallback(function (path, opts) {
      const replace = opts && opts.replace === true;
      if (replace) {
        window.history.replaceState({}, '', path);
      } else {
        window.history.pushState({}, '', path);
      }
    }, []);

    React.useEffect(function () {
      if (typeof props.onPopState !== 'function') return undefined;
      function onPop() { props.onPopState(window.location.pathname); }
      window.addEventListener('popstate', onPop);
      return function () { window.removeEventListener('popstate', onPop); };
    }, [props.onPopState]);

    const location = { pathname: pathname };

    return React.createElement(Component, Object.assign({ ref: props.appRef }, props, { navigate: navigate, location: location }));
  }
  Wrapper.displayName = 'withRouter(' + (Component.displayName || Component.name || 'Component') + ')';
  return Wrapper;
}
