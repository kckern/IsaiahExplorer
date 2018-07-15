import 'babel-polyfill';
import React from 'react';
import ReactDOM from 'react-dom';
import RouterShell from './Router';
import registerServiceWorker from './registerServiceWorker';

ReactDOM.render(<RouterShell />, document.getElementById('root'));
registerServiceWorker();
