import React from 'react';
import { render } from '@testing-library/react';
import NavBar from '.';

jest.mock('./MenuItem', () => 'mock-MenuItem');

test('renders as expected', () => {
  const { container } = render(<NavBar />);
  expect(container).toMatchSnapshot();
});
