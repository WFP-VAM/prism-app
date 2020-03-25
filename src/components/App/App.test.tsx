import React from 'react';
import { render } from '@testing-library/react';
import App from './App';

jest.mock('../NavBar/NavBar', () => 'mock-NavBar');

test('renders as expected', () => {
  const { container } = render(<App />);
  expect(container).toMatchSnapshot();
});
