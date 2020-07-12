import React from 'react';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react';

import Analyser from '.';
import { store } from '../../../context/store';

jest.mock('../../../utils/LayerDropdown', () => 'mock-Layer-Dropdown');

test('renders as expected', () => {
  const { container } = render(
    <Provider store={store}>
      <Analyser />
    </Provider>,
  );
  expect(container).toMatchSnapshot();
});
