import React from 'react';
import { ThemeProvider } from '@material-ui/core/styles';
import { Router, RouteComponentProps } from '@reach/router';

import NavBar from '../NavBar';
import MapView from '../MapView';
import muiTheme from '../../muiTheme';

const RouterPage = (
  props: { pageComponent: JSX.Element } & RouteComponentProps,
) => props.pageComponent;

function App() {
  return (
    <ThemeProvider theme={muiTheme}>
      <NavBar />
      <div className="App">
        <Router>
          <RouterPage path="*" pageComponent={<MapView />} />
        </Router>
      </div>
    </ThemeProvider>
  );
}

export default App;
