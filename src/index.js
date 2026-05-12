import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import isElectron from 'is-electron';

import RouterShell from './routing/RouterShell.js';

// Electron uses MemoryRouter (file:// protocol breaks BrowserRouter).
// Web uses BrowserRouter with an Amplify rewrite rule serving index.html for all paths.
const Router = isElectron() ? MemoryRouter : BrowserRouter;

ReactDOM.render(
  <Router>
    <RouterShell/>
  </Router>,
  document.getElementById('root')
);

