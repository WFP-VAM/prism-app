import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

test('renders as expected', () => {
  const { container } = render(
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <MsalProvider instance={msalInstance}>
          <App />
        </MsalProvider>
      </Provider>
    </QueryClientProvider>,
  );
  expect(container).toMatchSnapshot();
});
