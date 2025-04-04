import { memo, useMemo } from 'react';
import * as Sentry from '@sentry/browser';
import { useIsAuthenticated } from '@azure/msal-react';
import { ThemeProvider } from '@material-ui/core/styles';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { Font } from '@react-pdf/renderer';
import { authRequired } from 'config';
import NavBar from 'components/NavBar';
import MapView from 'components/MapView';
import Login from 'components/Login';
import muiTheme from 'muiTheme';
import Notifier from 'components/Notifier';
import AuthModal from 'components/AuthModal';
// Basic CSS Layout for the whole page
import './app.css';
import RobotoFont from 'fonts/Roboto-Regular.ttf';
import KhmerFont from 'fonts/Khmer-Regular.ttf';

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
    <Switch>
      <Route>
        <MapView />
        <AuthModal />
      </Route>
    </Switch>
  </div>
));

function App() {
  const isAuthenticated = useIsAuthenticated();

  // The rendered content
  const renderedContent = useMemo(() => {
    if (isAuthenticated || !authRequired) {
      return <Wrapper />;
    }
    return <Login />;
  }, [isAuthenticated]);

  return (
    <ThemeProvider theme={muiTheme}>
      {/* Used to show notifications from redux as a snackbar. Notifications are stored in notificationState */}
      <Notifier />
      <Router>{renderedContent}</Router>
    </ThemeProvider>
  );
}

export default App;
