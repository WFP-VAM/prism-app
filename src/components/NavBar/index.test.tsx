import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from '../../context/store';
import NavBar from '.';

jest.mock('./MenuItem', () => 'mock-MenuItem');

test('renders as expected', () => {
  const { container } = render(
    <Provider store={store}>
      <NavBar />{' '}
    </Provider>,
  );
  expect(container).toMatchSnapshot();
});
