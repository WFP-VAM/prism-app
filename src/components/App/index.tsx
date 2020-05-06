import React from 'react';
import { ThemeProvider } from '@material-ui/core/styles';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';

import NavBar from '../NavBar';
import MapView from '../MapView';
import NotFound from '../404Page';
import muiTheme from '../../muiTheme';

function App() {
  return (
    <ThemeProvider theme={muiTheme}>
      <Router>
        <Switch>
          <Route exact path="/">
            <NavBar />
            <div className="App">
              <MapView />
            </div>
          </Route>

          <Route default component={NotFound} />
        </Switch>
      </Router>
    </ThemeProvider>
  );
}

export default App;
