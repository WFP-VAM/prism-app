import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import NavBar from '.';
import { store } from '../../context/store';

jest.mock('./PrintImage', () => 'mock-PrintImage');

test('renders as expected', () => {
  const { container } = render(
    <Provider store={store}>
      <NavBar />
    </Provider>,
  );
  expect(container).toMatchSnapshot();
});
