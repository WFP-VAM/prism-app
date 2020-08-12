import React from 'react';
import * as Sentry from '@sentry/browser';
import { ThemeProvider } from '@material-ui/core/styles';
import {
  BrowserRouter as Router,
  Route,
  RouteComponentProps,
  Switch,
} from 'react-router-dom';
// Basic CSS Layout for the whole page
import './app.css';
import NavBar from '../NavBar';
import DataDrawer from '../DataDrawer';
import MapView from '../MapView';
import NotFound from '../404Page';
import muiTheme from '../../muiTheme';
import Notifier from '../Notifier';

if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') {
  if (process.env.REACT_SENTRY_URL) {
    Sentry.init({ dsn: process.env.REACT_SENTRY_URL });
  } else {
    console.warn(
      'Sentry could not start. Make sure the REACT_SENTRY_URL environment variable is set.',
    );
  }
}

// reads urls to dispatch layers into mapview
function QueryReader({ location, history: { push } }: RouteComponentProps) {
  // view?hazard_layer=pasture_anomaly&date=2020-05-21
  // analysis?hazard_layer=pasture_anomaly&statistic=mean&basline_layer=children&date=2020-05-21
  const path = location.pathname.toLowerCase();

  // load analysis from url
  if (path === '/analysis') {
    // console.log('analysis loading here!');
  } else if (path === '/view') {
    // load generic layer from url
    // console.log('layer loading here');
  } else if (path !== '/') {
    // if the url isn't to home page...404
    push('/404');
  }
  // const query = new URLSearchParams(location.search);
  // console.log(path, query.get('hazard_layer'));
  // eslint-disable-next-line no-restricted-syntax
  /* for (const entry of query.entries()) {
    console.log(entry);
  } */
  return (
    <>
      <MapView />
      <DataDrawer />
    </>
  );
}

function App() {
  return (
    <ThemeProvider theme={muiTheme}>
      {/* Used to show notifications from redux as a snackbar. Notifications are stored in notificationState */}
      <Notifier />
      <Router>
        <NavBar />
        <div id="app">
          <Switch>
            <Route exact path="/404" component={NotFound} />
            <Route path="/" component={QueryReader} />
          </Switch>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
