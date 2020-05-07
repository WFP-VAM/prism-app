import React from 'react';
import { ThemeProvider } from '@material-ui/core/styles';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';

// Basic CSS Layout for the whole page
import './app.css';
import NavBar from '../NavBar';
import MapView from '../MapView';
import NotFound from '../404Page';
import muiTheme from '../../muiTheme';

function App() {
  return (
    <ThemeProvider theme={muiTheme}>
      <Router>
        <NavBar />
        <div id="app">
          <Switch>
            <Route exact path="/">
              <MapView />
            </Route>
            <Route default component={NotFound} />
          </Switch>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
