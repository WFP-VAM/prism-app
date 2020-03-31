import React from 'react';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react';
import DateSelector from '.';

import { store } from '../../../context/store';

test('renders as expected', () => {
  const { container } = render(
    <Provider store={store}>
      <DateSelector />
    </Provider>,
  );
  expect(container).toMatchSnapshot();
});
