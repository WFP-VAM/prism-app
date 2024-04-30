import { render } from '@testing-library/react';
import React from 'react';
import HowToReadModal from '.';

test('renders actions modal', () => {
  const { container } = render(<HowToReadModal open onClose={() => {}} />);
  expect(container).toMatchSnapshot();
});
