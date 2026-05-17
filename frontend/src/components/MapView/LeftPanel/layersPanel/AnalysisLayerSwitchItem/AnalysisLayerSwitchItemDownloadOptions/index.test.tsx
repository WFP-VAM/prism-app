import { render } from '@testing-library/react';
import { store } from 'context/store';
import { Provider } from 'react-redux';

import AnalysisLayerSwitchItemDownloadOptions from '.';

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
