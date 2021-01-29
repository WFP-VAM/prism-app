import React from 'react';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react';

import MenuItemMobile from '.';
import { store } from '../../../context/store';

test('renders as expected', () => {
  const { container } = render(
    <Provider store={store}>
      <MenuItemMobile />
    </Provider>,
  );
  expect(container).toMatchSnapshot();
});
