import React from 'react';
import { render } from '@testing-library/react';

import { Provider } from 'react-redux';
import { store } from 'context/store';
import { BrowserRouter } from 'react-router-dom';
import Download from '.';

test('renders as expected', () => {
  const realDateNow = Date.now.bind(global.Date);
  const dateNowStub = jest.fn(() => 1530518207007);
  // eslint-disable-next-line fp/no-mutation
  global.Date.now = dateNowStub;

  const { container } = render(
    <BrowserRouter>
      <Provider store={store}>
        <Download />
      </Provider>
    </BrowserRouter>,
  );
  expect(container).toMatchSnapshot();

  // eslint-disable-next-line fp/no-mutation
  global.Date.now = realDateNow;
});
