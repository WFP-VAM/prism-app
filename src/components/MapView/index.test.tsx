import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';

import MapView from '.';
import { store } from '../../context/store';

jest.mock('./Layers', () => 'mock-Layers');
jest.mock('./Boundaries', () => 'mock-Boundaries');
jest.mock('./DateSelector', () => 'mock-DateSelector');

test('renders as expected', () => {
  const { container } = render(
    <Provider store={store}>
      <MapView />
    </Provider>,
  );
  expect(container).toMatchSnapshot();
});
