import { render } from '@testing-library/react';

import { Provider } from 'react-redux';
import { store } from 'context/store';
import { TestBrowserRouter } from 'test/TestBrowserRouter';
import Legends from '.';

jest.mock('./ColorIndicator', () => 'mock-ColorIndicator');

test('renders as expected', () => {
  const { container } = render(
    <TestBrowserRouter>
      <Provider store={store}>
        <Legends />
      </Provider>
    </TestBrowserRouter>,
  );
  expect(container).toMatchSnapshot();
});
