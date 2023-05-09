import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import React from 'react';
import AnalysisLayerSwitchItemDownloadOptions from '.';
import { store } from '../../../../../../context/store';

test('renders as expected', () => {
  const { container } = render(
    <Provider store={store}>
      <AnalysisLayerSwitchItemDownloadOptions
        analysisResultSortByKey="some sort by key"
        analysisResultSortOrder="asc"
        selected
      />
    </Provider>,
  );
  expect(container).toMatchSnapshot();
});
