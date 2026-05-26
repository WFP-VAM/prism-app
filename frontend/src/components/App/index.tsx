// Basic CSS Layout for the whole page
import './app.css';

import { useIsAuthenticated } from '@azure/msal-react';
import { ThemeProvider } from '@material-ui/core/styles';
import { Font } from '@react-pdf/renderer';
import * as Sentry from '@sentry/browser';
import AuthModal from 'components/AuthModal';
import DashboardView from 'components/DashboardView';
import ExportView from 'components/ExportView';
import Login from 'components/Login';
import MapView from 'components/MapView';
import NavBar from 'components/NavBar';
import Notifier from 'components/Notifier';
import { authRequired } from 'config';
import KhmerFont from 'fonts/Khmer-Regular.ttf';
import RobotoFont from 'fonts/Roboto-Regular.ttf';
import { useDashboardConfig } from 'hooks/useDashboardConfig';
import { useDocumentLocale } from 'hooks/useDocumentLocale';
import muiTheme from 'muiTheme';
import { memo, useMemo } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') {
  if (process.env.REACT_APP_SENTRY_URL) {
    Sentry.init({ dsn: process.env.REACT_APP_SENTRY_URL });
  } else {
    console.warn(
      'Sentry could not start. Make sure the REACT_APP_SENTRY_URL environment variable is set.',
    );
  }
}

// Register all the fonts necessary
Font.register({
  family: 'Roboto',
  src: RobotoFont,
});

Font.register({
  family: 'Khmer',
  src: KhmerFont,
});

// https://github.com/diegomura/react-pdf/issues/1991
Font.register({
  family: 'Roboto',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5WZLCzYlKw.ttf',
      fontWeight: 400,
    },
    {
      src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmEU9vAx05IsDqlA.ttf',
      fontWeight: 500,
    },
    {
      src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAx05IsDqlA.ttf',
      fontWeight: 700,
    },
  ],
});

const Wrapper = memo(() => (
  <div id="app">
    <NavBar />
    <div style={{ paddingTop: '56px', height: 'calc(100% - 56px)' }}>
      {/* @ts-expect-error - react-router-dom v5 types incompatible with React 18 */}
      <Switch>
        {/* @ts-expect-error - react-router-dom v5 types incompatible with React 18 */}
        <Route path="/dashboard/:path?" exact>
          <DashboardView />
        </Route>
        {/* @ts-expect-error - react-router-dom v5 types incompatible with React 18 */}
        <Route>
          <MapView />
          <AuthModal />
        </Route>
      </Switch>
    </div>
  </div>
));

function App() {
  useDashboardConfig();
  useDocumentLocale();
  const isAuthenticated = useIsAuthenticated();

  // The rendered content
  const renderedContent = useMemo(() => {
    if (isAuthenticated || !authRequired) {
      return (
        // @ts-expect-error - react-router-dom v5 types incompatible with React 18
        <Switch>
          {/* @ts-expect-error - react-router-dom v5 types incompatible with React 18 */}
          <Route path="/export" exact>
            <ExportView />
          </Route>
          {/* @ts-expect-error - react-router-dom v5 types incompatible with React 18 */}
          <Route>
            <Wrapper />
          </Route>
        </Switch>
      );
    }
    return <Login />;
  }, [isAuthenticated]);

  return (
    <ThemeProvider theme={muiTheme}>
      {/* Used to show notifications from redux as a snackbar. Notifications are stored in notificationState */}
      <Notifier />
      {/* @ts-expect-error - react-router-dom v5 types incompatible with React 18 */}
      <Router>{renderedContent}</Router>
    </ThemeProvider>
  );
}

export default App;
