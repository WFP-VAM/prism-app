import React from 'react';
import * as Sentry from '@sentry/browser';
import { ThemeProvider } from '@material-ui/core/styles';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';

import NavBar from '../NavBar';
import MapView from '../MapView';
import NotFound from '../404Page';
import muiTheme from '../../muiTheme';

if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') {
  Sentry.init({
    dsn:
      'https://a3cc5f470dac4b50b288851a0390f686@o213971.ingest.sentry.io/5242966',
  });
}

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
