import React from 'react';
import { render } from '@testing-library/react';
import App from '.';

jest.mock('../NavBar', () => 'mock-NavBar');

test('renders as expected', () => {
  const { container } = render(<App />);
  expect(container).toMatchSnapshot();
});
