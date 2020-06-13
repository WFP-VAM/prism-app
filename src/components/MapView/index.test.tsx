import React from 'react';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react';

import MapView from '.';
import { store } from '../../context/store';

jest.mock('../../context/layers/layer-data', () => 'mock-layer-data');
jest.mock('./Layers/WMSLayer', () => 'mock-WMSLayer');
jest.mock('./Layers/NSOLayer', () => 'mock-NSOLayer');
jest.mock('./Layers/BoundaryLayer', () => 'mock-BoundaryLayer');

jest.mock('./Legends', () => 'mock-Legends');
jest.mock('./DateSelector', () => 'mock-DateSelector');

test('renders as expected', () => {
  const { container } = render(
    <Provider store={store}>
      <MapView />
    </Provider>,
  );
  expect(container).toMatchSnapshot();
});
