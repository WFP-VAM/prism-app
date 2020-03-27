import React from 'react';
import { render } from '@testing-library/react';
import MapView from '.';

jest.mock('./Layers', () => 'mock-Layers');

test('renders as expected', () => {
  const { container } = render(<MapView />);
  expect(container).toMatchSnapshot();
});
