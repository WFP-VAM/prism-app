import { render } from '@testing-library/react';
import configureStore from 'redux-mock-store';
import { Panel } from 'config/types';
import { Provider } from 'react-redux';
import AALegend from '.';

test('renders as expected', () => {
  const mockStore = configureStore([]);

  const store = mockStore({
    leftPanelState: {
      tabValue: Panel.AnticipatoryActionDrought,
    },
  });

  const { container } = render(
    <Provider store={store}>
      <AALegend />
    </Provider>,
  );
  expect(container).toMatchSnapshot();
});
