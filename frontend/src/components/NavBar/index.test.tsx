import { render } from '@testing-library/react';
import { store } from 'context/store';
import { Provider } from 'react-redux';
import { TestBrowserRouter } from 'test/TestBrowserRouter';

import NavBar from '.';

jest.mock('./PrintImage', () => 'mock-PrintImage');

test('renders as expected', () => {
  const { container } = render(
    <TestBrowserRouter>
      <Provider store={store}>
        <NavBar />
      </Provider>
    </TestBrowserRouter>,
  );
  expect(container).toMatchSnapshot();
});
