import React from 'react';
import { render } from '@testing-library/react';
import DateSelector from '.';

test('renders as expected', () => {
  const { container } = render(<DateSelector />);
  expect(container).toMatchSnapshot();
});
