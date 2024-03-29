import { render } from '@testing-library/react';
import React from 'react';
import ActionsModal from '.';

test('renders actions modal', () => {
  const { container } = render(<ActionsModal open onClose={() => {}} />);
  expect(container).toMatchSnapshot();
});
