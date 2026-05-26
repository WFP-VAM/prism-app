import { render } from '@testing-library/react';
import { store } from 'context/store';
import { Provider } from 'react-redux';

import MapComponent from '.';

jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    replace: jest.fn(),
    location: {
      search: '',
    },
  }),
}));

test('renders as expected', () => {
  const { container } = render(
    <Provider store={store}>
      <MapComponent />
    </Provider>,
  );
  expect(container).toMatchSnapshot();
});
