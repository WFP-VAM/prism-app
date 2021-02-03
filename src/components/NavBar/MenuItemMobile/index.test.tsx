import React from 'react';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react';

import MenuMobile from '.';
import { store } from '../../../context/store';

test('renders as expected', () => {
  const { container } = render(
    <Provider store={store}>
      <MenuMobile />
    </Provider>,
  );
  expect(container).toMatchSnapshot();
});
