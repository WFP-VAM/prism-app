// Basic CSS Layout for the whole page
import './app.css';

import { useIsAuthenticated } from '@azure/msal-react';
import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles';
import { Font } from '@react-pdf/renderer';
import * as Sentry from '@sentry/browser';
import AuthModal from 'components/AuthModal';
import CreateDashboardView from 'components/CreateDashboardView';
import DashboardView from 'components/DashboardView';
import ExportView from 'components/ExportView';
import ImportDashboardView from 'components/ImportDashboardView';
import Login from 'components/Login';
import MapView from 'components/MapView';
import NavBar from 'components/NavBar';
import Notifier from 'components/Notifier';
import UniversalBetaDisclaimerModal from 'components/UniversalBetaDisclaimerModal';
import { authRequired } from 'config';
import { CountryIsoProvider } from 'context/CountryIsoProvider';
import KhmerFont from 'fonts/Khmer-Regular.ttf';
import RobotoFont from 'fonts/Roboto-Regular.ttf';
import { useDashboardConfig } from 'hooks/useDashboardConfig';
import { useDocumentLocale } from 'hooks/useDocumentLocale';
import { usePersistDraftDashboards } from 'hooks/usePersistDraftDashboards';
import muiTheme from 'muiTheme';
import { memo, useMemo } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Switch,
  useParams,
} from 'react-router-dom';
import { isUniversalDeployment } from 'utils/universal-utils';

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

function DashboardRouteSwitcher() {
  const { path } = useParams<{ path?: string }>();
  usePersistDraftDashboards();
  if (path === 'create') {
    return <CreateDashboardView />;
  }
  if (path === 'import') {
    return <ImportDashboardView />;
  }
  return <DashboardView />;
}

const AppShell = memo(() => (
  <div id="app">
    <NavBar />
    <div style={{ paddingTop: '56px', height: 'calc(100% - 56px)' }}>
      <Switch>
        <Route
          path={['/country/:iso3/dashboard/:path?', '/dashboard/:path?']}
          exact
        >
          <DashboardRouteSwitcher />
        </Route>
        <Route path={['/country/:iso3', '/']}>
          <MapView />
          <AuthModal />
        </Route>
      </Switch>
    </div>
    {isUniversalDeployment() && <UniversalBetaDisclaimerModal />}
  </div>
));

function AppRoutes() {
  const isUniversal = isUniversalDeployment();

  return (
    <Switch>
      {isUniversal && (
        <Route path="/country/:iso3/export" exact>
          <CountryIsoProvider>
            <ExportView />
          </CountryIsoProvider>
        </Route>
      )}
      <Route path="/export" exact>
        <ExportView />
      </Route>
      {isUniversal && (
        <Route path={['/country/:iso3', '/']}>
          <CountryIsoProvider>
            <AppShell />
          </CountryIsoProvider>
        </Route>
      )}
      {!isUniversal && (
        <Route>
          <AppShell />
        </Route>
      )}
    </Switch>
  );
}

function App() {
  useDashboardConfig();
  useDocumentLocale();
  const isAuthenticated = useIsAuthenticated();

  // The rendered content
  const renderedContent = useMemo(() => {
    if (isAuthenticated || !authRequired) {
      return <AppRoutes />;
    }
    return <Login />;
  }, [isAuthenticated]);

  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={muiTheme}>
        {/* Used to show notifications from redux as a snackbar. Notifications are stored in notificationState */}
        <Notifier />
        <Router>{renderedContent}</Router>
      </ThemeProvider>
    </StyledEngineProvider>
  );
}

export default App;
