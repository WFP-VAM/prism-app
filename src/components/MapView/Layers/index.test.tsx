import React from 'react';
import { Map } from 'immutable';
import { render } from '@testing-library/react';

import Layers from '.';

test('renders as expected', () => {
  // TODO: Mock layers
  const { container } = render(<Layers layers={Map()} />);
  expect(container).toMatchSnapshot();
});
