import React from 'react';
import * as Sentry from '@sentry/browser';
import { ThemeProvider } from '@material-ui/core/styles';
import {
  BrowserRouter as Router,
  Route,
  RouteComponentProps,
  Switch,
  useLocation,
} from 'react-router-dom';
// Basic CSS Layout for the whole page
import './app.css';
import NavBar from '../NavBar';
import DataDrawer from '../DataDrawer';
import MapView from '../MapView';
import NotFound from '../404Page';
import muiTheme from '../../muiTheme';
import Notifier from '../Notifier';
import {
  WMSLayerProps,
  NSOLayerProps,
  AggregationOperations,
  LayerKey,
} from '../../config/types';
import { LayerData } from '../../context/layers/layer-data';
import useAnalysisDispatch from '../../utils/analysis-dispatch';

if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') {
  if (process.env.REACT_SENTRY_URL) {
    Sentry.init({ dsn: process.env.REACT_SENTRY_URL });
  } else {
    console.warn(
      'Sentry could not start. Make sure the REACT_SENTRY_URL environment variable is set.',
    );
  }
}

type AnalysisQueryParams = {
  hazardLayer: WMSLayerProps['id'];
  statistic: AggregationOperations;
  baselineLayer: NSOLayerProps['id'];
  date: string; // format YYYY-MM-DD
};

type ViewQueryParams = {
  layers: LayerKey[];
  date: string; // format YYYY-MM-DD
};

// reads urls to dispatch layers into mapview
function QueryReader({ location, history: { push } }: RouteComponentProps) {
  // view?hazard_layer=pasture_anomaly&date=2020-05-21
  // analysis?hazard_layer=pasture_anomaly&statistic=mean&basline_layer=children&date=2020-05-21
  const path = location.pathname.toLowerCase();
  const analysisDispatchFunc = useAnalysisDispatch();
  const query = new URLSearchParams(useLocation().search);

  // load analysis from url
  if (path === '/analysis') {
    query.entries();
    console.log('QueryReader -> query.entries()', query.getAll('date'));
    const hazardLayer = query.get('hazard_layer');
  } else if (path === '/view') {
    // sample
  } else if (path !== '/') {
    // if the url isn't to home page...404
    push('/404');
  }

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
