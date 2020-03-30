import React from 'react';
import { ThemeProvider } from '@material-ui/core/styles';
import { BrowserRouter as Router, Route } from 'react-router-dom';

import NavBar from '../NavBar';
import MapView from '../MapView';
import muiTheme from '../../muiTheme';

function App() {
  return (
    <ThemeProvider theme={muiTheme}>
      <NavBar />
      <div className="App">
        <Router>
          <Route path="*" component={MapView} />
        </Router>
      </div>
    </ThemeProvider>
  );
}

export default App;
