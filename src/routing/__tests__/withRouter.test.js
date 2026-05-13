/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';
import { withRouter } from '../withRouter';

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => '/whole/chapters/iinst/5/4',
}));

beforeEach(() => {
  mockPush.mockClear();
  mockReplace.mockClear();
});

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

  test('navigate (default push) calls router.push', () => {
    let navRef;
    class Capture extends React.Component {
      componentDidMount() { navRef = this.props.navigate; }
      render() { return null; }
    }
    const W = withRouter(Capture);
    render(React.createElement(W));
    navRef('/new/path');
    expect(mockPush).toHaveBeenCalledWith('/new/path');
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('navigate with { replace: true } calls history.replaceState (no router round-trip)', () => {
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
    expect(mockPush).not.toHaveBeenCalled();
    replaceStateSpy.mockRestore();
  });

  test('navigate with { replace: false } calls router.push', () => {
    let navRef;
    class Capture extends React.Component {
      componentDidMount() { navRef = this.props.navigate; }
      render() { return null; }
    }
    const W = withRouter(Capture);
    render(React.createElement(W));
    navRef('/push/path', { replace: false });
    expect(mockPush).toHaveBeenCalledWith('/push/path');
  });

  test('displayName reflects wrapped component', () => {
    class MyComponent extends React.Component {
      render() { return null; }
    }
    const Wrapped = withRouter(MyComponent);
    expect(Wrapped.displayName).toBe('withRouter(MyComponent)');
  });
});
