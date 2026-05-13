// CRA-only entry point.
// Note: this file becomes unreachable once CRA is removed in Phase 11 of the
// Next.js migration. The withRouter HOC now uses next/navigation hooks, which
// won't have a router context here — so this entry will not function as a
// runnable dev server. Kept only so CRA's build step still produces an artifact
// while Phase 11 is pending. The user runs Next.js (`npm run dev:next`) on
// :3001 for actual development.
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App.js';
import { withRouter } from './routing/withRouter.js';

const AppWithRouter = withRouter(App);

ReactDOM.render(<AppWithRouter />, document.getElementById('root'));
