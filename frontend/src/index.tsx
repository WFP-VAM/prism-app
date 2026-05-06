import { createRoot } from 'react-dom/client';
import './index.css';
import './i18n';
import { Provider } from 'react-redux';
import { MsalProvider } from '@azure/msal-react';
import React from 'react';
import posthog from 'posthog-js';
import { PostHogProvider } from '@posthog/react';
import App from './components/App';
import { AppStore, store } from './context/store';
import { msalInstance, safeCountry } from './config';
import * as serviceWorker from './serviceWorker';

posthog.init(process.env.REACT_APP_POSTHOG_TOKEN as string, {
  api_host: process.env.REACT_APP_POSTHOG_HOST,
  defaults: '2026-01-30',
});

posthog.register({ deployment: safeCountry });

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
