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
  { ssr: false },
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
