import React from 'react';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react';
import { store } from 'context/store';
import DateSelector from '.';

jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    replace: jest.fn(),
    location: {
      search: '',
    },
  }),
}));
jest.mock('components/Notifier', () => 'mock-Notifier');
jest.mock('./TimelineItems', () => 'mock-TimelineItems');

test('renders as expected', () => {
  const realDateNow = Date.now.bind(global.Date);
  const dateNowStub = jest.fn(() => 1530518207007);
  // eslint-disable-next-line fp/no-mutation
  global.Date.now = dateNowStub;

  const { container } = render(
    <Provider store={store}>
      <DateSelector availableDates={[]} selectedLayers={[]} />
    </Provider>,
  );
  expect(container).toMatchSnapshot();

  // eslint-disable-next-line fp/no-mutation
  global.Date.now = realDateNow;
});
