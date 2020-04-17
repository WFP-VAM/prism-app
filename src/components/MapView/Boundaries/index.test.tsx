import React from 'react';
import { render } from '@testing-library/react';

import Boundaries from '.';

test('renders as expected', () => {
  const { container } = render(<Boundaries />);
  expect(container).toMatchSnapshot();
});
