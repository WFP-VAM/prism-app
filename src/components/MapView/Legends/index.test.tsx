import React from 'react';
import { render } from '@testing-library/react';

import Legends from '.';

jest.mock('./ColorIndicator', () => 'mock-ColorIndicator');

test('renders as expected', () => {
  const { container } = render(<Legends layers={[]} />);
  expect(container).toMatchSnapshot();
});
