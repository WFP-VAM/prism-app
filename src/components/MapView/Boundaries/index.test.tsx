import React from 'react';
import { render } from '@testing-library/react';

import MapView from '..';

// Boundaries need to live in a "Map", so we
// mock sub-components except for Boundaries
jest.mock('../Layers', () => 'mock-Layers');
jest.mock('../DateSelector', () => 'mock-DateSelector');

test('renders as expected', () => {
  const { container } = render(<MapView />);
  expect(container).toMatchSnapshot();
});
