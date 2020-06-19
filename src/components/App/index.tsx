import React from 'react';
import * as Sentry from '@sentry/browser';
import { ThemeProvider } from '@material-ui/core/styles';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';

// Basic CSS Layout for the whole page
import './app.css';
import NavBar from '../NavBar';
import DataDrawer from '../DataDrawer';
import MapView from '../MapView';
import NotFound from '../404Page';
import muiTheme from '../../muiTheme';

if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') {
  if (process.env.REACT_SENTRY_URL) {
    Sentry.init({ dsn: process.env.REACT_SENTRY_URL });
  } else {
    console.warn(
      'Sentry could not start. Make sure the REACT_SENTRY_URL environment variable is set.',
    );
  }
}

function App() {
  return (
    <ThemeProvider theme={muiTheme}>
      <Router>
        <NavBar />
        <div id="app">
          <Switch>
            <Route exact path="/">
              <MapView />
              <DataDrawer />
            </Route>
            <Route default component={NotFound} />
          </Switch>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
