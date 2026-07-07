'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// SSR is intentionally disabled — App.js touches `window`, `document`, and
// `localStorage` in many places; we render only metadata on the server and
// hydrate the SPA on the client. The class component receives navigate /
// location via the next/navigation-backed withRouter shim, which runs inside
// this client boundary.
const AppWithRouter = dynamic(
  () =>
    Promise.all([
      import('../../src/App.js'),
      import('../../src/routing/withRouter.js'),
    ]).then(([appMod, routerMod]) => routerMod.withRouter(appMod.default)),
  {
    ssr: false,
    // Shown while the SPA bundle downloads/parses. Without it the user stares
    // at a black page (body background is #000) until the whole bundle boots.
    loading: () => (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
          color: '#888',
          fontFamily: 'Roboto Condensed, sans-serif',
          fontSize: 18,
        }}
      >
        Loading Isaiah Explorer…
      </div>
    ),
  },
);

export default function AppClient() {
  const ref = React.useRef<any>(null);
  return (
    <AppWithRouter
      appRef={ref}
      onPopState={(pathname: string) => ref.current?.handlePopState(pathname)}
    />
  );
}
