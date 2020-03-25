import React from 'react';
import { render } from '@testing-library/react';
import NavBar from './NavBar';

jest.mock('./MenuItem/MenuItem', () => 'mock-MenuItem');

test('examples of some things', () => {
  const { container } = render(<NavBar />);
  expect(container).toMatchSnapshot();
});
