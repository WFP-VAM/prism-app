import React from 'react';
import { render } from '@testing-library/react';
import App from './App';

jest.mock('../NavBar/NavBar', () => 'mock-NavBar');

test('examples of some things', () => {
  const { container } = render(<App />);
  expect(container).toMatchSnapshot();
});
