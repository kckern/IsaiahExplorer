/**
 * RouterShell — declarative route owner for Isaiah Explorer.
 *
 * This component is the single place where all route definitions live.
 * It renders inside <BrowserRouter> (or <MemoryRouter> in Electron) and wraps the main <App> shell.
 *
 * Route structure:
 *   /search/:query   → redirect to /#/search.:query (legacy slash form)
 *   /hebrew/:strong  → redirect to /#/hebrew.:strong (legacy slash form)
 *   *                → main App shell (handles all canonical + legacy hash paths)
 *
 * Canonical URL shape:
 *   /:structure/:outline/:version[/tag.:slug][/search.:query][/hebrew.:strong]/:chapter/:verse[/commentary.:source[/:id]]
 */
import React, { Component } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import App from '../App.js';
import { withRouter } from './withRouter.js';

const AppWithRouter = withRouter(App);

// Redirect /search/:query → /search.:query (inline canonical form)
function LegacySearchRedirect() {
  var params = useParams();
  return React.createElement(Navigate, { to: '/search.' + params.query, replace: true });
}

// Redirect /hebrew/:strong → /hebrew.:strong (inline canonical form)
function LegacyHebrewRedirect() {
  var params = useParams();
  return React.createElement(Navigate, { to: '/hebrew.' + params.strong, replace: true });
}

class RouterShell extends Component {
  render() {
    return React.createElement(
      Routes,
      null,
      React.createElement(Route, { path: 'search/:query', element: React.createElement(LegacySearchRedirect) }),
      React.createElement(Route, { path: 'hebrew/:strong', element: React.createElement(LegacyHebrewRedirect) }),
      React.createElement(Route, { path: '*', element: React.createElement(AppWithRouter) })
    );
  }
}

export default RouterShell;
