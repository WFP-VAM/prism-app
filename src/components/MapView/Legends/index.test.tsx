import React from 'react';
import { Map } from 'immutable';
import { render } from '@testing-library/react';

import Legends from '.';

jest.mock('./ColorIndicator', () => 'mock-ColorIndicator');

test('renders as expected', () => {
  const { container } = render(<Legends layers={Map()} />);
  expect(container).toMatchSnapshot();
});
