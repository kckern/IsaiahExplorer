import React, { Component } from 'react';
import { BrowserRouter as Router} from 'react-router-dom';
import Route from 'react-router-dom/Route';
import Switch from 'react-router-dom/Switch';

import App from './App.js';

export default class RouterShell extends Component {
	
 render() {
 	
 	return (
 			<Router>
 				
 				<Switch>

			 		<Route path="/" component={App} />
 			
 				</Switch>
 			</Router>
    );
  }
  
}