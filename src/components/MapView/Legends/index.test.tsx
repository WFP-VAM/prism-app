import React from 'react';
import { render } from '@testing-library/react';

import { Provider } from 'react-redux';
import Legends from '.';
import { RootState, store } from '../../../context/store';

jest.mock('./ColorIndicator', () => 'mock-ColorIndicator');
jest.mock('../../../context/analysisResultStateSlice', () => ({
  // if we try load the analysis redux slice we face an import cycle
  /* eslint-disable no-unused-vars */
  isAnalysisLayerActiveSelector: (_: RootState) => null,
  analysisResultSelector: (_: RootState) => null,
  /* eslint-enable no-unused-vars */
}));

test('renders as expected', () => {
  const { container } = render(
    <Provider store={store}>
      <Legends layers={[]} />
    </Provider>,
  );
  expect(container).toMatchSnapshot();
});
