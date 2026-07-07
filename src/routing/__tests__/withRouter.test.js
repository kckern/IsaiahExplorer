/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';
import { withRouter } from '../withRouter';

jest.mock('next/navigation', () => ({
  usePathname: () => '/whole/chapters/iinst/5/4',
}));

describe('withRouter (next/navigation shim)', () => {
  test('injects location.pathname from usePathname', () => {
    class Probe extends React.Component {
      render() {
        return React.createElement('div', { 'data-testid': 'path' }, this.props.location.pathname);
      }
    }
    const Wrapped = withRouter(Probe);
    const { getByTestId } = render(React.createElement(Wrapped));
    expect(getByTestId('path').textContent).toBe('/whole/chapters/iinst/5/4');
  });

  test('navigate (default push) calls history.pushState — no router round-trip', () => {
    const pushStateSpy = jest.spyOn(window.history, 'pushState');
    let navRef;
    class Capture extends React.Component {
      componentDidMount() { navRef = this.props.navigate; }
      render() { return null; }
    }
    const W = withRouter(Capture);
    render(React.createElement(W));
    navRef('/new/path');
    expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/new/path');
    pushStateSpy.mockRestore();
  });

  test('navigate with { replace: true } calls history.replaceState', () => {
    const replaceStateSpy = jest.spyOn(window.history, 'replaceState');
    let navRef;
    class Capture extends React.Component {
      componentDidMount() { navRef = this.props.navigate; }
      render() { return null; }
    }
    const W = withRouter(Capture);
    render(React.createElement(W));
    navRef('/replace/path', { replace: true });
    expect(replaceStateSpy).toHaveBeenCalledWith({}, '', '/replace/path');
    replaceStateSpy.mockRestore();
  });

  test('navigate with { replace: false } calls history.pushState', () => {
    const pushStateSpy = jest.spyOn(window.history, 'pushState');
    let navRef;
    class Capture extends React.Component {
      componentDidMount() { navRef = this.props.navigate; }
      render() { return null; }
    }
    const W = withRouter(Capture);
    render(React.createElement(W));
    navRef('/push/path', { replace: false });
    expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/push/path');
    pushStateSpy.mockRestore();
  });

  test('displayName reflects wrapped component', () => {
    class MyComponent extends React.Component {
      render() { return null; }
    }
    const Wrapped = withRouter(MyComponent);
    expect(Wrapped.displayName).toBe('withRouter(MyComponent)');
  });

  test('invokes onPopState with the current window pathname when the user presses Back', () => {
    const spy = jest.fn();
    class Probe extends React.Component { render() { return null; } }
    const Wrapped = withRouter(Probe);
    render(React.createElement(Wrapped, { onPopState: spy }));
    window.history.pushState({}, '', '/whole/chapters/kjv/2/1');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(spy).toHaveBeenCalledWith('/whole/chapters/kjv/2/1');
  });
});
