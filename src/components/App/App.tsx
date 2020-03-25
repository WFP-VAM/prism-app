import React from 'react';
import { ThemeProvider } from '@material-ui/core/styles';
import { Router, RouteComponentProps } from '@reach/router';

import NavBar from '../NavBar/NavBar';
import muiTheme from '../../muiTheme';

const Hello = (props: RouteComponentProps) => <div>hello</div>;

function App() {
  return (
    <ThemeProvider theme={muiTheme}>
      <NavBar />
      <div className="App">
        <Router>
          <Hello path="*" />
        </Router>
      </div>
    </ThemeProvider>
  );
}

export default App;
