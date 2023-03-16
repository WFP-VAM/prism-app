import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import App from '.';
import { store } from '../../context/store';

jest.mock('../NavBar', () => 'mock-NavBar');
jest.mock('../DataDrawer', () => 'mock-DataDrawer');
jest.mock('../MapView', () => 'mock-MapView');
jest.mock('../404Page', () => 'mock-NotFound');
jest.mock('../Notifier', () => 'mock-Notifier');
jest.mock('../AuthModal', () => 'mock-AuthModal');

test('renders as expected', () => {
  const { container } = render(
    <Provider store={store}>
      <App />
    </Provider>,
  );
  expect(container).toMatchSnapshot();
});
