import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from 'context/store';
import AnalysisLayerSwitchItem from '.';

test('renders as expected', () => {
  const { container } = render(
    <Provider store={store}>
      <AnalysisLayerSwitchItem
        initialOpacity={0.5}
        analysisResultSortByKey="some sort by key"
        analysisResultSortOrder="asc"
        title="Some Analysis Layer Title"
      />
    </Provider>,
  );
  expect(container).toMatchSnapshot();
});
