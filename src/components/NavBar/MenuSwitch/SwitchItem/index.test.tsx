import React from 'react';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react';

import SwitchItem from '.';
import { store } from '../../../../context/store';
import { LayerType } from '../../../../config/types';

jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    replace: jest.fn(),
    location: {
      search: '',
    },
  }),
}));

const props = {
  layer: {} as LayerType,
};

test('renders as expected', () => {
  const { container } = render(
    <Provider store={store}>
      <SwitchItem {...props} />
    </Provider>,
  );
  expect(container).toMatchSnapshot();
});
