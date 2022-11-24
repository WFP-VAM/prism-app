import React from 'react';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react';

import Analyser from '.';
import { store } from '../../../context/store';

jest.mock('../Layers/LayerDropdown', () => 'mock-Layer-Dropdown');
jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    replace: jest.fn(),
    location: {
      search: '',
    },
  }),
}));

test('renders as expected', () => {
  const rendered = render(
    <Provider store={store}>
      <Analyser />
    </Provider>,
  );
  return rendered
    .findByText('Run Analysis')
    .then(btn => btn.click()) // open analyser menu (default closed)
    .then(() => expect(rendered.container).toMatchSnapshot());
});
