import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from 'context/store';
import { BrowserRouter } from 'react-router-dom';
import NavBar from '.';

jest.mock('./PrintImage', () => 'mock-PrintImage');

test('renders as expected', () => {
  const { container } = render(
    <BrowserRouter>
      <Provider store={store}>
        <NavBar />
      </Provider>
    </BrowserRouter>,
  );
  expect(container).toMatchSnapshot();
});
