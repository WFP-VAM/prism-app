import React from 'react';
import { get } from 'lodash';
import * as Sentry from '@sentry/browser';
import { useIsAuthenticated } from '@azure/msal-react';
import { ThemeProvider } from '@material-ui/core/styles';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { appConfig } from '../../config';
// Basic CSS Layout for the whole page
import './app.css';
import NavBar from '../NavBar';
import DataDrawer from '../DataDrawer';
import MapView from '../MapView';
import NotFound from '../404Page';
import Login from '../Login';
import muiTheme from '../../muiTheme';
import Notifier from '../Notifier';

if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') {
  if (process.env.REACT_APP_SENTRY_URL) {
    Sentry.init({ dsn: process.env.REACT_APP_SENTRY_URL });
  } else {
    console.warn(
      'Sentry could not start. Make sure the REACT_APP_SENTRY_URL environment variable is set.',
    );
  }
}

const Wrapper = () => {
  return (
    <div id="app">
      <NavBar />
      <Switch>
        <Route exact path="/">
          <MapView />
          <DataDrawer />
        </Route>
        <Route default component={NotFound} />
      </Switch>
    </div>
  );
};

function App() {
  const isAuthenticated = useIsAuthenticated();

  const authRequired: boolean = get(appConfig, 'WFPAuthRequired', false);

  return (
    <ThemeProvider theme={muiTheme}>
      {/* Used to show notifications from redux as a snackbar. Notifications are stored in notificationState */}
      <Notifier />
      <Router>
        {isAuthenticated || !authRequired ? <Wrapper /> : <Login />}
      </Router>
    </ThemeProvider>
  );
}

export default App;
