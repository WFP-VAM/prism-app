import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import './i18n';
import { Provider } from 'react-redux';
import { MsalProvider } from '@azure/msal-react';
import App from './components/App';
import { store } from './context/store';
import { msalInstance } from './config';
import * as serviceWorker from './serviceWorker';

ReactDOM.render(
  <Provider store={store}>
    <MsalProvider instance={msalInstance}>
      <App />
    </MsalProvider>
  </Provider>,
  document.getElementById('root'),
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
