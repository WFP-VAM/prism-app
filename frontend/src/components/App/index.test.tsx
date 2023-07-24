import React from 'react';
import { render } from '@testing-library/react';
import App from '.';

jest.mock('components/NavBar', () => 'mock-NavBar');
jest.mock('components/MapView', () => 'mock-MapView');
jest.mock('components/404Page', () => 'mock-NotFound');
jest.mock('components/Notifier', () => 'mock-Notifier');
jest.mock('components/AuthModal', () => 'mock-AuthModal');

test('renders as expected', () => {
  const { container } = render(<App />);
  expect(container).toMatchSnapshot();
});
