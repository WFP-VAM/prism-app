import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import React from 'react';
import { store } from 'context/store';
import AnalysisLayerMenuItem from '.';

test('renders as expected', () => {
  const { container } = render(
    <Provider store={store}>
      <AnalysisLayerMenuItem
        analysisResultSortByKey="some sort by key"
        analysisResultSortOrder="asc"
        initialOpacity={0.5}
        title="Some Analysis Layer Title"
      />
    </Provider>,
  );
  expect(container).toMatchSnapshot();
});
