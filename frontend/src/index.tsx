import './index.css';
import './i18n';

import { MsalProvider } from '@azure/msal-react';
import { PostHogProvider } from '@posthog/react';
import posthog from 'posthog-js';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import App from './components/App';
import { msalInstance, safeCountry } from './config';
import { AppStore, store } from './context/store';
import * as serviceWorker from './serviceWorker';

posthog.init(process.env.REACT_APP_POSTHOG_TOKEN as string, {
  cookieless_mode: 'always',
  api_host: 'https://eu.i.posthog.com',
  defaults: '2026-01-30',
});

posthog.register({ country: safeCountry });

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <PostHogProvider client={posthog}>
      <Provider store={store}>
        <MsalProvider instance={msalInstance}>
          <App />
        </MsalProvider>
      </Provider>
    </PostHogProvider>
  </React.StrictMode>,
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();

declare global {
  interface Window {
    store: AppStore;
  }
}

// @ts-ignore
if (window.Cypress) {
  window.store = store;
}
