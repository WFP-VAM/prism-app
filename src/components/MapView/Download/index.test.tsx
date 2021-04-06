import React from 'react';
import { render } from '@testing-library/react';

import { Provider } from 'react-redux';
import Download from '.';
import { store } from '../../../context/store';

jest.mock('@material-ui/icons/CloudDownload', () => 'mock-cloud-download');
jest.mock('@material-ui/icons/ArrowDropDown', () => 'mock-arrow-drop-down');
jest.mock('@material-ui/icons/Image', () => 'mock-image');

test('renders as expected', () => {
  const { container } = render(
    <Provider store={store}>
      <Download />
    </Provider>,
  );
  expect(container).toMatchSnapshot();
});
