import { render } from '@testing-library/react';

import { Provider } from 'react-redux';
import { store } from 'context/store';
import { BrowserRouter } from 'react-router-dom';
import Legends from '.';

jest.mock('./ColorIndicator', () => 'mock-ColorIndicator');

test('renders as expected', () => {
  const { container } = render(
    <BrowserRouter>
      <Provider store={store}>
        <Legends layers={[]} />
      </Provider>
    </BrowserRouter>,
  );
  expect(container).toMatchSnapshot();
});
