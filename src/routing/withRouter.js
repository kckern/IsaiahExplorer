/**
 * withRouter HOC — injects navigate and location into class components.
 *
 * React Router v6 dropped the class-compatible withRouter HOC.
 * This re-implements it so class components receive:
 *   this.props.navigate(path, { replace: bool })
 *   this.props.location
 */
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function withRouter(Component) {
  function Wrapper(props) {
    var navigate = useNavigate();
    var location = useLocation();
    return React.createElement(Component, Object.assign({}, props, { navigate: navigate, location: location }));
  }
  Wrapper.displayName = 'withRouter(' + (Component.displayName || Component.name || 'Component') + ')';
  return Wrapper;
}
