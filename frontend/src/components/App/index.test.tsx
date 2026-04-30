import { render } from '@testing-library/react';
import { MsalProvider } from '@azure/msal-react';
import { Provider } from 'react-redux';
import { msalInstance } from 'config';
import { store } from 'context/store';
import App from '.';

jest.mock('components/NavBar', () => 'mock-NavBar');
jest.mock('components/MapView', () => 'mock-MapView');
jest.mock('components/404Page', () => 'mock-NotFound');
jest.mock('components/Notifier', () => 'mock-Notifier');
jest.mock('components/AuthModal', () => 'mock-AuthModal');

test('renders as expected', () => {
  const { container } = render(
    <Provider store={store}>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </Provider>,
  );
  expect(container).toMatchSnapshot();
});
