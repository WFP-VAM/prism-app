import React from 'react';
import { render } from '@testing-library/react';
import MapView from '.';

jest.mock('./Layers', () => 'mock-Layers');
jest.mock('./Boundaries', () => 'mock-Boundaries');
jest.mock('./DateSelector', () => 'mock-DateSelector');

test('renders as expected', () => {
  const { container } = render(<MapView />);
  expect(container).toMatchSnapshot();
});
