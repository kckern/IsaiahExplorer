/**
 * withRouter HOC — injects navigate and location into class components.
 *
 * Sources `navigate` and `location.pathname` from Next.js `next/navigation`.
 * `navigate(path, { replace })` semantics:
 *   - replace: true  → window.history.replaceState (no metadata refetch)
 *   - replace: false → router.push (Next.js refetches metadata)
 *
 * The replace:true branch is used by App.setUrl() for high-frequency
 * scroll-driven URL updates that must not trigger a server round-trip.
 *
 * See docs/reference/routing.md §7 (URL writes) for the write-path contract.
 */
import React from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function withRouter(Component) {
  function Wrapper(props) {
    const router = useRouter();
    const pathname = usePathname();

    const navigate = React.useCallback(function (path, opts) {
      const replace = opts && opts.replace === true;
      if (replace) {
        window.history.replaceState({}, '', path);
      } else {
        router.push(path);
      }
    }, [router]);

    const location = { pathname: pathname };

    return React.createElement(Component, Object.assign({}, props, { navigate: navigate, location: location }));
  }
  Wrapper.displayName = 'withRouter(' + (Component.displayName || Component.name || 'Component') + ')';
  return Wrapper;
}
